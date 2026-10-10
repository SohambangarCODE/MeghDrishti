import asyncio
from app.main import app
from app.climate_api import screen, Screening

async def test():
    req = Screening(datasetId='reference', facilityIds=[])
    res = await screen(req)
    print(res)

asyncio.run(test())
