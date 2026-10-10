"""Explicit inspected-column mapping, not an assumed universal CCKP download schema."""
import csv
import hashlib
import io
import json
import os
from pathlib import Path
from .providers import validate_projection

ROOT=Path(__file__).parents[2]/'data/projections'

def import_projection_file(path,mapping,root=ROOT):
    raw=Path(path).read_bytes();digest=hashlib.sha256(raw).hexdigest()
    if Path(path).suffix.lower()=='.csv':rows=list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
    elif Path(path).suffix.lower()=='.json':
        rows=json.loads(raw)
        for key in mapping.get('recordsPath',[]):rows=rows[key]
    else:raise ValueError('Inspect CSV or JSON download; other formats require a specific adapter')
    if not isinstance(rows,list) or not rows:raise ValueError('No projection records at declared path')
    result=[]
    for row in rows:
        record=dict(mapping['metadata'])
        for destination,column in mapping['columns'].items():
            if column not in row:raise ValueError(f'Mapped column missing: {column}')
            record[destination]=row[column]
        raw_geo=str(record['regionId'])
        if raw_geo not in mapping['geographyMap']:raise ValueError('Unsupported geography mapping')
        record['regionId']=mapping['geographyMap'][raw_geo]
        record['value']=None if record['value'] in ('',None) else float(record['value'])
        result.append(validate_projection(record))
    return store_projection_records(path,mapping,result,root)

def store_projection_records(path,mapping,records,root=ROOT,*,metadata=None,validate_only=False):
    """Shared validated storage for inspected file adapters; preflight performs no writes."""
    raw=Path(path).read_bytes();digest=hashlib.sha256(raw).hexdigest()
    result=[validate_projection(r) for r in records]
    if not result:raise ValueError('No projection records')
    for record in result:
        if record.get('verificationStatus','verified')!='verified':raise ValueError('Unverified projection cannot be installed')
        if record.get('sourceFileHash',digest)!=digest:raise ValueError('Source changed after validation')
    keys=[(r['regionId'],r['variable'],r['period'],r['scenario'],r['percentile']) for r in result]
    if len(set(keys))!=len(keys):raise ValueError('Duplicate projection values')
    root=Path(root)
    prior_source=None
    for existing in root.glob('*.json'):
        prior=json.loads(existing.read_text(encoding='utf-8'))
        if prior['sha256']==digest:
            if prior['mapping']!=mapping:raise ValueError('Existing source uses a different mapping; explicit version migration required')
            prior_source=prior
            continue
        previous={(r['regionId'],r['variable'],r['period'],r['scenario'],r['percentile']) for r in prior['records']}
        if previous.intersection(keys):raise ValueError('Projection product already imported; explicit version migration required')
    manifest={'sha256':digest,'sourceFile':Path(path).name,'mapping':mapping,'records':result,**(metadata or {})}
    target=root/'raw'/(digest+Path(path).suffix.lower())
    if target.exists() and target.read_bytes()!=raw:raise ValueError('Raw integrity conflict')
    if prior_source and metadata and 'normalizedContentHash' in metadata:
        if prior_source.get('normalizedContentHash')!=metadata['normalizedContentHash']:raise ValueError('Existing normalized content differs; explicit version migration required')
        if not target.exists():raise ValueError('Existing source raw copy missing')
        return prior_source
    if validate_only:return manifest
    (root/'raw').mkdir(parents=True,exist_ok=True)
    if not target.exists():target.write_bytes(raw)
    tmp=root/(digest+'.tmp');tmp.write_text(json.dumps(manifest,indent=2),encoding='utf-8');os.replace(tmp,root/(digest+'.json'))
    assert Path(path).read_bytes()==raw and target.read_bytes()==raw
    return manifest

class ProjectionRepository:
    def __init__(self,root=ROOT):self.root=Path(root)
    def query(self,geography,variable,period,scenario):
        found=[]
        for path in sorted(self.root.glob('*.json')):
            source=json.loads(path.read_text(encoding='utf-8'))
            for row in source['records']:
                if (row['regionId'],row['variable'],row['period'],row['scenario'])==(geography,variable,period,scenario):
                    found.append({**validate_projection(row),'sourceHash':source['sha256']})
        return found
