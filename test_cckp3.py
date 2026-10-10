import urllib.request
import json
import itertools

def try_url(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla'})
    try:
        res = urllib.request.urlopen(req, timeout=10).read().decode()
        j = json.loads(res)
        if j.get('data'):
            print("FOUND!", url)
            print(str(j['data'])[:200])
            return True
        else:
            print("Empty data:", url, j)
    except Exception as e:
        print("Error:", url, e)
    return False

# cmip6-x0.25 historical tasmax
print("Checking historical:")
try_url('https://cckpapi.worldbank.org/cckp/v1/cmip6-x0.25_timeseries_tasmax_climatology_annual_1995-2014_mean_historical_multi-model_mean_mean/IND')
try_url('https://cckpapi.worldbank.org/cckp/v1/cmip6-x0.25_timeseries_tasmax_climatology_annual_1995-2014_p50_historical_multi-model_mean_mean/IND')
try_url('https://cckpapi.worldbank.org/cckp/v1/cmip6-x0.25_timeseries_tasmax_climatology_annual_1995-2014_none_historical_multi-model_mean_mean/IND')

print("Checking future:")
try_url('https://cckpapi.worldbank.org/cckp/v1/cmip6-x0.25_timeseries_tasmax_climatology_annual_2040-2059_p50_ssp245_multi-model_mean_mean/IND')
try_url('https://cckpapi.worldbank.org/cckp/v1/cmip6-x0.25_timeseries_tasmax_climatology_annual_2040-2059_p50_ssp245_multi-model_none_mean/IND')


