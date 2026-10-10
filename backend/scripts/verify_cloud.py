"""External two-user API/RLS smoke test. Passwords are prompted, never logged/stored."""
import argparse,getpass,json,os,sys
from pathlib import Path
from uuid import uuid4
sys.path.insert(0,str(Path(__file__).parents[1]))
import httpx

def configuration():
    path=Path(__file__).parents[1]/'.env.local'
    if path.exists():
        for line in path.read_text(encoding='utf-8-sig').splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                k,v=line.split('=',1);os.environ.setdefault(k.strip(),v.strip().strip('"').strip("'"))
    return os.environ.get('SUPABASE_URL',''),os.environ.get('SUPABASE_PUBLISHABLE_KEY','')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--reopen',action='store_true',help='Recheck retained reports after service restart');args=parser.parse_args()
    url,key=configuration()
    if not url or not key:raise SystemExit('Set backend/.env.local URL and publishable key first')
    api='http://127.0.0.1:8000/api/v1';client=httpx.Client(timeout=30)
    tokens=[]
    for label in ['A','B']:
        email=input(f'Confirmed test user {label} email: ');password=getpass.getpass(f'User {label} password (hidden): ')
        response=client.post(url+'/auth/v1/token?grant_type=password',headers={'apikey':key},json={'email':email,'password':password})
        if response.status_code!=200:raise SystemExit(f'User {label} sign-in failed (HTTP {response.status_code}); no credentials printed')
        tokens.append(response.json()['access_token'])
    headers=[{'Authorization':'Bearer '+t} for t in tokens]
    owners=[client.get(api+'/private/session',headers=h).json().get('ownerId') for h in headers]
    assert all(owners) and owners[0]!=owners[1],'Two distinct verified users required'
    output=Path(__file__).parents[1]/'artifacts/cloud-verification.json'
    if args.reopen:
        prior=json.loads(output.read_text(encoding='utf-8'))
        assert prior['owners']==owners,'Use the same two accounts in the same order'
        for i,(_,run_id) in enumerate(prior['records']):
            result=client.get(api+'/private/runs/'+run_id,headers=headers[i]);assert result.status_code==200
            assert result.json()['run']['inputHash']==prior['hashes'][i]
            assert client.get(api+'/private/runs/'+run_id,headers=headers[1-i]).status_code==404
        prior['restartReopenVerified']=True;output.write_text(json.dumps(prior,indent=2),encoding='utf-8')
        print('Retained reports reopen with identical input hashes and owner isolation. Confirm services were restarted before this check.')
        return
    fixture=client.get(api+'/demo?datasetId=climateweb').json();records=[];hashes=[]
    for i,h in enumerate(headers):
        pid=str(uuid4());payload={'id':pid,'name':'Isolation verification '+str(i),'holdings':fixture['holdings'],'scenario':fixture['scenario']}
        saved=client.post(api+'/private/portfolios',headers=h,json=payload);assert saved.status_code==200,saved.status_code
        request={'portfolioId':pid,'requestId':str(uuid4())}
        run=client.post(api+'/private/analysis',headers=h,json=request);assert run.status_code==200,run.status_code
        snapshot=run.json()['run'];repeat=client.post(api+'/private/analysis',headers=h,json=request)
        assert repeat.json()['run']['id']==snapshot['id'],'Idempotency failed'
        records.append((pid,snapshot['id']))
        hashes.append(snapshot['inputHash'])
    for i,h in enumerate(headers):
        own,foreign=records[i],records[1-i]
        assert client.get(api+'/private/runs/'+own[1],headers=h).status_code==200
        assert client.get(api+'/private/runs/'+foreign[1],headers=h).status_code==404
        assert client.delete(api+'/private/runs/'+foreign[1],headers=h).status_code==404
        assert client.delete(api+'/private/portfolios/'+foreign[0],headers=h).status_code==404
        assert client.post(api+'/private/compare',headers=h,json={'runId':foreign[1],'fromCompanyId':'abbv','toCompanyId':'cvs','amount':1,'requestId':'foreign'}).status_code==404
        assert client.post(api+'/private/analysis',headers=h,json={'portfolioId':foreign[0],'requestId':str(uuid4())}).status_code==404
        forged={'id':foreign[0],'name':'Forbidden update','holdings':fixture['holdings'],'scenario':fixture['scenario']}
        assert client.post(api+'/private/portfolios',headers=h,json=forged).status_code in (401,409,502)
        # Direct PostgREST child update/delete/export cannot see the other owner.
        db_headers={**h,'apikey':key,'Prefer':'return=representation'}
        for table,column,value in [('holdings','portfolio_id',foreign[0]),('assumption_overlays','portfolio_id',foreign[0]),('analysis_results','run_id',foreign[1])]:
            response=client.get(url+'/rest/v1/'+table,headers=db_headers,params={column:'eq.'+value,'select':'*'})
            assert response.status_code==200 and response.json()==[]
        changed=client.patch(url+'/rest/v1/portfolios',headers=db_headers,params={'id':'eq.'+foreign[0]},json={'name':'Forbidden'})
        assert changed.status_code==200 and changed.json()==[]
    assert client.get(api+'/private/portfolios').status_code==401
    anonymous=client.get(url+'/rest/v1/portfolios',headers={'apikey':key})
    assert anonymous.status_code in (401,403) or anonymous.json()==[]
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps({'records':records,'owners':owners,'hashes':hashes,'restartReopenVerified':False,'checks':'two-user API/RLS/idempotency passed; restart persistence still needs second check'},indent=2),encoding='utf-8')
    print('Two-user external checks passed. Verification records retained. Restart backend and reopen these private reports to verify persistence; see backend/artifacts/cloud-verification.json.')

if __name__=='__main__':main()
