import urllib.request
import re
html = urllib.request.urlopen('https://worldbank.github.io/climateknowledgeportal/docs/collections/cmip6-x0.25.html').read().decode('utf-8')
text = re.sub('<[^<]+>', ' ', html)
print(re.sub(r'\s+', ' ', text)[:3000])
