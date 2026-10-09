from pathlib import Path
import json
import platform
import sys
from time import perf_counter
import numpy as np
sys.path.insert(0,str(Path(__file__).parents[1]/'backend'))
from app.engine import simulate
fixture=json.loads((Path(__file__).parents[1]/'frontend/src/fixtures/reference.json').read_text())
def evaluate():return simulate(fixture['dataset'],fixture['holdings'],fixture['scenario'])
for _ in range(20):evaluate()
times=[]
for _ in range(500):
    start=perf_counter();evaluate();times.append((perf_counter()-start)*1000)
print(json.dumps({'engine':'Python / NetworkX','python':platform.python_version(),'companies':5,'edges':3,'holdings':4,'iterations':500,'p50ms':float(np.percentile(times,50)),'p95ms':float(np.percentile(times,95))},indent=2))
