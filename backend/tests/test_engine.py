import json
from pathlib import Path
from copy import deepcopy
import pytest
from app.engine import simulate, compare_run

@pytest.fixture
def fixture():
    return json.loads((Path(__file__).parents[2]/'frontend/src/fixtures/reference.json').read_text())

def run(f): return simulate(f['dataset'],f['holdings'],f['scenario'])
def stresses(result): return [r['totalStress'] for r in result['holdingsResults']]

def test_golden(fixture):
    result = run(fixture)
    assert result['seeds'][0]['stress'] == pytest.approx(.6)
    assert stresses(result)[:3] == pytest.approx([.252,.0882,.03087])
    assert stresses(result)[3] is None
    assert all(r['directStress'] is None for r in result['holdingsResults'])
    assert result['totals']['totalCapital'] == 10000000
    assert result['totals']['connectedCapital'] == 9000000
    assert result['totals']['assumedWeightedExposure'] == pytest.approx(1334340)

@pytest.mark.parametrize('hops,expected',[(1,[.252,None,None,None]),(2,[.252,.0882,None,None]),(3,[.252,.0882,.03087,None])])
def test_hops(fixture,hops,expected):
    fixture['scenario']['maxCommercialHops']=hops
    for actual,want in zip(stresses(run(fixture)),expected):
        if want is None: assert actual is None
        else: assert actual == pytest.approx(want)

def test_route_and_overlapping_sources(fixture):
    fixture['scenario']['eventIds']=['demo:route-event']
    route = run(fixture)
    assert route['seeds'][0]['stress'] == pytest.approx(.192)
    assert stresses(route)[:3] == pytest.approx([.08064,.028224,.0098784])
    fixture['scenario']['eventIds'].append('demo:facility-event')
    both = run(fixture)
    assert stresses(both)[:3] == pytest.approx([.252,.0882,.03087])
    assert len(both['paths']) == 8

def test_waypoint_and_region_targets(fixture):
    fixture['scenario']['eventIds']=['demo:route-event']
    fixture['dataset']['events'][1]['affectedEntityIds']=['demo:waypoint']
    assert run(fixture)['seeds'][0]['stress'] == pytest.approx(.192)
    fixture['dataset']['events'][1]['affectedEntityIds']=[]
    fixture['dataset']['events'][1]['geographicTargets']=['demo:region']
    assert len(run(fixture)['seeds'])==2

def test_cycle_parallel_and_alternative(fixture):
    base = fixture['dataset']['commercialEdges'][0]
    fixture['dataset']['commercialEdges'] += [
        {**base,'id':'demo:cycle','supplierCompanyId':'demo:beacon','customerCompanyId':'demo:delta','supplyItemIds':[]},
        {**base,'id':'demo:parallel','dependencyWeight':.3},
        {**base,'id':'demo:shortcut','customerCompanyId':'demo:cedar','dependencyWeight':.8,'supplyItemIds':[]}]
    result=run(fixture)
    assert stresses(result)[2] == pytest.approx(.336)
    assert all(len(p['companyIds'])==len(set(p['companyIds'])) for p in result['paths'])
    assert len({p['id'] for p in result['paths']})==len(result['paths'])
    assert result['totals']['connectedCapital']==9000000
    assert len([p for p in result['paths'] if p['companyIds'][-1]=='demo:aster'])==2

def test_unknown_and_explicit_overlay(fixture):
    fixture['dataset']['commercialEdges'][0]['dependencyWeight']=None
    result=run(fixture)
    assert stresses(result)==[None]*4
    assert result['holdingsResults'][0]['recordedPath']
    assert result['totals']['unmodeledCapital']==10000000
    fixture['scenario']['assumptionOverrides']=[{'targetId':'demo:delta-aster','field':'dependencyWeight','value':.6,'rationale':'Analyst sensitivity','provenance':'assumed'}]
    assert stresses(run(fixture))[0]==pytest.approx(.252)
    assert fixture['dataset']['commercialEdges'][0]['dependencyWeight'] is None

def test_zero_is_supported_not_unknown(fixture):
    fixture['scenario']['eventOverrides']={'demo:facility-event':0}
    result=run(fixture)
    assert stresses(result)==[0,0,0,None]
    assert result['totals']['connectedCapital']==9000000
    assert result['totals']['positiveStressConnectedCapital']==0

def test_duplicate_holdings_merge_without_duplicate_paths(fixture):
    original=fixture['holdings'][0]
    original['amount']=2000000
    fixture['holdings'].append({**original,'id':'demo:another-record'})
    result=run(fixture)
    assert len(result['holdingsResults'])==4
    assert result['totals']['totalCapital']==10000000
    assert result['totals']['assumedWeightedExposure']==pytest.approx(1334340)

def test_record_id_replay_rejected(fixture):
    fixture['holdings'].append(deepcopy(fixture['holdings'][0]))
    with pytest.raises(ValueError,match='Duplicate holding'): run(fixture)

def test_compare_keeps_snapshot_fixed(fixture):
    baseline=run(fixture)
    original=deepcopy(baseline)
    comparison=compare_run(baseline,'demo:aster','demo:evergreen',1000000)
    proposed=comparison['proposed']
    assert proposed['totals']['totalCapital']==10000000
    assert proposed['totals']['connectedCapital']==8000000
    assert proposed['totals']['assumedWeightedExposure']==pytest.approx(1082340)
    assert proposed['scenarioSnapshot']==baseline['scenarioSnapshot']
    assert proposed['sourceSnapshot']==baseline['sourceSnapshot']
    assert baseline==original
    with pytest.raises(ValueError): compare_run(baseline,'demo:aster','demo:evergreen',5000000)

@pytest.mark.parametrize('value',[-1,float('nan'),float('inf'),''])
def test_invalid_capital(fixture,value):
    fixture['holdings'][0]['amount']=value
    with pytest.raises(ValueError): run(fixture)

def test_empty_currency_versions_and_shares(fixture):
    bad=deepcopy(fixture);bad['holdings']=[]
    with pytest.raises(ValueError): run(bad)
    bad=deepcopy(fixture);bad['holdings'][0]['currency']='USD'
    with pytest.raises(ValueError): run(bad)
    bad=deepcopy(fixture);bad['scenario']['datasetVersion']='wrong'
    with pytest.raises(ValueError): run(bad)
    bad=deepcopy(fixture);bad['dataset']['facilities'].append({**bad['dataset']['facilities'][0],'id':'demo:other'})
    with pytest.raises(ValueError,match='shares exceed'): run(bad)

def test_incomplete_facility_share_is_unknown(fixture):
    fixture['dataset']['facilities'][0]['operationalShare']=.5
    assert run(fixture)['seeds'][0]['stress'] is None

def test_truncation_is_explicit(fixture):
    result=simulate(fixture['dataset'],fixture['holdings'],fixture['scenario'],max_paths=2)
    assert result['coverage']['truncated'] and result['warnings']
    assert result['status']=='partial'

def test_unmatched_capital_visible(fixture):
    fixture['holdings'][0].update(companyId=None,matchingStatus='unmatched')
    result=run(fixture)
    assert result['totals']['totalCapital']==10000000
    assert result['totals']['unmappedCapital']==4000000
    assert result['totals']['unmodeledCapital']==5000000
