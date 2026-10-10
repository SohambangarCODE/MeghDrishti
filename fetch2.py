import re, urllib.request
html = urllib.request.urlopen('https://worldbank.github.io/climateknowledgeportal/docs/collections/cmip6-x0.25.html').read().decode('utf-8')
urls = re.findall(r'https?://cckpapi.worldbank.org[^\s"\'<>]+', html)
print("CCKP URLs:", urls)

