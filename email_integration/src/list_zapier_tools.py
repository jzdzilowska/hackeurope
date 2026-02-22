
import os
import asyncio
from dotenv import load_dotenv
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

load_dotenv()

ZAPIER_API_KEY = os.environ["ZAPIER_API_KEY"]
ZAPIER_MCP_URL = os.getenv("ZAPIER_MCP_URL", "https://mcp.zapier.com/api/v1/connect")


async def main():
    async with streamablehttp_client(
        ZAPIER_MCP_URL, headers={"Authorization": f"Bearer {ZAPIER_API_KEY}"}
    ) as (read, write, _):
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
