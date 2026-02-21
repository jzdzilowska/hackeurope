
import os
import asyncio
from dotenv import load_dotenv
from mcp import ClientSession
from mcp.client.sse import sse_client

load_dotenv()

ZAPIER_API_KEY = os.environ["ZAPIER_API_KEY"]
ZAPIER_MCP_URL = f"https://actions.zapier.com/mcp/{ZAPIER_API_KEY}/sse"


async def main():
    async with sse_client(url=ZAPIER_MCP_URL) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            resp = await session.list_tools()
            print(f"Found {len(resp.tools)} tool(s):\n")
            for t in resp.tools:
                print(f"Name       : {t.name}")
                print(f"Description: {t.description}")
                print(f"Schema     : {t.inputSchema}\n")


if __name__ == "__main__":
    asyncio.run(main())
