import asyncio,json
import httpx
from app.engine import simulate
from app.repositories import DemoRepository
from app.explanations import explain

def test_grounded_explanation_rejects_unknown_paths_numbers_and_provider_failures(monkeypatch):
    f=DemoRepository().defaults();run=simulate(f['dataset'],f['holdings'],f['scenario'])
    monkeypatch.setenv('GEMINI_ENABLED','true');monkeypatch.setenv('GEMINI_API_KEY','test-key');monkeypatch.setenv('GEMINI_MODEL','test-model')
    p=next(p for p in run['paths'] if p['commercialDepth']==1)
    highlight={'pathId':p['id'],'companyIds':p['companyIds'],'stress':p['stress']};selected=[highlight]
    def handler(request):
        content=json.loads(request.content);prompt=content['contents'][0]['parts'][0]['text']
        assert '4000000' not in prompt and 'originalInputName' not in prompt and 'ownerId' not in prompt
        return httpx.Response(200,json={'candidates':[{'content':{'parts':[{'text':json.dumps({'highlights':selected})}]}}]})
    transport=httpx.MockTransport(handler)
    assert asyncio.run(explain(run,transport))['highlights']==selected
    for replacement in [{**highlight,'stress':.99},{**highlight,'pathId':'invented'},{**highlight,'companyIds':['invented']}]:
        selected[:]=[replacement]
        assert asyncio.run(explain(run,transport))['provider']=='deterministic'
    assert asyncio.run(explain(run,httpx.MockTransport(lambda _:httpx.Response(503))))['provider']=='deterministic'
    monkeypatch.setenv('GEMINI_ENABLED','false')
    assert asyncio.run(explain(run))['providerStatus']=='not configured'
