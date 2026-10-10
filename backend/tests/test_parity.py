import json
import subprocess
from pathlib import Path
import pytest
from app.engine import simulate
ROOT=Path(__file__).parents[2]

@pytest.mark.parametrize('variant',['default','route','both','zero','unknown','cycle','overlay'])
def test_browser_backend_parity(variant):
    f=json.loads((ROOT/'frontend/src/fixtures/reference.json').read_text())
    if variant=='route': f['scenario']['eventIds']=['demo:route-event']
    if variant=='both': f['scenario']['eventIds']=['demo:facility-event','demo:route-event']
    if variant=='zero': f['scenario']['eventOverrides']={'demo:facility-event':0}
    if variant=='unknown': f['dataset']['commercialEdges'][0]['dependencyWeight']=None
    if variant=='cycle':
        f['dataset']['commercialEdges'].append({**f['dataset']['commercialEdges'][0],'id':'demo:cycle','supplierCompanyId':'demo:beacon','customerCompanyId':'demo:delta','supplyItemIds':[]})
    if variant=='overlay': f['scenario']['assumptionOverrides']=[{'targetId':'demo:delta-aster','field':'dependencyWeight','value':.4,'rationale':'What-if','provenance':'assumed'}]
    backend=simulate(f['dataset'],f['holdings'],f['scenario'])
    process=subprocess.run(['node',str(ROOT/'frontend/scripts/parity.mjs')],input=json.dumps(f),text=True,capture_output=True,check=True,timeout=20)
    browser=json.loads(process.stdout)
    assert browser['totals']==pytest.approx(backend['totals'])
    assert browser['paths']==backend['paths']
    assert browser['holdingsResults']==backend['holdingsResults']
    assert browser['coverage']==backend['coverage']
