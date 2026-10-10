"""Read-only Task 03 audit. Writes reports only; never promotes or edits datasets.
Run from the repository root: backend/.venv/Scripts/python.exe docs/audit_task03.py
"""
import csv
import hashlib
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from app.climateweb_importer import read_source, adapt

RAW = ROOT / 'data/raw/climateweb'
OUT = ROOT / 'docs/task03-audit'
OUT.mkdir(exist_ok=True)
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
canonical = lambda x: json.dumps(x, sort_keys=True, separators=(',', ':'))
present = lambda x: x is not None and x != '' and x != []

manifest = json.loads((RAW / 'manifest.json').read_text())
pointer = json.loads((ROOT / 'data/normalized/climateweb/active.json').read_text())
active_path = ROOT / 'data/normalized/climateweb' / pointer['file']
installed = json.loads(active_path.read_text())
source = read_source(json_path=RAW / 'climateweb-supply-chain-enriched.json')
csv_source = read_source(companies_path=RAW / 'climateweb-companies-enriched.csv', relations_path=RAW / 'climateweb-relations-enriched.csv')
adapted = adapt(source, True)
dataset = installed['dataset']
companies, relations = source['companies'], source['relations']
facilities = [f for c in companies for f in c['simulation_assets']]
usages = [u for c in companies for u in c['simulation_routes']]
global_data = source['demo_operational_layer']
routes = global_data['routes']
schemas = {}
for p in sorted(RAW.glob('*.csv')):
    with p.open(encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        schemas[p.name] = {'headers': reader.fieldnames, 'rows': len(rows), 'blankCellCounts': {k: sum(r[k] == '' for r in rows) for k in reader.fieldnames}}
inventory = []
for row in manifest['files']:
    p = RAW / row['file']
    download = Path.home() / 'Downloads' / row['file']
    inventory.append({'path': str(p.relative_to(ROOT)), 'bytes': p.stat().st_size, 'sha256': digest(p), 'matchesManifest': digest(p) == row['sha256'],
                      'downloadsCopyPresent': download.exists(), 'matchesDownloads': digest(p) == digest(download) if download.exists() else None})
normalized_inventory = []
for p in sorted((ROOT / 'data/normalized/climateweb').glob('*.json')):
    if p.name == 'active.json': continue
    d = json.loads(p.read_text())['dataset']
    normalized_inventory.append({'path': str(p.relative_to(ROOT)), 'sha256': digest(p), 'active': p.name == pointer['file'], 'datasetVersion': d['datasetVersion'],
                                 'counts': {k: len(d[k]) for k in ['companies', 'commercialEdges', 'facilities', 'routes', 'routeUsage']}})

def fetch(path):
    with urlopen('http://127.0.0.1:8000' + path, timeout=15) as response: return json.load(response)

try:
    catalog = fetch('/api/v1/datasets')
    live = fetch('/api/v1/demo?datasetId=climateweb')
    projection = fetch('/api/v1/projections?datasetId=climateweb&regionId=demo-region-01')
    runtime = {'reachable': True, 'catalog': catalog, 'datasetMatchesInstalled': canonical(live['dataset']) == canonical(dataset),
               'datasetVersion': live['dataset']['datasetVersion'], 'projectionExample': projection}
except Exception as e:
    runtime = {'reachable': False, 'reason': str(e)}

def field(state, count=None, note=None):
    return {k: v for k, v in {'state': state, 'count': count, 'note': note}.items() if v is not None}

company_rows = []
for c in companies:
    incoming = [e for e in relations if e['customer'] == c['id']]
    outgoing = [e for e in relations if e['supplier'] == c['id']]
    fs, rs = c['simulation_assets'], c['simulation_routes']
    verified = [f for f in fs if f.get('evidence_status') in ('sourced', 'verified') and not f.get('is_synthetic') and f.get('source_urls')]
    company_rows.append({'id': c['id'], 'name': c['name'], 'sector': c['sector'], 'ticker': c.get('ticker') or None,
      'supplierCount': len(incoming), 'customerCount': len(outgoing), 'facilityCount': len(fs), 'routeIds': [r['route_id'] for r in rs],
      'fields': {
        'stableIdentifier': field('Dataset-reported' if present(c['id']) else 'Unknown'),
        'companyName': field('Dataset-reported' if present(c['name']) else 'Unknown'),
        'sector': field('Dataset-reported' if present(c['sector']) else 'Unknown'),
        'commercialRelationships': field('Dataset-reported' if incoming or outgoing else 'Unknown', len(incoming) + len(outgoing), 'Zero recorded edges is not proof of no commercial dependencies.' if not incoming and not outgoing else 'Topology reported; product, contract and effective dates unverified.'),
        'verifiedOperatingFacilities': field('Sourced' if verified else 'Unknown', len(verified)),
        'facilityCoordinates': field('Synthetic' if fs else 'Unknown', sum(f.get('latitude') is not None and f.get('longitude') is not None for f in fs)),
        'coordinateProvenance': field('Synthetic' if fs else 'Unknown', note='Illustrative placement; observed coordinates and ownership not established.'),
        'measuredOperationalShare': field('Unknown', sum(f.get('operational_share') is not None for f in fs)),
        'operationalShareUsedInDemo': field('Assumed', sum(f.get('operational_share_assumed') is not None for f in fs)),
        'measuredSupplierDependence': field('Unknown', note='No measured supplier-dependence field/evidence in the commercial schema.'),
        'commercialWeightUsedInDemo': field('Assumed' if incoming or outgoing else 'Unknown', len(incoming) + len(outgoing)),
        'routeUsageAndGeometry': field('Synthetic' if rs else 'Unknown', len(rs)),
        'measuredRouteDependence': field('Unknown', sum(r.get('dependence_share') is not None for r in rs)),
        'substitutionInformation': field('Assumed', len(rs) + len(incoming) + len(outgoing)),
        'hazardVulnerability': field('Assumed', len(fs), 'Heat at facilities and route_disruption at usage only; other hazards unknown.'),
        'operationalEvidenceReferences': field('Unknown', sum(len(f.get('source_urls', [])) for f in fs) + sum(len(r.get('source_urls', [])) for r in rs)),
        'projectionGeographyMapping': field('Unknown', 0),
        'companyWeatherExposureAnalysis': field('Unavailable', note='No sourced operating coordinates.'),
        'futureProjectionAnalysis': field('Unavailable', note='Synthetic geography and no imported compatible product.')},
      'declaredMissingFields': c.get('missing_fields', [])})

metrics = []
def metric(name, n, denominator, basis):
    metrics.append({'metric': name, 'numerator': n, 'denominator': denominator, 'percent': round(100*n/denominator, 2) if denominator else None, 'basis': basis})

N, E, F, U, R = len(companies), len(relations), len(facilities), len(usages), len(routes)
metric('Companies with identifier/name/sector', sum(all(present(c.get(k)) for k in ['id','name','sector']) for c in companies), N, 'Dataset-reported identity/taxonomy; not independent verification')
metric('Companies with recorded commercial relationships', sum(r['supplierCount'] + r['customerCount'] > 0 for r in company_rows), N, 'Dataset-reported graph only')
metric('Companies with verified operating coordinates', sum(r['fields']['verifiedOperatingFacilities']['count'] > 0 for r in company_rows), N, 'Requires non-synthetic record plus identifiable operating-location evidence')
metric('Companies with synthetic-only facilities', sum(r['facilityCount'] > 0 and r['fields']['verifiedOperatingFacilities']['count'] == 0 for r in company_rows), N, 'Supplied enrichment explicitly synthetic')
metric('Companies lacking operating-location evidence', sum(r['fields']['verifiedOperatingFacilities']['count'] == 0 for r in company_rows), N, 'Unknown actual footprint, not zero risk')
metric('Facilities with illustrative coordinate pairs', sum(f['latitude'] is not None and f['longitude'] is not None for f in facilities), F, 'Synthetic latitude/longitude')
metric('Facilities with measured operational shares', sum(f.get('operational_share') is not None for f in facilities), F, 'Measured field, never assumed overlay')
metric('Facilities with assumed operational shares', sum(f.get('operational_share_assumed') is not None for f in facilities), F, 'Demo parameter')
metric('Relationships with measured dependency weights', sum(e.get('weight_basis') == 'measured' for e in relations), E, 'No measured values or evidence supplied')
metric('Relationships using assumed effective weights', sum(e.get('effective_dependency_weight_assumed') is not None and e.get('weight_basis') == 'assumed' for e in relations), E, 'Replacement already included')
metric('Relationships with unknown effective demo weights', sum(e.get('effective_dependency_weight_assumed') is None for e in relations), E, 'Computational availability only')
metric('Relationships whose real measured dependence is unknown', sum(e.get('weight_basis') != 'measured' for e in relations), E, 'Schema lacks measured dependence/evidence; separate from demo-weight availability')
metric('Companies with usable synthetic route geometry', sum(any(r.get('geometry_geojson', {}).get('type') == 'LineString' for r in c['simulation_routes']) for c in companies), N, 'Geometry supports demo rendering, not observed shipments')
metric('Companies with evidence-supported observed routes', sum(any(not r.get('is_synthetic') and r.get('source_urls') for r in c['simulation_routes']) for c in companies), N, 'No supplied operational route evidence')
metric('Route usages with measured dependence shares', sum(r.get('dependence_share') is not None for r in usages), U, 'Measured field null')
metric('Relationships with independently identifiable source URL', sum(bool(e.get('demo_source_urls') or e.get('url')) for e in relations), E, 'Generic dataset attribution does not prove an edge')
metric('Companies with verified projection geography mappings', sum(r['fields']['projectionGeographyMapping']['count'] > 0 for r in company_rows), N, 'All linked regions synthetic with providerGeographyId null')
metric('Regions with sourced provider geography mapping', sum(r['provenance'] == 'sourced' and r['providerGeographyId'] is not None for r in dataset['regions']), len(dataset['regions']), 'Country of registration is not operating geography')

missing = {
 'company': {'identityId': sum(not present(c.get('id')) for c in companies), 'name': sum(not present(c.get('name')) for c in companies), 'sector': sum(not present(c.get('sector')) for c in companies), 'ticker': sum(not present(c.get('ticker')) for c in companies), 'exchange': sum(not present(c.get('exchange')) for c in companies), 'operatingLocationEvidence': N, 'projectionMapping': N, 'researchCheckedAt': sum(not present(c.get('enrichment_checked_at')) for c in companies)},
 'facility': {'observedCoordinatesEvidence': F, 'ownershipEvidence': F, 'measuredOperationalShare': sum(f.get('operational_share') is None for f in facilities), 'sourceURLs': sum(not f.get('source_urls') for f in facilities), 'sourcePublicationDate': sum(not f.get('source_publication_date') for f in facilities), 'checkedAt': sum(not f.get('checked_at') for f in facilities), 'measuredVulnerability': F},
 'commercialRelationship': {'measuredDependencyWeightEvidence': E, 'verifiedProductOrService': sum(not e.get('what') for e in csv_source['relations']), 'source': sum(not e.get('source') for e in csv_source['relations']), 'URL': sum(not e.get('url') for e in csv_source['relations']), 'observedReplacementCapacity': E, 'currentAsOf': sum(e['currentAsOf'] is None for e in dataset['commercialEdges'])},
 'route': {'observedGeometryEvidence': R, 'verifiedTransportMode': R, 'sourceURLs': sum(not r.get('source_urls') for r in routes)},
 'routeUsage': {'measuredDependenceShare': sum(r.get('dependence_share') is None for r in usages), 'observedReplacementCapacity': U, 'measuredVulnerability': U},
 'region': {'verifiedProviderMapping': sum(r['providerGeographyId'] is None for r in dataset['regions'])},
 'declaredMissingFields': {k: dict(sorted(Counter(x for r in rows for x in r.get(fieldname, [])).items())) for k, rows, fieldname in [('companies',companies,'missing_fields'),('facilities',facilities,'missing_fields'),('relationships',relations,'demo_missing_fields'),('routes',routes,'missing_fields')]}}

checks = {'rawHashesMatchManifest': all(r['matchesManifest'] for r in inventory), 'activeHashMatchesPointer': digest(active_path) == pointer['sha256'],
 'jsonAdapterMatchesInstalled': canonical(adapted) == canonical(installed), 'csvAndJsonNormalizedDatasetEqual': canonical(adapt(csv_source, True)['dataset']) == canonical(adapted['dataset']),
 'uniqueCompanyIds': len({c['id'] for c in companies}) == N, 'uniqueRelationshipIds': len({r['demo_relationship_id'] for r in relations}) == E,
 'validCommercialEndpoints': all(r['supplier'] in {c['id'] for c in companies} and r['customer'] in {c['id'] for c in companies} for r in relations),
 'uniqueNormalizedFacilityIds': len({f['id'] for f in dataset['facilities']}) == F,
 'facilityShareSumsOne': all(abs(sum(f['operational_share_assumed'] for f in c['simulation_assets']) - 1) < 1e-12 for c in companies),
 'effectiveReplacementAppliedOnce': all(abs(r['effective_dependency_weight_assumed'] - r['dependency_weight_assumed']*(1-r['replacement_fraction_assumed'])) < 1e-10 for r in relations),
 'measuredSharesRemainNullInSourceFields': all(f['sourceFields']['operational_share'] is None for f in dataset['facilities']) and all(u['sourceFields']['dependence_share'] is None for u in dataset['routeUsage'])}
audit = {'auditedAt': datetime.now(timezone.utc).isoformat(), 'scope':'Installed supplied enrichment; no independent external research', 'inventory':inventory, 'activePointer':pointer,
 'normalizedInventory':normalized_inventory, 'schemas':schemas, 'jsonSchemas':{'root':list(source), 'company':list(companies[0]), 'relation':list(relations[0]), 'simulationAsset':list(facilities[0]), 'simulationRoute':list(usages[0])},
 'counts':{k:len(dataset[k]) for k in ['companies','commercialEdges','facilities','routes','routeUsage','regions','commodities','supplyItems','evidence','events']},
 'projectionProductsInstalled':len(list((ROOT/'data/projections').glob('*.json'))), 'metrics':metrics, 'missing':missing, 'checks':checks, 'runtime':runtime, 'companies':company_rows,
 'companyFieldStates':{key:dict(Counter(c['fields'][key]['state'] for c in company_rows)) for key in company_rows[0]['fields']}}
(OUT/'audit.json').write_text(json.dumps(audit,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
lines=['# Company completeness audit','', 'Every company below has **Unknown** actual operating footprint, measured operational/supplier/route shares, operational source references and projection mapping. Weather exposure and future projections are **Unavailable**. IDs, names and sectors are Dataset-reported. Coordinates/route geometry are Synthetic; shares, replacement and hazard parameters are Assumed. A zero edge count means no recorded edges, not absence of dependency.', '', '| ID | Company | Reported sector | Suppliers | Customers | Synthetic facilities | Synthetic route IDs |', '| --- | --- | --- | ---: | ---: | ---: | --- |']
for c in company_rows:
    lines.append('| '+' | '.join(str(c[k]).replace('|','\\|') for k in ['id','name','sector','supplierCount','customerCount','facilityCount'])+' | '+', '.join(c['routeIds'])+' |')
lines+=['','Full per-company field states and counts are in `audit.json`. Counts of assumed commercial weights include both incoming and outgoing edges and must not be summed across companies as distinct relationships.']
(OUT/'COMPANIES.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
summary=['# Quantified installed-data audit','', '| Metric | Numerator / denominator | Coverage | Meaning |','| --- | ---: | ---: | --- |']
for m in metrics: summary.append(f"| {m['metric']} | {m['numerator']} / {m['denominator']} | {m['percent']}% | {m['basis']} |")
summary+=['', '## Missing evidence by record category','']
for category, values in missing.items():
    if category=='declaredMissingFields': continue
    summary+=['### '+category,'','| Missing field or evidence | Record count |','| --- | ---: |']+[f'| {k} | {v} |' for k,v in values.items()]+['']
(OUT/'COUNTS.md').write_text('\n'.join(summary)+'\n',encoding='utf-8')
print(json.dumps({'counts':audit['counts'],'checks':checks,'runtimeMatches':runtime.get('datasetMatchesInstalled'), 'companyStateTotals':audit['companyFieldStates'], 'projectionProducts':audit['projectionProductsInstalled']},indent=2))
assert all(checks.values()), 'Audit integrity/parity check failed; see audit.json'
assert all(r['matchesDownloads'] is not False for r in inventory), 'Supplied Downloads copy differs'
if runtime['reachable']: assert runtime['datasetMatchesInstalled'], 'Running API serves a different dataset'
