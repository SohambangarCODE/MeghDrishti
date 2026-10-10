from copy import deepcopy
from pathlib import Path
import json
import subprocess
import pytest
from fastapi.testclient import TestClient
from app.coverage import completeness, coverage_hash
from app.main import app, repository

CASES = json.loads((Path(__file__).parent / 'fixtures/coverage-cases.json').read_text())

def values(result): return {m['id']: m['numerator'] for m in result['metrics']}

def test_imported_counts_and_evidence_are_separate():
    source = repository.dataset('climateweb'); before = deepcopy(source)
    result = completeness(source)
    assert result['counts'] == dict(companies=215, commercialEdges=350, facilities=327, routes=4, routeUsage=215, regions=4)
    assert values(result) == dict(reportedCompanies=215, reportedRelationships=350, linkedCompanies=192, sourcedCoordinates=0,
        syntheticOnlySites=215, missingOperatingEvidence=215, measuredOperationalShares=0, assumedOperationalShares=327,
        measuredWeights=0, assumedWeights=350, missingDemoWeights=0, unknownRealDependence=350, syntheticGeometry=215,
        sourcedGeometry=0, projectionCompanies=0, projectionRegions=0)
    assert len(result['companies']) == 215
    assert sum(c['supplierCount'] + c['customerCount'] == 0 for c in result['companies']) == 23
    assert result['compatibility']['companyWeather']['status'] == 'unavailable'
    assert source == before

@pytest.mark.parametrize('name', ['mixed', 'empty'])
def test_shared_cases_and_no_mutation(name):
    dataset = deepcopy(CASES[name]); before = deepcopy(dataset); result = completeness(dataset)
    expected = CASES['expectedMixed'] if name == 'mixed' else {k: 0 for k in CASES['expectedMixed']}
    assert values(result) == expected
    assert dataset == before
    assert result == completeness(dataset)
    if name == 'mixed':
        assert [c['id'] for c in result['companies']] == ['001','002','003']
        assert result['companies'][0]['customerCount'] == 2
    else: assert all(m['denominator'] == 0 for m in result['metrics'])

def test_unsupported_labels_and_null_measurements_never_upgrade_coverage():
    source = deepcopy(CASES['mixed']); source['facilities'][0]['sourceFields']['operational_share'] = None
    assert values(completeness(source))['measuredOperationalShares'] == 0
    source['facilities'][0]['sourceFields']['parameter_status'] = 'synthetic_demo'
    source['regions'][0]['evidenceIds'] = ['generic']
    result = completeness(source)
    assert values(result)['sourcedCoordinates'] == 0
    assert values(result)['projectionRegions'] == 0
    broken = deepcopy(source); del broken['facilities']
    with pytest.raises(ValueError): completeness(broken)
    broken = deepcopy(source); broken['companies'].append(broken['companies'][0])
    with pytest.raises(ValueError): completeness(broken)

def test_content_hash_stable_keys_numbers_and_sensitive_to_snapshot():
    a = deepcopy(CASES['mixed']); b = dict(reversed(list(a.items())))
    b['facilities'][0]['latitude'] = 0.0
    assert coverage_hash(a) == coverage_hash(b)
    b = deepcopy(a); b['facilities'][0]['name'] = 'Different snapshot'
    assert coverage_hash(a) != coverage_hash(b)

def test_public_endpoint_only_accepts_installed_ids(monkeypatch):
    def forbidden(*args, **kwargs): raise AssertionError('Coverage attempted persistence')
    monkeypatch.setattr(repository, 'save', forbidden)
    before = deepcopy(repository.fixtures)
    with TestClient(app) as client:
        for dataset_id in ['reference','climateweb',repository.dataset('climateweb')['datasetVersion']]:
            r = client.get('/api/v1/datasets/coverage', params={'datasetId':dataset_id})
            assert r.status_code == 200
            assert r.json() == completeness(repository.dataset(dataset_id))
        for query in ['', '?datasetId=unknown', '?datasetId=', '?datasetId=reference&snapshot=private', '?datasetId=reference&datasetId=climateweb']:
            assert client.get('/api/v1/datasets/coverage'+query).status_code == 422
        assert client.post('/api/v1/datasets/coverage', json={'sourceSnapshot':CASES['mixed']}).status_code == 405
        assert client.request('GET','/api/v1/datasets/coverage?datasetId=reference',json={'sourceSnapshot':CASES['mixed']}).status_code == 422
    assert repository.fixtures == before

def test_browser_python_full_response_parity():
    root = Path(__file__).parents[2]
    datasets = [CASES['mixed'], CASES['empty'], repository.dataset('climateweb'), repository.dataset('reference')]
    # Run the production JS pure adapter, not a second test implementation.
    script = "import {summarizeCoverage} from './frontend/src/services/coverage.js'; let text=''; for await(const c of process.stdin)text+=c; console.log(JSON.stringify(await Promise.all(JSON.parse(text).map(summarizeCoverage))));"
    result = subprocess.run(['node','--input-type=module','-e',script], input=json.dumps(datasets), text=True, encoding='utf-8', cwd=root, capture_output=True)
    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout) == [completeness(d) for d in datasets]
