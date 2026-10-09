"""Repository boundaries. Demo snapshots live in memory; Supabase uses the user's JWT."""
from collections import OrderedDict
from copy import deepcopy
from pathlib import Path
from threading import RLock
import json
import httpx

class DemoRepository:
    mode = 'demo'
    def __init__(self, max_runs=100):
        self.fixture=json.loads((Path(__file__).parents[2]/'frontend/src/fixtures/reference.json').read_text())
        self.runs=OrderedDict()
        self.idempotency=OrderedDict()
        self.max_runs=max_runs
        self.lock=RLock()

    def dataset(self): return deepcopy(self.fixture['dataset'])
    def defaults(self): return deepcopy(self.fixture)
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

class SupabaseRepository:
    """Private persistence only; never use service-role credentials to bypass RLS."""
    mode='sourced'
    def __init__(self,url,anon_key,token):
        self.url=url.rstrip('/')+'/rest/v1'
        self.headers={'apikey':anon_key,'Authorization':f'Bearer {token}'}
    async def get_run(self,run_id):
        async with httpx.AsyncClient(timeout=10) as client:
            response=await client.get(self.url+'/analysis_runs',headers=self.headers,params={'id':f'eq.{run_id}','select':'snapshot'})
            response.raise_for_status()
            rows=response.json()
            return rows[0]['snapshot'] if rows else None
    async def save_run(self,run,portfolio_id,owner_id):
        payload={'id':run['id'],'portfolio_id':portfolio_id,'owner_id':owner_id,'snapshot':run,'input_hash':run['inputHash'],'request_id':run['requestId']}
        async with httpx.AsyncClient(timeout=10) as client:
            response=await client.post(self.url+'/analysis_runs',headers={**self.headers,'Prefer':'return=representation'},json=payload)
            response.raise_for_status()
            return response.json()
