import asyncio
import hashlib
import json
import httpx
import pytest
from fastapi.testclient import TestClient
from app.main import app,repository
from app.providers import OpenMeteoAdapter
from app.projections import import_projection_file,ProjectionRepository

def test_synthetic_coordinates_and_regions_never_call_provider(monkeypatch):
    async def forbidden(*args):raise AssertionError('Synthetic locations reached provider')
    monkeypatch.setattr('app.climate_api.weather.screen',forbidden)
    with TestClient(app) as client:
        for identifier in ['reference','climateweb']:
            dataset=repository.dataset(identifier)
            result=client.post('/api/v1/weather/screen',json={'datasetId':identifier}).json()
            assert result['status']=='unavailable' and result['readings']==[]
            assert result['excludedFacilities']==len(dataset['facilities'])
            response=client.get('/api/v1/projections',params={'datasetId':identifier,'regionId':dataset['regions'][0]['id']})
            assert response.status_code==200 and response.json()['records']==[]
        assert client.post('/api/v1/weather/screen',json={'datasetId':'reference','facilityIds':['missing']}).status_code==422

def test_concurrent_weather_dedup_retries_and_stale_expiry():
    calls=[];failed=[False]
    async def handler(request):
        calls.append(request)
        await asyncio.sleep(.001)
        if failed[0]:return httpx.Response(503,headers={'Retry-After':'0'})
        return httpx.Response(200,json={'latitude':20,'longitude':78,'daily_units':{'temperature_2m_max':'\u00b0C','precipitation_sum':'mm','wind_gusts_10m_max':'km/h'},'daily':{'time':['2026-10-09','2026-10-10','2026-10-11'],'temperature_2m_max':[40]*3,'precipitation_sum':[0]*3,'wind_gusts_10m_max':[10]*3}})
    async def run():
        adapter=OpenMeteoAdapter(enabled=True,transport=httpx.MockTransport(handler),forecast_days=3)
        results=await asyncio.gather(*(adapter.screen(20,78,'sourced') for _ in range(10)))
        assert len(calls)==1 and all(r['heatIntensity']==.5 for r in results)
        assert calls[0].url.params['forecast_days']=='3'
        failed[0]=True;adapter.ttl=-1
        assert (await adapter.screen(20,78,'sourced'))['status']=='stale'
        assert len(calls)==4 # three bounded retries
        adapter.cache[(20,78)]['time']-=adapter.max_stale+1
        assert (await adapter.screen(20,78,'sourced'))['status']=='unavailable'
    asyncio.run(run())

def test_explicit_projection_mapping_raw_integrity_and_atomic_failure(tmp_path):
    source=tmp_path/'download.csv';source.write_text('geography,hot_days\nTEST,12.5\n',encoding='utf-8')
    mapping={'metadata':{'geoLevel':'national','collection':'cmip6-x0.25','variable':'hd35','unit':'days/year','scenario':'ssp245','period':'2040-2059','product':'annual climatology','ensemble':'multi-model','percentile':'p50','baseline':'1995-2014','sourceURL':'https://climateknowledgeportal.worldbank.org/download-data','downloadedAt':'2026-10-09'},'columns':{'regionId':'geography','value':'hot_days'},'geographyMap':{'TEST':'test-only-geography'}}
    root=tmp_path/'imported';raw=source.read_bytes()
    result=import_projection_file(source,mapping,root)
    assert result['sha256']==hashlib.sha256(raw).hexdigest()
    assert source.read_bytes()==raw==(root/'raw'/(result['sha256']+'.csv')).read_bytes()
    assert ProjectionRepository(root).query('test-only-geography','hd35','2040-2059','ssp245')[0]['value']==12.5
    assert ProjectionRepository(root).query('missing','hd35','2040-2059','ssp245')==[]
    import_projection_file(source,mapping,root)
    assert len(list(root.glob('*.json')))==1
    source.write_text('wrong_column,hot_days\nTEST,5\n',encoding='utf-8')
    with pytest.raises(ValueError,match='Mapped column'):import_projection_file(source,mapping,root)
    assert len(list(root.glob('*.json')))==1
    source.write_text('geography,hot_days\nTEST,13\n',encoding='utf-8')
    with pytest.raises(ValueError,match='already imported'):import_projection_file(source,mapping,root)

def test_point_weather_is_bounded_and_separate_from_simulation(monkeypatch):
    calls=[]
    async def fake(latitude,longitude,provenance):
        calls.append((latitude,longitude,provenance))
        return {'status':'unavailable','data':None,'reason':'test provider offline'}
    monkeypatch.setattr('app.climate_api.point_weather.screen',fake)
    with TestClient(app) as c:
        assert c.post('/api/v1/weather/point',json={'latitude':91,'longitude':0}).status_code==422
        r=c.post('/api/v1/weather/point',json={'latitude':20,'longitude':78})
        assert r.status_code==200
        assert r.json()['usedInSimulation'] is False
        assert r.json()['companyLocationVerified'] is False
        assert r.json()['status']=='unavailable'
        assert calls==[(20,78,'selected_coordinate')]
