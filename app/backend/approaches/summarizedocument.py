import tempfile
from argparse import Namespace
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any, List

import aiofiles
from azure.identity.aio import DefaultAzureCredential
from openai import AsyncAzureOpenAI

from approaches.retrievethenread import RetrieveThenReadApproach
from upload.prepdocs import main as init_prepdocs
from upload.prepdocs import setup_file_strategy
from upload.uploadargs import get_upload_args


class SummarizeDocumentApproach:
    def __init__(
        self,
        ask_approach: RetrieveThenReadApproach,
        openai_client: AsyncAzureOpenAI,
        azure_credential: DefaultAzureCredential,
        openai_model_deployement: str,
    ) -> None:
        self.ask_approach = ask_approach
        self.openai_client = openai_client
        self.azure_credential = azure_credential
        self.openai_model_deployement = openai_model_deployement

    async def _insert_file_index(self, file: Any, temp_dir: TemporaryDirectory) -> None:
        filename = file.filename
        temp_dir_path = Path(temp_dir.name)
        temp_file_path = temp_dir_path / filename

        file_contents = file.read()

        async with aiofiles.open(temp_file_path, "wb") as temp_file:
            await temp_file.write(file_contents)

        # can be done in 1 line, but left it like this for clarity
        args = Namespace()
        args.files = f"{str(temp_dir_path)}/*"
        args = get_upload_args(args)

        ingestion_strategy = await setup_file_strategy(self.azure_credential, args)
        await init_prepdocs(ingestion_strategy, self.azure_credential, args)

    async def _ask_each_bulletpoint(
        self, bullet_points: List[str], filename: str
    ) -> List[dict]:
        summarized_bullet_points = []
        for point in bullet_points:
            messages = [
                {
                    "content": f"Give me a summary of the following point in the document: {point}",
                    "role": "user",
                }
            ]

            overrides = {"overrides": {"document_filter": filename}}
            r = await self.ask_approach.run(
                messages,
                context=overrides,
                session_state={},
            )
            summarized_bullet_points.append(
                {point: r["choices"][0]["message"]["content"]}
            )
        return summarized_bullet_points

    async def _summarize_final(self, summarized_bullet_points: List[dict]) -> str:
        final_prompt = "Your task is to give a summarization of each bullet point and its associated summary. These are the bullet points and their summaries:\n\n"
        for summarized_bullet_point in summarized_bullet_points:
            for bullet_point, summary in summarized_bullet_point.items():
                final_prompt += f"{bullet_point}: {summary}\n"

        chat_completion = await self.openai_client.chat.completions.create(
            model=self.openai_model_deployement,
            messages=[{"role": "user", "content": final_prompt}],
            temperature=0.1,
        )

        return chat_completion.choices[0].message.content

    async def _delete_file_index(self, temp_dir: TemporaryDirectory) -> None:
        # can be done in 1 line, but left it like this for clarity
        args = Namespace()
        temp_dir_path = Path(temp_dir.name)
        args.files = f"{str(temp_dir_path)}/*"
        args = get_upload_args(args)
        args.remove = True

        ingestion_strategy = await setup_file_strategy(self.azure_credential, args)
        await init_prepdocs(ingestion_strategy, self.azure_credential, args)

    async def run(self, file: Any, bullet_points: List[dict]) -> dict:
        temp_dir = tempfile.TemporaryDirectory()
        await self._insert_file_index(file, temp_dir)
        summarized_bullet_points = await self._ask_each_bulletpoint(
            bullet_points, file.filename
        )
        final_summary = await self._summarize_final(summarized_bullet_points)
        await self._delete_file_index(temp_dir)
        temp_dir.cleanup()
        response = {
            "answer": final_summary,
            "bullet_points_summarized": summarized_bullet_points,
        }
        return response
