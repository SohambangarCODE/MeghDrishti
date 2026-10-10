import asyncio
from copy import deepcopy
import json
from uuid import uuid4
import httpx
import pytest
from fastapi.testclient import TestClient
from app.assessments import assess, facts_for
from app.engine import simulate
from app.main import app, repository
from app.private_api import authenticated


@pytest.fixture
def run(monkeypatch):
    monkeypatch.setenv('GEMINI_API_KEY', 'mock-server-key')
    monkeypatch.setenv('GEMINI_MODEL', 'gemini-2.5-flash')
    monkeypatch.delenv('GEMINI_ASSESSMENT_MODEL', raising=False)
    f = repository.defaults()
    return {**simulate(f['dataset'],f['holdings'],f['scenario']), 'id':str(uuid4()), 'ownerId':'owner-a'}


def response(run, replacement=None):
    selection = {s:list(f)[:1] for s,f in facts_for(run)[0].items()}
    if replacement:
        replacement(selection)
    return httpx.Response(200,json={'candidates':[{'finishReason':'STOP','content':{'parts':[{'text':json.dumps(selection)}]}}]})


def test_grounded_assessment_and_private_snapshot_unchanged(run):
    before = deepcopy(run)
    def handler(request):
        assert request.headers['x-goog-api-key']=='mock-server-key'
        prompt=json.loads(request.content)['contents'][0]['parts'][0]['text']
        assert 'ownerId' not in prompt and 'mock-server-key' not in prompt
        assert 'downloadedAt' not in prompt and '29.68' not in prompt and '30.77' not in prompt
        assert '1334340' not in prompt or 'exposure' in prompt
        return response(run)
    result=asyncio.run(assess(run,httpx.MockTransport(handler)))
    assert result['status']=='available' and result['runId']==run['id']
    assert len(result['sections'])==6 and result['inputHash']
    assert result['sections'][0]['statements'][0]['text']==facts_for(run)[0]['executiveSummary']['exposure']
    assert 'mock-server-key' not in json.dumps(result)
    assert run==before and run['totals']['assumedWeightedExposure']==1334340


@pytest.mark.parametrize('mutation',[
    lambda s:s.__setitem__('executiveSummary',['invented exposure 99%']),
    lambda s:s.__setitem__('evidenceGaps',['exposure']),
    lambda s:s.__setitem__('climateContext',[]),
    lambda s:s.__setitem__('principalRiskDrivers',['holding-0','holding-0']),
    lambda s:s.__setitem__('invented',[]),
])
def test_model_cannot_invent_numbers_or_facts(run,mutation):
    result=asyncio.run(assess(run,httpx.MockTransport(lambda _:response(run,mutation))))
    assert result['status']=='unavailable' and result['error']['code']=='INVALID_RESPONSE'
    assert result['sections']==[]


@pytest.mark.parametrize('status,code',[(429,'QUOTA'),(403,'PROVIDER_AUTH'),(404,'MODEL_UNAVAILABLE'),(503,'PROVIDER_UNAVAILABLE')])
def test_provider_failures_are_safe(run,status,code):
    result=asyncio.run(assess(run,httpx.MockTransport(lambda _:httpx.Response(status,json={'secret':'mock-server-key'}))))
    assert result['error']['code']==code and 'mock-server-key' not in json.dumps(result)


def test_missing_key_timeout_and_incomplete_response(run,monkeypatch):
    def timeout(request):raise httpx.ReadTimeout('secret error payload',request=request)
    assert asyncio.run(assess(run,httpx.MockTransport(timeout)))['error']['code']=='TIMEOUT'
    assert asyncio.run(assess(run,httpx.MockTransport(lambda _:httpx.Response(200,json={'candidates':[]}))))['error']['code']=='INVALID_RESPONSE'
    monkeypatch.delenv('GEMINI_API_KEY')
    assert asyncio.run(assess(run))['error']['code']=='NOT_CONFIGURED'


def test_private_authorization_owner_isolation_and_read_only(run,monkeypatch):
    calls=[]; provider_calls=[]
    class Store:
        async def request(self,path,method='GET',body=None,params=None):
            calls.append((path,method))
            return [{'snapshot':deepcopy(run)}] if params['id']=='eq.'+run['id'] else []
    async def fake_assess(saved):
        provider_calls.append(saved['id'])
        return {'status':'available','runId':saved['id']}
    monkeypatch.setattr('app.assessments.assess',fake_assess)
    try:
        with TestClient(app) as client:
            url='/api/v1/private/runs/'+run['id']+'/assessment'
            assert client.post(url).status_code==401
            assert provider_calls==[]
            app.dependency_overrides[authenticated]=lambda:('owner-a',Store())
            assert client.post(url).json()['runId']==run['id']
            app.dependency_overrides[authenticated]=lambda:('owner-b',Store())
            assert client.post(url).status_code==404
            assert client.post('/api/v1/private/runs/'+str(uuid4())+'/assessment').status_code==404
            assert provider_calls==[run['id']]
            assert all(method=='GET' for _,method in calls)
    finally:
        app.dependency_overrides.clear()


def test_demo_capability_cannot_access_another_run(run,monkeypatch):
    run['ownerId']='demo:aaaaaaaaaaaaaaaa';repository.save(run)
    async def fake(saved):return {'runId':saved['id'],'status':'available'}
    monkeypatch.setattr('app.assessments.assess',fake)
    with TestClient(app) as client:
        url='/api/v1/runs/'+run['id']+'/assessment'
        assert client.post(url).status_code==401
        assert client.post(url,headers={'X-Demo-Session':'bbbbbbbbbbbbbbbb'}).status_code==404
        assert client.post(url,headers={'X-Demo-Session':'aaaaaaaaaaaaaaaa'}).json()['runId']==run['id']
