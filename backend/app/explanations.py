"""Optional Gemini path selection; all narrative/numbers remain grounded in engine facts."""
import json
import math
import os
import re
import httpx

def deterministic(run):
    return {'schemaVersion':'1.0.0','provider':'deterministic',
        'summary':f"Demo simulation: INR {run['totals']['connectedCapital']:,.2f} has a supported assumed path. Stress-weighted exposure is not a loss forecast.",
        'affectedPaths':list(dict.fromkeys(p for h in run['holdingsResults'] for p in h['selectedPathIds'])),
        'limitations':['Synthetic assumptions; unrecorded paths do not establish safety','Unknown direct exposure remains unknown'],
        'analystChecks':['Verify operational locations and dependency shares before sourced analysis']}

async def explain(run,transport=None):
    fallback=deterministic(run)
    key=os.getenv('GEMINI_API_KEY','');model=os.getenv('GEMINI_MODEL','')
    if os.getenv('GEMINI_ENABLED','false').lower()!='true' or not key or not re.fullmatch(r'[A-Za-z0-9._-]+',model):
        return {**fallback,'providerStatus':'not configured'}
    paths={p['id']:p for p in run['paths'] if p['id'] in fallback['affectedPaths']}
    # No capital amounts, portfolio/user names, holdings rows, coordinates or source text sent.
    facts=[{'pathId':p['id'],'companyIds':p['companyIds'],'stress':p['stress']} for p in list(paths.values())[:100]]
    schema={'type':'object','properties':{'highlights':{'type':'array','maxItems':5,'items':{'type':'object','properties':{'pathId':{'type':'string'},'companyIds':{'type':'array','items':{'type':'string'}},'stress':{'type':['number','null']}},'required':['pathId','companyIds','stress'],'additionalProperties':False}}},'required':['highlights'],'additionalProperties':False}
    try:
        async with httpx.AsyncClient(timeout=10,transport=transport) as client:
            response=await client.post(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',headers={'x-goog-api-key':key},json={
                'contents':[{'parts':[{'text':'Select up to five supplied computed paths for analyst review. Copy identifiers and stress exactly. Do not calculate or infer facts. '+json.dumps(facts)}]}],
                'generationConfig':{'responseMimeType':'application/json','responseJsonSchema':schema,'maxOutputTokens':1500}})
            response.raise_for_status()
            if len(response.content)>100_000:raise ValueError('Response too large')
            body=json.loads(response.json()['candidates'][0]['content']['parts'][0]['text'])
        if set(body)!={'highlights'} or not isinstance(body['highlights'],list) or len(body['highlights'])>5:raise ValueError('Invalid structure')
        seen=set();highlights=[];allowed={p['pathId'] for p in facts}
        for item in body['highlights']:
            if set(item)!={'pathId','companyIds','stress'} or item['pathId'] not in allowed or item['pathId'] in seen:raise ValueError('Invalid path')
            path=paths[item['pathId']];seen.add(path['id'])
            if item['companyIds']!=path['companyIds']:raise ValueError('Invalid entities')
            if path['stress'] is None:
                if item['stress'] is not None:raise ValueError('Unknown value changed')
            elif type(item['stress']) not in (int,float) or not math.isfinite(item['stress']) or abs(item['stress']-path['stress'])>1e-12:raise ValueError('Metric mismatch')
            highlights.append({'pathId':path['id'],'companyIds':path['companyIds'],'stress':path['stress']})
        return {**fallback,'provider':'Gemini path selection with deterministic narration','providerStatus':'available','highlights':highlights}
    except (httpx.HTTPError,ValueError,KeyError,IndexError,TypeError):
        return {**fallback,'providerStatus':'unavailable or invalid response; deterministic fallback'}
