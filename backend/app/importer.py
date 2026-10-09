"""Explicit-column-map importer; schema is supplied after inspecting actual files.

Only one source file per import. Raw bytes preserved; null operational facts remain null.
This generic staging adapter does not claim the absent Sectivia schema was inspected.
"""
from pathlib import Path
import hashlib
import io
import json
import pandas as pd

def stage_companies(source,raw_dir,id_column,name_column):
    source=Path(source);raw_dir=Path(raw_dir)
    before=source.read_bytes();digest=hashlib.sha256(before).hexdigest()
    if source.suffix.lower()=='.csv':
        frame=pd.read_csv(io.BytesIO(before),dtype=str,keep_default_na=False)
        rows=frame.to_dict(orient='records')
    elif source.suffix.lower()=='.json':
        rows=json.loads(before)
        if not isinstance(rows,list):raise ValueError('Supply explicit top-level company array')
    else:raise ValueError('Expected CSV or JSON')
    if any(id_column not in r or name_column not in r for r in rows):raise ValueError('Explicit column mapping does not match source')
    ids=[str(r[id_column]) for r in rows]
    if any(not i for i in ids) or len(set(ids))!=len(ids):raise ValueError('Missing or duplicate source IDs')
    version=f'sectivia:{digest}'
    normalized=[{'id':f'sectivia:{r[id_column]}','externalId':str(r[id_column]),'name':r[name_column],
                 'ticker':None,'exchange':None,'sectorId':'unknown','countryOfRegistration':None,'roles':['company'],
                 'provenance':'dataset_reported','evidenceIds':[],'datasetVersion':version,
                 'missingFields':['operatingLocations','routes','vulnerability','dependencyShares','relationshipEvidence']} for r in rows]
    # Validate everything before publishing the byte-preserved raw copy.
    raw_dir.mkdir(parents=True,exist_ok=True)
    dest=raw_dir/f'{digest}{source.suffix.lower()}'
    if dest.exists() and dest.read_bytes()!=before:raise ValueError('Raw destination hash conflict')
    if not dest.exists():
        with dest.open('xb') as output:output.write(before)
    if source.read_bytes()!=before or hashlib.sha256(dest.read_bytes()).hexdigest()!=digest:raise ValueError('Import integrity failure')
    return {'datasetVersion':version,'companies':normalized,'report':{'sourceHash':digest,'companyCount':len(rows),'relationshipCount':0,
            'rawPath':str(dest),'operationalCoverage':'unknown','unmappedFields':sorted(set().union(*(r.keys() for r in rows))-{id_column,name_column}),
            'attribution':'Sectivia, CC BY 4.0; verify license against supplied source'}}
