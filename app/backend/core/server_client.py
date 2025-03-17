import aiohttp
from typing import Any, Dict

class ServerClient:
    def __init__(self, server_url: str = "http://127.0.0.1:8000"):
        self.server_url = server_url

    async def execute_query(self, prompt: str) -> Dict[str, Any]:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{self.server_url}/execute_cascade",
                json={"prompt": prompt}
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    if result["status"] == "success":
                        return {
                            "answer": result["result"]["answer"],
                            "cost": result["result"]["cost"],
                            "model_used": result["result"]["model_used"]
                        }
                    raise Exception(f"Server error: {result.get('message', 'Unknown error')}")
                raise Exception(f"HTTP error: {response.status}")
