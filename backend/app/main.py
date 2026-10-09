import os
import asyncio
from contextlib import asynccontextmanager,suppress
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import FastAPI, Depends, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from .models import AnalysisRequest, CompareRequest, Holding, RunResponse, ComparisonResponse
from .engine import simulate, compare_run, normalize_holdings, input_hash, DEFAULTS
from .repositories import DemoRepository
from .auth import identity
from .graph import graph_payload

@asynccontextmanager
async def lifespan(app):
    from .climate_api import refresh_loop
    interval=int(os.getenv('WEATHER_REFRESH_SECONDS','0'))
    task=asyncio.create_task(refresh_loop(interval)) if interval>0 else None
    yield
    if task:
        task.cancel()
        with suppress(asyncio.CancelledError): await task

app=FastAPI(lifespan=lifespan,title='MeghDrishti synthetic analysis API',version='1.0.0')
from .private_api import router as private_router
app.include_router(private_router)
from .climate_api import router as climate_router
app.include_router(climate_router)
app.add_middleware(CORSMiddleware,allow_origins=os.getenv('ALLOWED_ORIGINS','http://localhost:5173,http://127.0.0.1:5173').split(','),
                   allow_credentials=False,allow_methods=['GET','POST','DELETE'],allow_headers=['Content-Type','Authorization','X-Demo-Session','Idempotency-Key'])
from .operations import RequestBoundary
app.add_middleware(RequestBoundary)
repository=DemoRepository()

@app.exception_handler(HTTPException)
async def http_error(request,exc):
    return JSONResponse(status_code=exc.status_code,content={'error':{'code':f'HTTP_{exc.status_code}','message':str(exc.detail),'fieldErrors':[],'retryable':exc.status_code in [429,502,503,504]}})

@app.exception_handler(ValueError)
async def value_error(request,exc):
    return JSONResponse(status_code=422,content={'error':{'code':'VALIDATION','message':str(exc),'fieldErrors':[],'retryable':False}})

@app.exception_handler(RequestValidationError)
async def request_error(request,exc):
    return JSONResponse(status_code=422,content={'error':{'code':'VALIDATION','message':'Invalid request','fieldErrors':[{'field':'.'.join(map(str,e['loc'])),'message':e['msg']} for e in exc.errors()],'retryable':False}})

@app.get('/health')
def health(): return {'status':'ok','mode':'demo','schemaVersion':'1.0.0','modelVersion':DEFAULTS['modelVersion']}

@app.get('/ready')
def readiness():
    catalog=repository.catalog()
    return {'status':'ready' if catalog else 'unavailable','datasets':len(catalog),
            'cloudConfigured':bool(os.getenv('SUPABASE_URL') and (os.getenv('SUPABASE_PUBLISHABLE_KEY') or os.getenv('SUPABASE_ANON_KEY'))),
            'cloudVerification':'Requires authenticated /api/v1/private/session and two-user persistence verification'}

@app.get('/api/v1/datasets')
def datasets():
    return {'schemaVersion':'1.0.0','mode':'demo','datasets':repository.catalog(),
            'services':{'Sectivia':'reported relationships and synthetic operations installed' if 'climateweb' in repository.fixtures else 'not supplied',
                        'Open-Meteo':'enabled; verified sites required' if os.getenv('OPEN_METEO_ENABLED','false').lower()=='true' else 'not configured',
                        'World Bank CCKP':'file query available; requires imported product and verified geography',
                        'Supabase':'configured, unverified' if os.getenv('SUPABASE_URL') and (os.getenv('SUPABASE_PUBLISHABLE_KEY') or os.getenv('SUPABASE_ANON_KEY')) else 'incomplete configuration',
                        'Gemini':'enabled, unverified' if os.getenv('GEMINI_ENABLED','false').lower()=='true' and os.getenv('GEMINI_API_KEY') and os.getenv('GEMINI_MODEL') else 'not configured; deterministic fallback'}}

@app.get('/api/v1/demo')
def defaults(datasetId: str | None=None): return repository.defaults(datasetId)

@app.get('/api/v1/companies')
def search_companies(datasetId:str | None=None,q:str='',limit:int=50):
    if not 1<=limit<=100: raise ValueError('Company search limit must be 1-100')
    rows=repository.dataset(datasetId)['companies']
    matched=[c for c in rows if q.casefold() in ' '.join(str(c.get(k) or '') for k in ['id','name','ticker','sectorId']).casefold()]
    return {'schemaVersion':'1.0.0','companies':matched[:limit],'total':len(matched)}

@app.get('/api/v1/graph')
def graph(portfolioId: str | None=None,offset:int=0,limit:int=100,datasetId:str | None=None,owner=Depends(identity)):
    if offset<0 or not 1<=limit<=100: raise ValueError('Use offset >= 0 and limit 1–100')
    fixture=repository.defaults(datasetId)
    if portfolioId and portfolioId!=fixture['holdings'][0]['portfolioId']: raise HTTPException(404,'Portfolio not found')
    result=graph_payload(fixture['dataset'],fixture['holdings'])
    all_nodes=result['nodes']; result['nodes']=all_nodes[offset:offset+limit]
    ids={n['id'] for n in result['nodes']}
    result['edges']=[e for e in result['edges'] if e['sourceId'] in ids and e['targetId'] in ids]
    result.update(totalNodes=len(all_nodes),offset=offset,limit=limit)
    return result

class PortfolioRequest(BaseModel):
    holdings:list[Holding]=Field(max_length=1000)
    datasetVersion:str | None=None

@app.post('/api/v1/portfolio/validate')
def validate(request:PortfolioRequest):
    holdings=normalize_holdings([h.model_dump() for h in request.holdings],repository.dataset(request.datasetVersion)['companies'])
    return {'schemaVersion':'1.0.0','holdings':holdings,'duplicateRowsMerged':len(request.holdings)-len(holdings),
            'excludedCapital':sum(h['amount'] for h in holdings if h['matchingStatus']!='matched')}

class MatchRequest(BaseModel):
    names:list[str]=Field(max_length=1000)
    datasetVersion:str | None=None

@app.post('/api/v1/portfolio/match')
def match(request:MatchRequest):
    companies=repository.dataset(request.datasetVersion)['companies']
    return {'schemaVersion':'1.0.0','matches':[{'input':name,'candidates':[c for c in companies if name.strip().casefold() in [c['id'].casefold(),c['name'].casefold(),(c['ticker'] or '').casefold()]]} for name in request.names]}

@app.get('/api/v1/events')
def events(portfolioId:str | None=None,datasetId:str | None=None):
    fixture=repository.defaults(datasetId)
    if portfolioId and portfolioId!=fixture['holdings'][0]['portfolioId']: raise HTTPException(404,'Portfolio not found')
    return {'schemaVersion':'1.0.0','mode':'demo','events':fixture['dataset']['events'],'weatherStatus':'not configured'}

@app.post('/api/v1/analysis',response_model=RunResponse)
def analysis(request:AnalysisRequest,owner=Depends(identity),idempotency_key:str | None=Header(default=None)):
    if not idempotency_key or len(idempotency_key)>128: raise HTTPException(400,'Idempotency-Key of 1–128 characters required')
    d=repository.dataset(request.scenario.datasetVersion); holdings=[h.model_dump() for h in request.holdings]; scenario=request.scenario.model_dump()
    digest=input_hash(d,holdings,scenario)
    key=(owner,idempotency_key)
    with repository.lock:
        old=repository.idempotency.get(key)
        if old:
            if old['hash']!=digest: raise HTTPException(409,'Idempotency key already used with different inputs')
            cached=repository.get(old['id'],owner)
            if cached: return cached
            raise HTTPException(410,'Local demo snapshot expired; use a new idempotency key')
        result=simulate(d,holdings,scenario)
        now=datetime.now(timezone.utc).isoformat()
        run={**result,'id':str(uuid4()),'requestId':request.requestId,'draftRevision':request.draftRevision,'ownerId':owner,
             'portfolioId':holdings[0]['portfolioId'],'inputHash':digest,'startedAt':now,'completedAt':now,
             'storage':'temporary backend demo memory'}
        run['runId']=run['id']
        repository.save(run)
        repository.idempotency[key]={'hash':digest,'id':run['id']}
        while len(repository.idempotency)>repository.max_runs*2: repository.idempotency.popitem(last=False)
        return run

@app.get('/api/v1/runs')
def runs(owner=Depends(identity)): return {'schemaVersion':'1.0.0','runs':repository.list(owner)}

@app.get('/api/v1/runs/{run_id}',response_model=RunResponse)
def get_run(run_id:str,owner=Depends(identity)):
    run=repository.get(run_id,owner)
    if not run: raise HTTPException(404,'Run not found')
    return run

@app.post('/api/v1/compare',response_model=ComparisonResponse)
def compare(request:CompareRequest,owner=Depends(identity)):
    run=get_run(request.runId,owner)
    return {**compare_run(run,request.fromCompanyId,request.toCompanyId,request.amount),'requestId':request.requestId,'schemaVersion':'1.0.0'}

@app.post('/api/v1/runs/{run_id}/explanation')
async def explanation(run_id:str,owner=Depends(identity)):
    from .explanations import explain
    return await explain(get_run(run_id,owner))
