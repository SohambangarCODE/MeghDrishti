import asyncio
import httpx
import pytest
from app.providers import OpenMeteoAdapter,heat_intensity,validate_projection

def test_heat_transform_unknown_zero_and_bounds():
    assert heat_intensity([35]*7)==0
    assert heat_intensity([43]*7)==pytest.approx(.8)
    assert heat_intensity([50]*7)==1
    assert heat_intensity([None]*7) is None
    assert heat_intensity([40]*6) is None
    with pytest.raises(ValueError): heat_intensity([40]*7,span=0)

def test_weather_captured_contract_cache_and_failure():
    requests=[];fail=[False]
    def handler(request):
        requests.append(request)
        if fail[0]:return httpx.Response(403)
        return httpx.Response(200,json={'latitude':20.1,'longitude':78.1,'daily_units':{'temperature_2m_max':'°C','precipitation_sum':'mm','wind_gusts_10m_max':'km/h'},'daily':{'time':[f'2026-10-{d}' for d in range(10,17)],'temperature_2m_max':[43]*7,'precipitation_sum':[0]*7,'wind_gusts_10m_max':[10]*7}})
    adapter=OpenMeteoAdapter(enabled=True,transport=httpx.MockTransport(handler))
    first=asyncio.run(adapter.screen(20,78,'sourced'))
    assert first['heatIntensity']==pytest.approx(.8)
    assert asyncio.run(adapter.screen(20,78,'sourced'))['cached'] and len(requests)==1
    fail[0]=True;adapter.ttl=-1
    stale=asyncio.run(adapter.screen(20,78,'sourced'))
    assert stale['stale'] and stale['fetchedAt']==first['fetchedAt']
    assert asyncio.run(adapter.screen(21,78,'sourced'))['status']=='unavailable'
    assert asyncio.run(adapter.screen(20,78,'synthetic'))['status']=='unavailable'
    assert asyncio.run(OpenMeteoAdapter().screen(20,78,'sourced'))['status']=='not configured'

def test_projection_preserves_period_and_metadata():
    p={'regionId':'supplied-region','geoLevel':'national','collection':'cmip6-x0.25','variable':'hd35','unit':'days/year','scenario':'ssp245','period':'2040-2059','product':'annual climatology','ensemble':'multi-model','percentile':'p50','value':None,'baseline':'1995-2014','sourceURL':'https://climateknowledgeportal.worldbank.org/download-data','downloadedAt':'2026-10-09'}
    assert validate_projection(p)==p
    with pytest.raises(ValueError):validate_projection({**p,'period':'2050'})
