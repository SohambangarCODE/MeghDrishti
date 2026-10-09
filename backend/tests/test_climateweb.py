from copy import deepcopy
from pathlib import Path
import csv
import hashlib
import json
import pytest
from fastapi.testclient import TestClient
from app.climateweb_importer import read_source, adapt, stage_and_promote
from app.main import app

RAW=Path(__file__).parents[2]/'data/raw/climateweb'

def source(): return read_source(json_path=RAW/'climateweb-supply-chain-enriched.json')

def test_raw_integrity_and_csv_configuration_independent_of_row_order(tmp_path):
    manifest=json.loads((RAW/'manifest.json').read_text())
    for record in manifest['files']:
        assert hashlib.sha256((RAW/record['file']).read_bytes()).hexdigest()==record['sha256']
    csv_source=read_source(companies_path=RAW/'climateweb-companies-enriched.csv',relations_path=RAW/'climateweb-relations-enriched.csv')
    assert adapt(csv_source,True)['dataset']==adapt(source(),True)['dataset']
    with (RAW/'climateweb-companies-enriched.csv').open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f);rows=list(reader);fields=reader.fieldnames
    reordered=tmp_path/'reordered.csv'
    with reordered.open('w',encoding='utf-8',newline='') as f:
        writer=csv.DictWriter(f,fields);writer.writeheader();writer.writerows(reversed(rows))
    result=read_source(companies_path=reordered,relations_path=RAW/'climateweb-relations-enriched.csv')
    assert result['demo_operational_layer']==source()['demo_operational_layer']

def test_atomic_failure_and_no_duplicate_representations(tmp_path):
    s=source();pointer=stage_and_promote(s,tmp_path,True);old=(tmp_path/'active.json').read_bytes()
    assert pointer['counts']==dict(companies=215,commercialEdges=350,facilities=327,routes=4,routeUsage=215)
    s['companies'][0]['simulation_assets'][0]['latitude']=200
    with pytest.raises(ValueError):stage_and_promote(s,tmp_path,True)
    assert (tmp_path/'active.json').read_bytes()==old
    with pytest.raises(ValueError):adapt(source())
    with pytest.raises(ValueError):read_source(json_path='x',companies_path='y',relations_path='z')

@pytest.mark.parametrize('index',[0,1,2])
def test_imported_reference_through_actual_api(index):
    with TestClient(app) as client:
        fixture=client.get('/api/v1/demo?datasetId=climateweb').json()
        expected=source()['demo_operational_layer']['reference_calculations']['scenarios'][index]
        scenario={**fixture['scenario'],'id':expected['scenario_id'],'eventIds':[expected['scenario_id']]}
        headers={'X-Demo-Session':'climateweb-test-owner','Idempotency-Key':f'climateweb-{index}'}
        result=client.post('/api/v1/analysis',headers=headers,json={'requestId':f'climateweb-{index}','holdings':fixture['holdings'],'scenario':scenario})
        assert result.status_code==200,result.text
        run=result.json()
        for actual,want in zip(run['holdingsResults'],expected['holdings']):
            assert actual['companyId']==want['company_id']
            assert actual['totalStress']==pytest.approx(want['stress'],abs=1e-12)
            path=next(p for p in run['paths'] if p['id']==actual['selectedPathIds'][0])
            assert path['companyIds']==want['selected_path']['company_path']
            assert path['edgeIds']==want['selected_path']['edge_ids']
        assert run['totals']['assumedWeightedExposure']==pytest.approx(expected['assumed_stress_weighted_exposure'],abs=1e-6)
        assert run['totals']['totalCapital']==expected['total_capital']
        assert run['totals']['connectedCapital']==expected['connected_capital']
        assert all(len(p['companyIds'])==len(set(p['companyIds'])) and p['commercialDepth']<=3 for p in run['paths'])
        assert all(f['sourceFields']['operational_share'] is None for f in run['sourceSnapshot']['facilities'])
        if index==0:
            response=client.post('/api/v1/compare',headers=headers,json={'runId':run['id'],'fromCompanyId':'abbv','toCompanyId':'cvs','amount':1000000,'requestId':'comparison'})
            assert response.status_code==200,response.text
            proposed=response.json()['proposed']
            want=source()['demo_operational_layer']['reference_calculations']['comparison']['proposed_result']
            assert proposed['totals']['assumedWeightedExposure']==pytest.approx(want['assumed_stress_weighted_exposure'])
            assert proposed['sourceSnapshot']==run['sourceSnapshot']
            assert client.get('/api/v1/companies?datasetId=climateweb&q=Agilent').json()['companies'][0]['id']=='a'
