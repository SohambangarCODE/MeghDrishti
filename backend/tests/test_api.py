from fastapi.testclient import TestClient
from app.main import app
from app.repositories import DemoRepository
import app.main as main
import pytest

@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main,'repository',DemoRepository())
    return TestClient(app)

def payload(client):
    f=client.get('/api/v1/demo').json()
    return {'holdings':f['holdings'],'scenario':f['scenario'],'requestId':'test-request','draftRevision':1}

def headers(owner='owner-a-123456789'): return {'X-Demo-Session':owner,'Idempotency-Key':'key-1'}

def test_api_snapshot_idempotency_and_isolation(client):
    request=payload(client)
    response=client.post('/api/v1/analysis',json=request,headers=headers())
    assert response.status_code==200,response.text
    run=response.json()
    assert run['totals']['assumedWeightedExposure']==pytest.approx(1334340)
    assert client.post('/api/v1/analysis',json=request,headers=headers()).json()['id']==run['id']
    request['holdings'][0]['amount']=1
    assert client.post('/api/v1/analysis',json=request,headers=headers()).status_code==409
    assert client.get('/api/v1/runs/'+run['id'],headers=headers('owner-b-123456789')).status_code==404
    assert client.get('/api/v1/runs/'+run['id']).status_code==401
    comparison={'runId':run['id'],'fromCompanyId':'demo:aster','toCompanyId':'demo:evergreen','amount':1000000,'requestId':'compare'}
    assert client.post('/api/v1/compare',json=comparison,headers=headers()).json()['proposed']['totals']['assumedWeightedExposure']==pytest.approx(1082340)
    assert client.post('/api/v1/compare',json=comparison,headers=headers('owner-b-123456789')).status_code==404

def test_validation_graph_and_unconfigured(client):
    p=payload(client); p['holdings'][0]['amount']=-1
    response=client.post('/api/v1/analysis',json=p,headers=headers())
    assert response.status_code==422 and response.json()['error']['fieldErrors']
    assert client.get('/api/v1/graph',headers=headers()).json()['nodes']
    assert client.get('/api/v1/graph?limit=101',headers=headers()).status_code==422
    assert client.get('/api/v1/datasets').json()['services']['Open-Meteo']=='not configured'
    assert client.get('/api/v1/runs',headers={'Authorization':'Bearer fake'}).status_code in (401,503)
