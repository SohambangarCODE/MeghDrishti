import urllib.request
import json

base_parts = ['cmip6-x0.25', 'timeseries', 'tas', 'climatology', 'annual', '1995-2014', 'p50', 'historical', 'multi-model', 'mean', 'mean']
# Let's try tas and tasmax
# Let's try type-code: timeseries, spatial, climatology
# Let's try percentile: p50, mean, None
# Let's try model-calc: mean, None
# Let's try statistic: mean, None

for var in ['tas', 'tasmax', 'hd35']:
    for typ in ['timeseries', 'spatial']:
        for perc in ['p50', 'mean', 'None']:
            for mcalc in ['mean', 'None']:
                for stat in ['mean', 'None']:
                    parts = ['cmip6-x0.25', typ, var, 'climatology', 'annual', '1995-2014', perc, 'historical', 'multi-model', mcalc, stat]
                    url = f"https://cckpapi.worldbank.org/cckp/v1/{'_'.join(parts)}/IND"
                    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla'})
                    try:
                        res = urllib.request.urlopen(req, timeout=3).read().decode()
                        j = json.loads(res)
                        if j.get('data'):
                            print("FOUND!", url)
                            print(str(j['data'])[:200])
                    except Exception:
                        pass
print("Done brute forcing historical")

