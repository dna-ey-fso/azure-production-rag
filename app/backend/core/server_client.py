import aiohttp
from typing import Any, Dict

class ServerClient:
    def __init__(self, server_url: str = "http://127.0.0.1:8000"):
        self.server_url = server_url

    async def execute_query(self, server_request: Dict[str, Any]) -> Dict[str, Any]:
        async with aiohttp.ClientSession() as session:
            cascade_result = await self._execute(session, server_request, "execute_cascade")
            #gpt4o_result = await self._execute(session, server_request, "execute_gpt4o")
            cascade_total_cost = cascade_result["total_cost"] 
            #gpt4o_total_cost = gpt4o_result["total_cost"]
            #comparison = await self._execute(session, server_request, "compare_costs")

            # Print the costs to the terminal
            print(f"Cascade total cost: {cascade_total_cost}")
            #print(f"GPT-4o total cost: {gpt4o_total_cost}")
            return {
                "cascade": cascade_result,
                #"gpt4o": gpt4o_result,
                "total_cost_cascade": cascade_total_cost,
                #"total_cost_gpt4o": gpt4o_total_cost
            }

    async def _execute(self, session: aiohttp.ClientSession, server_request: Dict[str, Any], endpoint: str) -> Dict[str, Any]:
        async with session.post(
            f"{self.server_url}/{endpoint}",
            json=server_request
            
        ) as response:
            #print(server_request)
            if response.status == 200:
                result = await response.json()
                if result["status"] == "success":
                    return {
                        "answer": result["result"]["answer"],
                        "cost": result["result"]["cost"],
                        "total_cost": result["result"].get("total_cost", result["result"]["cost"]),
                        "model_used": result["result"]["model_used"]
                    }
                raise Exception(f"Server error: {result.get('message', 'Unknown error')}")
            raise Exception(f"HTTP error: {response.status}")