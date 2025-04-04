from typing import Any, Coroutine, Dict, List, Literal, Optional, Union, overload

from azure.search.documents.aio import SearchClient
from azure.search.documents.models import VectorQuery
from openai import AsyncOpenAI, AsyncStream
from openai.types.chat import (
    ChatCompletion,
    ChatCompletionChunk,
    ChatCompletionToolParam,
)

from approaches.approach import ThoughtStep
from approaches.chatapproach import ChatApproach
from core.authentication import AuthenticationHelper
from core.modelhelper import get_token_limit
from core.server_client import ServerClient
from core.client_PW import ClientPW  # Import du client PW


class ChatReadRetrieveReadApproach(ChatApproach):
    """
    A multi-step approach that first uses OpenAI to turn the user's question into a search query,
    then uses Azure AI Search to retrieve relevant documents, and then sends the conversation history,
    original user question, and search results to OpenAI to generate a response.
    """

    def __init__(
        self,
        *,
        search_client: SearchClient,
        auth_helper: AuthenticationHelper,
        openai_client: AsyncOpenAI,
        chatgpt_model: str,
        chatgpt_deployment: Optional[str],  # Not needed for non-Azure OpenAI
        embedding_deployment: Optional[str],  # Not needed for non-Azure OpenAI or for retrieval_mode="text"
        embedding_model: str,
        sourcepage_field: str,
        content_field: str,
        query_language: str,
        query_speller: str,
    ):
        self.search_client = search_client
        self.openai_client = openai_client
        self.auth_helper = auth_helper
        self.chatgpt_model = chatgpt_model
        self.chatgpt_deployment = chatgpt_deployment
        self.embedding_deployment = embedding_deployment
        self.embedding_model = embedding_model
        self.sourcepage_field = sourcepage_field
        self.content_field = content_field
        self.query_language = query_language
        self.query_speller = query_speller
        self.chatgpt_token_limit = get_token_limit(chatgpt_model)
        self.server_client = ServerClient()

    @property
    def system_message_chat_conversation(self):
        return """Assistant helps the company employees with their healthcare plan questions, and questions about the employee handbook. Be brief in your answers.
        Answer ONLY with the facts listed in the list of sources below. If there isn't enough information below, say you don't know. Do not generate answers that don't use the sources below. If asking a clarifying question to the user would help, ask the question.
        For tabular information return it as an html table. Do not return markdown format. If the question is not in English, answer in the language used in the question.
        Each source has a name followed by colon and the actual information, always include the source name for each fact you use in the response. Use square brackets to reference the source, for example [info1.txt]. Don't combine sources, list each source separately, for example [info1.txt][info2.pdf].
        {follow_up_questions_prompt}
        {injected_prompt}
        """

    @overload
    async def run_until_final_call(
        self,
        history: list[dict[str, str]],
        overrides: dict[str, Any],
        auth_claims: dict[str, Any],
        should_stream: Literal[False],
    ) -> tuple[dict[str, Any], Coroutine[Any, Any, ChatCompletion]]: ...

    @overload
    async def run_until_final_call(
        self,
        history: list[dict[str, str]],
        overrides: dict[str, Any],
        auth_claims: dict[str, Any],
        should_stream: Literal[True],
    ) -> tuple[dict[str, Any], Coroutine[Any, Any, AsyncStream[ChatCompletionChunk]]]: ...

    async def run_until_final_call(
        self,
        history: list[dict[str, str]],
        overrides: dict[str, Any],
        auth_claims: dict[str, Any],
        should_stream: bool = False,
    ) -> tuple[dict[str, Any], Coroutine[Any, Any, Union[ChatCompletion, AsyncStream[ChatCompletionChunk]]]]:
        has_text = overrides.get("retrieval_mode") in ["text", "hybrid", None]
        has_vector = overrides.get("retrieval_mode") in ["vectors", "hybrid", None]
        use_semantic_captions = True if overrides.get("semantic_captions") and has_text else False
        top = overrides.get("top", 3)
        filter = self.build_filter(overrides, auth_claims)
        use_semantic_ranker = True if overrides.get("semantic_ranker") and has_text else False

        original_user_query = history[-1]["content"]

        
        user_query_request = "Generate search query for: " + original_user_query

        # STEP 2: Retrieve relevant documents from the search index with the GPT optimized query

        # If retrieval mode includes vectors, compute an embedding for the query
        vectors: list[VectorQuery] = []
        if has_vector:
            vectors.append(await self.compute_text_embedding(original_user_query))

        # Only keep the text query if the retrieval mode uses text, otherwise drop it
        if not has_text:
            original_user_query = None   

        results = await self.search(top, original_user_query, filter, vectors, use_semantic_ranker, use_semantic_captions)

        sources_content = self.get_sources_content(results, use_semantic_captions, use_image_citation=False)
        content = "\n".join(sources_content)

        # Envoi de la question et du contexte à ClientPW
        client_pw = ClientPW()
        await client_pw.update_task_description(original_user_query, content)

        # Récupération du meilleur prompt et du profil expert via ClientPW
        try:
            pw_response = await client_pw.get_best_prompt()
            best_prompt = pw_response.get("best_prompt")  # Récupération du best_prompt
            expert_profile = pw_response.get("expert_profile")  # Récupération de l'expert_profile

            if best_prompt and expert_profile:
                # Utilisation du best_prompt et de l'expert_profile dans le système
                system_message = expert_profile
                user_message = best_prompt + f"\n\nSources:\n{content}"
                
                response_token_limit = 1024
                messages_token_limit = self.chatgpt_token_limit - response_token_limit
                messages = self.get_messages_from_history(
                    system_prompt=system_message,
                    model_id=self.chatgpt_model,
                    history=history,
                    user_content=user_message,
                    max_tokens=messages_token_limit,
                )

                data_points = {"text": sources_content}

                extra_info = {
                    "data_points": data_points,
                    "thoughts": [
                        ThoughtStep(
                            "Original user query",
                            original_user_query,
                        ),
                        ThoughtStep(
                            "Best Prompt",
                            best_prompt,
                        ),
                        ThoughtStep(
                            "Expert Profile",
                            expert_profile,
                        ),
                        ThoughtStep("Results", [result.serialize_for_results() for result in results]),
                        ThoughtStep("Prompt", [str(message) for message in messages]),
                    ],
                }

                chat_coroutine = self.openai_client.chat.completions.create(
                    # Azure Open AI takes the deployment name as the model name
                    model=self.chatgpt_deployment if self.chatgpt_deployment else self.chatgpt_model,
                    messages=messages,
                    temperature=overrides.get("temperature", 0.3),
                    max_tokens=response_token_limit,
                    n=1,
                    stream=should_stream,
                )
                return (extra_info, chat_coroutine)
        except Exception as e:
            print(f"PromptWizard request failed, falling back to FrugalGPT and cascade: {str(e)}")

        # First try to get response from server
        try:
            # Prepare the data to send to the server
            server_request = {
                "prompt": original_user_query,
                "conversation_history": history,
                "system_prompt": self.get_system_prompt(
                    overrides.get("prompt_template"),
                    self.follow_up_questions_prompt_content if overrides.get("suggest_followup_questions") else "",
                ),
                "few_shots": self.query_prompt_few_shots if hasattr(self, "query_prompt_few_shots") else [],
                "content": content
            }
            
            server_response = await self.server_client.execute_query(server_request)
            if server_response and server_response.get("answer"):
                return {
                    "data_points": {"text": []},
                    "thoughts": [
                        ThoughtStep("Server Response", server_response),
                    ],
                }, self.create_server_response(server_response, should_stream)
        except Exception as e:
            print(f"Server request failed, falling back to default approach: {str(e)}")

        tools: List[ChatCompletionToolParam] = [
            {
                "type": "function",
                "function": {
                    "name": "search_sources",
                    "description": "Retrieve sources from the Azure AI Search index",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "search_query": {
                                "type": "string",
                                "description": "Query string to retrieve documents from azure search eg: 'Health care plan'",
                            }
                        },
                        "required": ["search_query"],
                    },
                },
            }
        ]

        # STEP 1: Generate an optimized keyword search query based on the chat history and the last question
        messages = self.get_messages_from_history(
            system_prompt=self.query_prompt_template,
            model_id=self.chatgpt_model,
            history=history,
            user_content=user_query_request,
            max_tokens=self.chatgpt_token_limit - len(user_query_request),
            few_shots=self.query_prompt_few_shots,
        )

        chat_completion: ChatCompletion = await self.openai_client.chat.completions.create(
            messages=messages,  # type: ignore
            # Azure Open AI takes the deployment name as the model name
            model=self.chatgpt_deployment if self.chatgpt_deployment else self.chatgpt_model,
            temperature=0.0,  # Minimize creativity for search query generation
            max_tokens=100,  # Setting too low risks malformed JSON, setting too high may affect performance
            n=1,
            tools=tools,
            tool_choice="auto",
        )

        query_text = self.get_search_query(chat_completion, original_user_query)

        # STEP 2: Retrieve relevant documents from the search index with the GPT optimized query

        # If retrieval mode includes vectors, compute an embedding for the query
        vectors: list[VectorQuery] = []
        if has_vector:
            vectors.append(await self.compute_text_embedding(query_text))

        # Only keep the text query if the retrieval mode uses text, otherwise drop it
        if not has_text:
            query_text = None

        results = await self.search(top, query_text, filter, vectors, use_semantic_ranker, use_semantic_captions)

        sources_content = self.get_sources_content(results, use_semantic_captions, use_image_citation=False)
        content = "\n".join(sources_content)

 

        # STEP 3: Generate a contextual and content specific answer using the search results and chat history

        # Allow client to replace the entire prompt, or to inject into the exiting prompt using >>>
        system_message = self.get_system_prompt(
            overrides.get("prompt_template"),
            self.follow_up_questions_prompt_content if overrides.get("suggest_followup_questions") else "",
        )

        response_token_limit = 1024
        messages_token_limit = self.chatgpt_token_limit - response_token_limit
        messages = self.get_messages_from_history(
            system_prompt=system_message,
            model_id=self.chatgpt_model,
            history=history,
            # Model does not handle lengthy system messages well. Moving sources to latest user conversation to solve follow up questions prompt.
            user_content=original_user_query + "\n\nSources:\n" + content,
            max_tokens=messages_token_limit,
        )

        data_points = {"text": sources_content}

        extra_info = {
            "data_points": data_points,
            "thoughts": [
                ThoughtStep(
                    "Original user query",
                    original_user_query,
                ),
                ThoughtStep(
                    "Generated search query",
                    query_text,
                    {"use_semantic_captions": use_semantic_captions, "has_vector": has_vector},
                ),
                ThoughtStep("Results", [result.serialize_for_results() for result in results]),
                ThoughtStep("Prompt", [str(message) for message in messages]),
            ],
        }

        chat_coroutine = self.openai_client.chat.completions.create(
            # Azure Open AI takes the deployment name as the model name
            model=self.chatgpt_deployment if self.chatgpt_deployment else self.chatgpt_model,
            messages=messages,
            temperature=overrides.get("temperature", 0.3),
            max_tokens=response_token_limit,
            n=1,
            stream=should_stream,
        )
        return (extra_info, chat_coroutine)

    def create_server_response(self, server_response: Dict[str, Any], should_stream: bool):
        print(f"\nTotal cost: ${server_response.get('total_cost', server_response['cost']):.6f}")
        response = {
            "choices": [{
                "message": {
                    "content": server_response["answer"],
                    "role": "assistant"
                },
                "metadata": {
                    "cost": server_response["cost"],
                    "total_cost": server_response.get("total_cost", server_response["cost"]),
                    "model_used": server_response["model_used"]
                }
            }]
        }
        if should_stream:
            async def stream_generator():
                for c in server_response["answer"]:
                    yield {"choices": [{"delta": {"content": c}}]}
            
            return AsyncStream({"generator": stream_generator()})
        return response
