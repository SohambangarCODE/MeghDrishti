import asyncio
from app.providers import OpenMeteoAdapter

async def main():
    adapter = OpenMeteoAdapter(enabled=True)
    res1 = await adapter.screen(28.6139, 77.2090, 'sourced')
    print('Valid:', res1)
    res2 = await adapter.screen(28.6139, 77.2090, 'synthetic')
    print('Synthetic:', res2)

asyncio.run(main())
