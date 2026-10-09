from uuid import uuid4
from fastapi.testclient import TestClient
from app.main import app,repository
from app.private_api import authenticated

class Store:
    def __init__(self):self.calls=[];self.portfolio=None;self.run=None
    async def request(self,path,method='GET',body=None,params=None):
        self.calls.append((path,method,body,params))
        if path=='/rpc/save_portfolio':
            self.portfolio={'id':body['p_id'],'dataset_version':body['p_dataset_version'],'draft':{'holdings':body['p_holdings'],'scenario':body['p_scenario']}}
            return self.portfolio
        if path=='/portfolios':return [self.portfolio] if self.portfolio else []
        if path=='/rpc/save_analysis':self.run=body['p_snapshot'];return self.run
        if path=='/analysis_runs':return [{'snapshot':self.run}] if self.run and params.get('id')=='eq.'+self.run['id'] else []
        return []

def test_private_requires_jwt_not_demo_capability():
    with TestClient(app) as c:
        assert c.get('/api/v1/private/portfolios',headers={'X-Demo-Session':'long-demo-session-key'}).status_code==401

def test_private_owner_derived_and_snapshot_computed():
    store=Store();app.dependency_overrides[authenticated]=lambda:('user-a',store)
    try:
        with TestClient(app) as c:
            f=repository.defaults();pid=str(uuid4())
            payload={'id':pid,'name':'Test','holdings':f['holdings'],'scenario':f['scenario']}
            assert c.post('/api/v1/private/portfolios',json={**payload,'ownerId':'user-b'}).status_code==422
            assert c.post('/api/v1/private/portfolios',json=payload).status_code==200
            body=store.calls[-1][2];assert 'owner_id' not in body and 'ownerId' not in body
            assert all(h['portfolioId']==pid for h in body['p_holdings'])
            result=c.post('/api/v1/private/analysis',json={'portfolioId':pid,'requestId':'retry-key'})
            assert result.status_code==200,result.text
            run=result.json()['run'];assert run['ownerId']=='user-a'
            assert run['totals']['assumedWeightedExposure']==1334340
            assert run['storage']=='private Supabase snapshot'
            comparison=c.post('/api/v1/private/compare',json={'runId':run['id'],'fromCompanyId':'demo:aster','toCompanyId':'demo:evergreen','amount':1000000,'requestId':'compare'})
            assert comparison.status_code==200,comparison.text
            assert comparison.json()['proposed']['totals']['assumedWeightedExposure']==1082340
            assert comparison.json()['proposed']['sourceSnapshot']==run['sourceSnapshot']
            assert c.delete('/api/v1/private/portfolios/'+str(uuid4())).status_code==404
            assert c.get('/api/v1/private/runs/'+str(uuid4())).status_code==404
    finally:app.dependency_overrides.clear()
