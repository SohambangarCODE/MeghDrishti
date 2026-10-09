"""Dataset-sized local engine timings; not an external concurrency/SLA claim."""
import json,platform,sys,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parents[1]/'backend'))
from app.repositories import DemoRepository
from app.engine import simulate

repo=DemoRepository();rows=[]
for name in ('reference','climateweb'):
    f=repo.defaults(name);d=f['dataset']
    holdings=[{'id':'bench-'+c['id'],'portfolioId':'benchmark','companyId':c['id'],'originalInputName':c['name'],'amount':1000000,'currency':'INR','matchingStatus':'matched','exclusionReason':None} for c in d['companies']]
    simulate(d,holdings,f['scenario']);times=[]
    for _ in range(20):
        start=time.perf_counter();result=simulate(d,holdings,f['scenario']);times.append((time.perf_counter()-start)*1000)
    times.sort();rows.append({'dataset':name,'companies':len(d['companies']),'relationships':len(d['commercialEdges']),'holdings':len(holdings),'paths':len(result['paths']),'iterations':len(times),'p50Ms':round(times[10],2),'p95Ms':round(times[18],2),'maxMs':round(times[-1],2)})
output={'python':platform.python_version(),'kind':'single-process sequential local engine','measurements':rows}
target=Path(__file__).parents[1]/'artifacts/backend-benchmark.json';target.parent.mkdir(exist_ok=True);target.write_text(json.dumps(output,indent=2),encoding='utf-8');print(json.dumps(output,indent=2))
