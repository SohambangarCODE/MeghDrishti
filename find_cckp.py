import urllib.request
import json

base_url = 'https://cckpapi.worldbank.org/cckp/v1/cmip6-x0.25_{}_tasmax_climatology_annual_{}_p50_{}_multi-model_mean_None/IND'
# types: timeseries, spatial, climatology
types = ['timeseries', 'spatial', 'climatology']
periods = ['2040-2059', '1995-2014']
scenarios = ['ssp245', 'historical']

for t in types:
    for p, s in [('2040-2059', 'ssp245'), ('1995-2014', 'historical')]:
        url = base_url.format(t, p, s)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla'})
        try:
            res = urllib.request.urlopen(req, timeout=10).read().decode()
            j = json.loads(res)
            if j.get('data'):
                print("FOUND!", url)
                print(str(j['data'])[:200])
        except Exception as e:
            pass

