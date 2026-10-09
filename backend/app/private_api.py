"""JWT-only private APIs. Public key + caller JWT preserve Postgres RLS."""
import os
from datetime import datetime,timezone
from uuid import UUID,uuid4
import httpx
from fastapi import APIRouter,Depends,Header,HTTPException
from pydantic import Field
from .auth import verify_token
from .models import Contract,Holding,Scenario,CompareRequest
from .engine import simulate,normalize_holdings,input_hash,compare_run

router=APIRouter(prefix='/api/v1/private')

class PrivateStore:
    def __init__(self,token):
        url=os.getenv('SUPABASE_URL','');key=os.getenv('SUPABASE_PUBLISHABLE_KEY') or os.getenv('SUPABASE_ANON_KEY','')
        if not url or not key: raise HTTPException(503,'Supabase persistence not configured')
        self.url=url.rstrip('/')+'/rest/v1';self.headers={'apikey':key,'Authorization':'Bearer '+token}
    async def request(self,path,method='GET',body=None,params=None):
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response=await client.request(method,self.url+path,headers={**self.headers,'Prefer':'return=representation'},json=body,params=params)
            if response.status_code>=400:
                try:code=response.json().get('code','')
                except (ValueError,AttributeError):code=''
                if code=='23505':raise HTTPException(409,'Duplicate request or inaccessible portfolio ID')
                if response.status_code in (401,403):raise HTTPException(401,'Session expired or operation not permitted')
                raise HTTPException(502,'Supabase operation failed; check migrations and RLS configuration')
            return response.json() if response.content else None
        except httpx.HTTPError as exc:raise HTTPException(503,'Supabase unavailable; private data was not saved') from exc

def authenticated(authorization:str | None=Header(default=None)):
    if not authorization or not authorization.startswith('Bearer '):raise HTTPException(401,'Sign in for private records')
    token=authorization[7:];owner=verify_token(token)
    return owner,PrivateStore(token)

class PortfolioWrite(Contract):
    id:UUID
    name:str=Field(min_length=1,max_length=200)
    holdings:list[Holding]=Field(min_length=1,max_length=1000)
    scenario:Scenario

class PrivateAnalysis(Contract):
    portfolioId:UUID
    requestId:str=Field(min_length=1,max_length=128)

def repository():
    from .main import repository
    return repository

@router.get('/session')
async def session(identity=Depends(authenticated)):
    owner,store=identity
    await store.request('/portfolios',params={'select':'id','limit':1})
    return {'schemaVersion':'1.0.0','ownerId':owner,'databaseReachable':True}

@router.get('/portfolios')
async def portfolios(identity=Depends(authenticated)):
    _,store=identity
    return {'schemaVersion':'1.0.0','portfolios':await store.request('/portfolios',params={'select':'*','order':'updated_at.desc','limit':100})}

@router.post('/portfolios')
async def save_portfolio(request:PortfolioWrite,identity=Depends(authenticated)):
    _,store=identity
    dataset=repository().dataset(request.scenario.datasetVersion)
    holdings=normalize_holdings([h.model_dump() for h in request.holdings],dataset['companies'])
    scenario=request.scenario.model_dump()
    simulate(dataset,holdings,scenario) # Validate references/overlays before any cloud write.
    holdings=[{**h,'portfolioId':str(request.id)} for h in holdings]
    result=await store.request('/rpc/save_portfolio','POST',{'p_id':str(request.id),'p_name':request.name,
        'p_dataset_version':scenario['datasetVersion'],'p_holdings':holdings,'p_scenario':scenario})
    return {'schemaVersion':'1.0.0','portfolio':result}

@router.post('/analysis')
async def analysis(request:PrivateAnalysis,identity=Depends(authenticated)):
    owner,store=identity
    rows=await store.request('/portfolios',params={'id':'eq.'+str(request.portfolioId),'select':'*'})
    if not rows:raise HTTPException(404,'Portfolio not found')
    draft=rows[0]['draft'];dataset=repository().dataset(rows[0]['dataset_version'])
    result=simulate(dataset,draft['holdings'],draft['scenario']);now=datetime.now(timezone.utc).isoformat();run_id=str(uuid4())
    run={**result,'id':run_id,'runId':run_id,'requestId':request.requestId,'draftRevision':0,'ownerId':owner,
         'portfolioId':str(request.portfolioId),'inputHash':input_hash(dataset,draft['holdings'],draft['scenario']),
         'startedAt':now,'completedAt':now,'storage':'private Supabase snapshot'}
    saved=await store.request('/rpc/save_analysis','POST',{'p_portfolio_id':str(request.portfolioId),'p_snapshot':run})
    return {'schemaVersion':'1.0.0','run':saved}

@router.delete('/portfolios/{portfolio_id}')
async def delete_portfolio(portfolio_id:UUID,identity=Depends(authenticated)):
    _,store=identity
    deleted=await store.request('/rpc/delete_portfolio','POST',{'p_id':str(portfolio_id)})
    if not deleted:raise HTTPException(404,'Portfolio not found')
    return {'schemaVersion':'1.0.0','deleted':str(portfolio_id)}

@router.post('/compare')
async def compare(request:CompareRequest,identity=Depends(authenticated)):
    saved=await get_run(UUID(request.runId),identity)
    return {**compare_run(saved['run'],request.fromCompanyId,request.toCompanyId,request.amount),
            'schemaVersion':'1.0.0','requestId':request.requestId}

@router.get('/runs')
async def runs(identity=Depends(authenticated)):
    _,store=identity
    return {'schemaVersion':'1.0.0','runs':await store.request('/analysis_runs',params={'select':'id,portfolio_id,created_at,input_hash','order':'created_at.desc','limit':100})}

@router.get('/runs/{run_id}')
async def get_run(run_id:UUID,identity=Depends(authenticated)):
    _,store=identity
    rows=await store.request('/analysis_runs',params={'id':'eq.'+str(run_id),'select':'snapshot'})
    if not rows:raise HTTPException(404,'Run not found')
    return {'schemaVersion':'1.0.0','run':rows[0]['snapshot']}

@router.delete('/runs/{run_id}')
async def delete_run(run_id:UUID,identity=Depends(authenticated)):
    _,store=identity
    rows=await store.request('/analysis_runs','DELETE',params={'id':'eq.'+str(run_id),'select':'id'})
    if not rows:raise HTTPException(404,'Run not found')
    return {'schemaVersion':'1.0.0','deleted':str(run_id)}
