import os
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

app=FastAPI(title='MeghDrishti synthetic analysis API',version='1.0.0')
app.add_middleware(CORSMiddleware,allow_origins=os.getenv('ALLOWED_ORIGINS','http://localhost:5173,http://127.0.0.1:5173').split(','),
                   allow_credentials=False,allow_methods=['GET','POST'],allow_headers=['Content-Type','Authorization','X-Demo-Session','Idempotency-Key'])
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

@app.get('/api/v1/datasets')
def datasets():
    return {'schemaVersion':'1.0.0','mode':'demo','datasets':[{'id':repository.dataset()['datasetVersion'],'provenance':'synthetic'}],
            'services':{'Sectivia':'not supplied','Open-Meteo':'not configured','World Bank CCKP':'not supplied',
                        'Supabase':'configured, unverified' if os.getenv('SUPABASE_URL') else 'not configured','Gemini':'not configured'}}

@app.get('/api/v1/demo')
def defaults(): return repository.defaults()

@app.get('/api/v1/graph')
def graph(portfolioId: str | None=None,offset:int=0,limit:int=100,owner=Depends(identity)):
    if offset<0 or not 1<=limit<=100: raise ValueError('Use offset >= 0 and limit 1–100')
    if portfolioId and portfolioId!='demo:portfolio': raise HTTPException(404,'Portfolio not found')
    result=graph_payload(repository.dataset(),repository.defaults()['holdings'])
    all_nodes=result['nodes']; result['nodes']=all_nodes[offset:offset+limit]
    ids={n['id'] for n in result['nodes']}
    result['edges']=[e for e in result['edges'] if e['sourceId'] in ids and e['targetId'] in ids]
    result.update(totalNodes=len(all_nodes),offset=offset,limit=limit)
    return result

class PortfolioRequest(BaseModel):
    holdings:list[Holding]=Field(max_length=1000)

@app.post('/api/v1/portfolio/validate')
def validate(request:PortfolioRequest):
    holdings=normalize_holdings([h.model_dump() for h in request.holdings],repository.dataset()['companies'])
    return {'schemaVersion':'1.0.0','holdings':holdings,'duplicateRowsMerged':len(request.holdings)-len(holdings),
            'excludedCapital':sum(h['amount'] for h in holdings if h['matchingStatus']!='matched')}

class MatchRequest(BaseModel):
    names:list[str]=Field(max_length=1000)

@app.post('/api/v1/portfolio/match')
def match(request:MatchRequest):
    companies=repository.dataset()['companies']
    return {'schemaVersion':'1.0.0','matches':[{'input':name,'candidates':[c for c in companies if name.strip().casefold() in [c['id'].casefold(),c['name'].casefold(),(c['ticker'] or '').casefold()]]} for name in request.names]}

@app.get('/api/v1/events')
def events(portfolioId:str | None=None):
    if portfolioId and portfolioId!='demo:portfolio': raise HTTPException(404,'Portfolio not found')
    return {'schemaVersion':'1.0.0','mode':'demo','events':repository.dataset()['events'],'weatherStatus':'not configured'}

@app.post('/api/v1/analysis',response_model=RunResponse)
def analysis(request:AnalysisRequest,owner=Depends(identity),idempotency_key:str | None=Header(default=None)):
    if not idempotency_key or len(idempotency_key)>128: raise HTTPException(400,'Idempotency-Key of 1–128 characters required')
    d=repository.dataset(); holdings=[h.model_dump() for h in request.holdings]; scenario=request.scenario.model_dump()
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
def explanation(run_id:str,owner=Depends(identity)):
    run=get_run(run_id,owner)
    return {'schemaVersion':'1.0.0','provider':'deterministic','summary':f"Demo simulation: INR {run['totals']['connectedCapital']:,.2f} has a supported assumed path. The stress-weighted exposure is not a loss forecast.",
            'affectedPaths':[p for r in run['holdingsResults'] for p in r['selectedPathIds']],
            'limitations':['Synthetic assumptions; unrecorded paths do not establish safety','Unknown direct exposure remains unknown'],
            'analystChecks':['Verify operational locations and dependency shares before sourced analysis']}
