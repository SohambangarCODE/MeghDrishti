"""Repository boundaries. Demo snapshots live in memory; Supabase uses the user's JWT."""
from collections import OrderedDict
from copy import deepcopy
from pathlib import Path
from threading import RLock
import json
import hashlib
import os

class DemoRepository:
    mode = 'demo'
    def __init__(self, max_runs=100):
        fixture_path=Path(__file__).parents[1]/'fixtures/reference.json' if os.getenv('VERCEL')=='1' else Path(__file__).parents[2]/'frontend/src/fixtures/reference.json'
        self.fixture=json.loads(fixture_path.read_text())
        self.fixtures={'reference':self.fixture}
        root=Path(__file__).parents[1]/'data/normalized/climateweb'
        if (root/'active.json').exists():
            pointer=json.loads((root/'active.json').read_text(encoding='utf-8'))
            path=(root/pointer['file']).resolve()
            if path.parent!=root.resolve(): raise ValueError('Invalid dataset pointer')
            raw=path.read_bytes()
            if hashlib.sha256(raw).hexdigest()!=pointer['sha256']: raise ValueError('Dataset integrity failure')
            self.fixtures['climateweb']=json.loads(raw)
        self.runs=OrderedDict()
        self.idempotency=OrderedDict()
        self.max_runs=max_runs
        self.lock=RLock()

    def defaults(self,dataset_id=None):
        if dataset_id is None: return deepcopy(self.fixture)
        for key,value in self.fixtures.items():
            if dataset_id in (key,value['dataset']['datasetVersion']): return deepcopy(value)
        raise ValueError('Dataset unavailable; select an installed version')
    def dataset(self,dataset_id=None): return self.defaults(dataset_id)['dataset']
    def catalog(self):
        return [{'id':key,'datasetVersion':v['dataset']['datasetVersion'],
                 'label':'Fictional reference demo' if key=='reference' else 'Sectivia + synthetic operations',
                 'dataState':v['dataset'].get('dataState','fictional_reference'),
                 'companies':len(v['dataset']['companies']),'relationships':len(v['dataset']['commercialEdges'])}
                for key,v in self.fixtures.items()]
    def get(self, run_id, owner_id):
        with self.lock:
            run=self.runs.get(run_id)
            return deepcopy(run) if run and run['ownerId']==owner_id else None
    def list(self, owner_id):
        with self.lock: return [deepcopy(r) for r in reversed(self.runs.values()) if r['ownerId']==owner_id]
    def save(self, run):
        with self.lock:
            self.runs[run['id']]=deepcopy(run)
            while len(self.runs)>self.max_runs: self.runs.popitem(last=False)
