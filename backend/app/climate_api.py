"""Forecast and long-term context boundaries; synthetic coordinates never become live sites."""
import asyncio
import os
from fastapi import APIRouter
from pydantic import Field
from .models import Contract
from .providers import OpenMeteoAdapter
from .projections import ProjectionRepository

router=APIRouter(prefix='/api/v1')
weather=OpenMeteoAdapter(enabled=os.getenv('OPEN_METEO_ENABLED','false').lower()=='true',
    forecast_days=int(os.getenv('WEATHER_FORECAST_DAYS','7')),ttl=int(os.getenv('WEATHER_CACHE_SECONDS','3600')),
    max_stale=int(os.getenv('WEATHER_MAX_STALE_SECONDS','21600')))
projections=ProjectionRepository()

def dataset(identifier):
    from .main import repository
    return repository.dataset(identifier)

class Screening(Contract):
    datasetId:str
    facilityIds:list[str]=Field(default_factory=list,max_length=50)

@router.post('/weather/screen')
async def screen(request:Screening):
    d=dataset(request.datasetId)
    selected=[f for f in d['facilities'] if not request.facilityIds or f['id'] in request.facilityIds]
    if request.facilityIds and len(selected)!=len(set(request.facilityIds)):raise ValueError('Unknown facility selection')
    supported=[f for f in selected if f['provenance']=='sourced' and f['latitude'] is not None and f['longitude'] is not None]
    if not supported:return {'schemaVersion':'1.0.0','status':'unavailable','readings':[],
        'excludedFacilities':len(selected),'reason':'Verified operating coordinates are required. Supplied demo locations are synthetic; no provider call was made.'}
    if len(supported)>50:raise ValueError('Select at most 50 supported facilities per request')
    readings=await asyncio.gather(*(weather.screen(f['latitude'],f['longitude'],f['provenance']) for f in supported))
    return {'schemaVersion':'1.0.0','status':'available' if any(r['status']=='available' for r in readings) else 'unavailable',
        'readings':[{'facilityId':f['id'],'companyId':f['companyId'],**r} for f,r in zip(supported,readings)],
        'excludedFacilities':len(selected)-len(supported),'limitation':'Temperature heat screening is not measured damage, wet-bulb stress or financial loss.'}

@router.get('/projections')
def future_context(datasetId:str,regionId:str,variable:str='hd35',period:str='2040-2059',scenario:str='ssp245'):
    d=dataset(datasetId);region=next((r for r in d['regions'] if r['id']==regionId),None)
    if not region:raise ValueError('Unknown region')
    if not region['providerGeographyId'] or region['provenance']!='sourced':
        return {'schemaVersion':'1.0.0','status':'unavailable','records':[],
                'reason':'No verified provider-geography mapping. Synthetic region envelopes cannot be assigned sourced projections.'}
    records=projections.query(region['providerGeographyId'],variable,period,scenario)
    return {'schemaVersion':'1.0.0','status':'available' if records else 'unavailable','records':records,
            'reason':None if records else 'Projection file for this geography/product has not been imported',
            'limitation':'Annual climate-model context; not an exact-date event or financial confidence interval.'}

async def refresh_loop(interval):
    """Opt-in runtime task. One worker/process only; other deployments use one external job."""
    from .main import repository
    while True:
        for row in repository.catalog():
            d=repository.dataset(row['id'])
            ids=[f['id'] for f in d['facilities'] if f['provenance']=='sourced']
            for start in range(0,len(ids),50):
                try:await screen(Screening(datasetId=row['id'],facilityIds=ids[start:start+50]))
                except (ValueError,RuntimeError):pass
        await asyncio.sleep(max(3600,interval))

# Coordinate-only forecast is independent of company operations and the simulation.
point_weather=OpenMeteoAdapter(enabled=True,forecast_days=7)
class PointForecast(Contract):
    latitude:float=Field(ge=-90,le=90,allow_inf_nan=False)
    longitude:float=Field(ge=-180,le=180,allow_inf_nan=False)

@router.post('/weather/point')
async def point_forecast(request:PointForecast):
    result=await point_weather.screen(request.latitude,request.longitude,'selected_coordinate')
    return {'schemaVersion':'1.0.0',**result,'scope':'selected_coordinate',
        'companyLocationVerified':False,'usedInSimulation':False,
        'limitation':'Forecast for user-selected coordinates only. No verified company location or portfolio impact is implied.'}
