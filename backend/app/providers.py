"""Configuration-gated provider utilities. Never substitute synthetic readings."""
import asyncio
import math
from copy import deepcopy
from datetime import datetime,timezone
from time import monotonic
import httpx
from .engine import DEFAULTS

def heat_intensity(temperatures,threshold=None,span=None,expected_days=7):
    threshold=DEFAULTS['heatScreen']['thresholdCelsius'] if threshold is None else threshold
    span=DEFAULTS['heatScreen']['spanCelsius'] if span is None else span
    if not math.isfinite(threshold) or not math.isfinite(span) or span<=0: raise ValueError('Invalid heat thresholds')
    if len(temperatures)!=expected_days or any(v is None or not isinstance(v,(int,float)) or not math.isfinite(v) for v in temperatures): return None
    return max(0,min(1,(max(temperatures)-threshold)/span))

class OpenMeteoAdapter:
    """Exact coordinate cache; free public endpoint for permitted evaluation use.

    Enable only for verified operations and review provider commercial terms.
    No nearest-city or HQ substitution and no spatial deduplication assumption.
    """
    def __init__(self,enabled=False,transport=None,ttl=3600,forecast_days=7,max_stale=21600):
        if not 1<=forecast_days<=16: raise ValueError('Forecast window must be 1-16 days')
        self.enabled=enabled;self.transport=transport;self.ttl=ttl;self.cache={};self.forecast_days=forecast_days;self.max_stale=max_stale;self.locks={};self.semaphore=asyncio.Semaphore(4)

    async def screen(self,latitude,longitude,provenance):
        if provenance not in ('sourced','dataset_reported','selected_coordinate'):
            return {'status':'unavailable','data':None,'reason':'Verified operational coordinates required'}
        key=(latitude,longitude)
        lock=self.locks.setdefault(key,asyncio.Lock())
        async with lock:
            async with self.semaphore:
                return await self._screen(latitude,longitude,provenance)

    async def _screen(self,latitude,longitude,provenance):
        if not self.enabled: return {'status':'not configured','data':None}
        if provenance not in ('sourced','dataset_reported','selected_coordinate') or latitude is None or longitude is None:
            return {'status':'unavailable','data':None,'reason':'Verified operational coordinates required'}
        if not (-90<=latitude<=90 and -180<=longitude<=180): raise ValueError('Invalid coordinates')
        key=(latitude,longitude)
        cached=self.cache.get(key)
        if cached and monotonic()-cached['time']<self.ttl: return {**deepcopy(cached['value']),'cached':True}
        try:
            async with httpx.AsyncClient(timeout=8,transport=self.transport) as client:
                for attempt in range(3):
                    response=await client.get('https://api.open-meteo.com/v1/forecast',params={
                        'latitude':latitude,'longitude':longitude,'forecast_days':self.forecast_days,'timezone':'UTC',
                        'temperature_unit':'celsius','wind_speed_unit':'kmh','precipitation_unit':'mm',
                        'daily':'temperature_2m_max,precipitation_sum,wind_gusts_10m_max'})
                    if response.status_code not in (429,500,502,503,504) or attempt==2: break
                    delay=response.headers.get('Retry-After','')
                    # Do not retry before an excessive provider Retry-After; return stale/unavailable.
                    if delay and (not delay.isdigit() or int(delay)>5): response.raise_for_status()
                    await asyncio.sleep(int(delay) if delay.isdigit() else .2*2**attempt)
                response.raise_for_status();raw=response.json()
            daily=raw['daily'];units=raw['daily_units']
            expected={'temperature_2m_max':'°C','precipitation_sum':'mm','wind_gusts_10m_max':'km/h'}
            if any(units.get(k)!=v for k,v in expected.items()): raise ValueError('Unexpected provider units')
            if len(daily['time'])!=self.forecast_days: raise ValueError('Incomplete valid dates')
            intensity=heat_intensity(daily['temperature_2m_max'],expected_days=self.forecast_days)
            if intensity is None: raise ValueError('Incomplete forecast temperature coverage')
            value={'status':'available','provenance':'sourced','provider':'Open-Meteo','cached':False,'stale':False,
                   'coordinates':[latitude,longitude],'gridCoordinates':[raw['latitude'],raw['longitude']],
                   'model':'Open-Meteo automatic model selection','validTimes':daily['time'],'fetchedAt':datetime.now(timezone.utc).isoformat(),
                   'data':daily,'units':units,'heatIntensity':intensity,
                   'assumptions':DEFAULTS['heatScreen'],'contextOnly':['precipitation_sum','wind_gusts_10m_max']}
            if len(self.cache)>=1000: self.cache.pop(next(iter(self.cache)))
            self.cache[key]={'time':monotonic(),'value':value}
            return deepcopy(value)
        except (httpx.HTTPError,KeyError,ValueError,TypeError) as exc:
            if cached and monotonic()-cached['time']<=self.max_stale:return {**deepcopy(cached['value']),'cached':True,'stale':True,'status':'stale','refreshError':str(exc)}
            return {'status':'unavailable','data':None,'reason':str(exc)}

def validate_projection(record):
    required=['regionId','geoLevel','collection','variable','unit','scenario','period','product','ensemble','percentile','value','baseline','sourceURL','downloadedAt']
    if any(k not in record for k in required): raise ValueError('Projection metadata incomplete')
    if record['collection']!='cmip6-x0.25' or record['variable'] not in ('hd35','tasmax'): raise ValueError('Unsupported collection or indicator')
    if record['period'] not in ('1995-2014','2040-2059'): raise ValueError('Unsupported period; no extrapolation')
    allowed=('historical',) if record['period']=='1995-2014' else ('ssp245','ssp585')
    if record['scenario'] not in allowed: raise ValueError('Scenario/period mismatch')
    if record['product']!='annual climatology' or record['ensemble']!='multi-model' or record['percentile'] not in ('p10','p50','p90'): raise ValueError('Unsupported projection product')
    if record['unit']!=('days/year' if record['variable']=='hd35' else '°C'): raise ValueError('Unexpected projection unit')
    if record['value'] is not None and (not isinstance(record['value'],(int,float)) or not math.isfinite(record['value'])): raise ValueError('Invalid projection value')
    if not record['sourceURL'].startswith('https://'): raise ValueError('Source HTTPS URL required')
    return deepcopy(record)
