import urllib.request
import json
import itertools

base = ['cmip6-x0.25', 'timeseries', 'tasmax', 'climatology', 'annual', '2040-2059', 'p50', 'ssp245', 'multi-model', 'mean', 'None', 'None']
# The API says "Needed: 11", meaning there are 11 parts (10 underscores).
for i in range(12):
    test_parts = base[:i] + base[i+1:]
    assert len(test_parts) == 11
    url = f"https://cckpapi.worldbank.org/cckp/v1/{'_'.join(test_parts)}/IND"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla'})
    try:
        res = urllib.request.urlopen(req, timeout=5).read().decode()
        j = json.loads(res)
        if 'error' not in j.get('metadata', {}).get('status', ''):
            print("SUCCESS with omitted index", i)
            print(url)
            print(str(j)[:200])
    except Exception as e:
        # print("Error omitting", i, e)
        pass

