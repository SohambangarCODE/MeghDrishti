import urllib.request
import json
import itertools

collection = ['cmip6-x0.25']
# type: 'timeseries' or 'spatial'
types = ['timeseries']
variables = ['tasmax']
products = ['climatology']
aggs = ['annual', 'monthly']
periods = ['2040-2059', '1995-2014']
percentiles = ['p50']
scenarios = ['ssp245', 'historical']
models = ['multi-model']

def try_url(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla'})
    try:
        res = urllib.request.urlopen(req, timeout=3).read().decode()
        j = json.loads(res)
        if j.get('data'):
            print("FOUND!", url)
            print(str(j['data'])[:200])
            return True
    except Exception:
        pass
    return False

for p in periods:
    for s in scenarios:
        # 11 parts. We will try combinations.
        parts = ['cmip6-x0.25', 'timeseries', 'tasmax', 'climatology', 'annual', p, 'p50', s, 'multi-model', 'mean', 'None']
        if try_url(f"https://cckpapi.worldbank.org/cckp/v1/{'_'.join(parts)}/IND"): continue
        # try without type?
        parts2 = ['cmip6-x0.25', 'tasmax', 'climatology', 'annual', p, 'p50', s, 'multi-model', 'mean', 'None', 'None']
        if try_url(f"https://cckpapi.worldbank.org/cckp/v1/{'_'.join(parts2)}/IND"): continue
        
        # Another guess: Maybe statistic-code is omitted?
        
print("Done")

