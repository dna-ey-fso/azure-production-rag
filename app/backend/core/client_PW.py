import aiohttp
from typing import Any, Dict

class ClientPW:
    def __init__(self, server_url: str = "http://127.0.0.1:7000"):
        self.server_url = server_url

    async def update_task_description(self, question: str, context: str) -> Dict[str, Any]:
        """
        Envoie une requête POST pour mettre à jour la task_description avec la question et le contexte.
        """
        url = f"{self.server_url}/update-config"
        payload = {
            "config_dict": {
                "task_description": f"You have to optimize the prompt.\nQuestion: {question}\nContent: {context}"
            }
        }
        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(url, json=payload) as response:
                    response.raise_for_status()
                    result = await response.json()
                    print("Task description updated:", result)
                    return result
            except aiohttp.ClientError as e:
                print("Failed to update task description:", e)
                return {}

    async def get_best_prompt(self) -> Dict[str, Any]:
        """
        Envoie une requête GET pour récupérer le prompt optimisé.
        """
        url = f"{self.server_url}/get-best-prompt"
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(url) as response:
                    response.raise_for_status()
                    result = await response.json()
                    print("Raw Response:", result)  # Log de la réponse brute
                    return result
            except aiohttp.ClientError as e:
                print("Failed to get best prompt:", e)
                return {}

# Exemple d'utilisation
if __name__ == "__main__":
    import asyncio

    async def main():
        client = ClientPW()
        question = "Optimize the prompt for summarization tasks."  # Remplacez par votre propre question
        context = "This is the context retrieved from vector search."  # Remplacez par votre propre contexte

        print("Sending task description...")
        await client.update_task_description(question, context)

        print("Requesting best prompt...")
        await client.get_best_prompt()

    asyncio.run(main())
