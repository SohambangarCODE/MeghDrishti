"""Read-only evidence completeness; never substitutes simulation availability for evidence."""
import hashlib
import json
import math
import struct
from pathlib import Path
from .models import Dataset

METRICS = json.loads((Path(__file__).parents[2] / 'shared/coverage-metrics.json').read_text())
GROUPS = ['companies', 'commercialEdges', 'facilities', 'routes', 'routeUsage', 'regions']

def canonical(value):
    """Typed JSON with IEEE-754 numbers makes Python and browser hashes identical."""
    if value is None: return ['null']
    if isinstance(value, bool): return ['boolean', value]
    if isinstance(value, (int, float)):
        if not math.isfinite(value): raise ValueError('Coverage requires finite values')
        return ['number', struct.pack('>d', float(value) if value != 0 else 0.0).hex()]
    if isinstance(value, str): return ['string', value]
    if isinstance(value, list): return ['array', [canonical(v) for v in value]]
    if isinstance(value, dict): return ['object', [[k, canonical(value[k])] for k in sorted(value, key=lambda k: k.encode('utf-16-be'))]]
    raise ValueError('Unsupported coverage value')

def coverage_hash(dataset):
    text = json.dumps(canonical(dataset), ensure_ascii=False, separators=(',', ':'), allow_nan=False)
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)

def fields(record): return record.get('sourceFields') or {}

def synthetic(record):
    sf = fields(record)
    return record['provenance'] == 'synthetic' or sf.get('parameter_status') == 'synthetic_demo' or sf.get('simulation_parameter_status') == 'synthetic_demo' or sf.get('is_synthetic') is True

def coordinates(record):
    return number(record['latitude']) and number(record['longitude']) and abs(record['latitude']) <= 90 and abs(record['longitude']) <= 180

def geometry(record):
    g = record.get('geometry')
    return isinstance(g, dict) and g.get('type') == 'LineString' and isinstance(g.get('coordinates'), list) and len(g['coordinates']) >= 2 and all(
        isinstance(p, list) and len(p) == 2 and number(p[0]) and number(p[1]) and abs(p[0]) <= 180 and abs(p[1]) <= 90 for p in g['coordinates'])

def completeness(dataset):
    # Validation is observational: hash and aggregate the original, never normalized defaults.
    Dataset.model_validate(dataset)
    evidence = {e['id']: e for e in dataset['evidence']}
    def supports(record, claim):
        sf = fields(record)
        claims = sf.get('fieldEvidence')
        if record['provenance'] != 'sourced' or synthetic(record) or not isinstance(claims, dict): return False
        refs = claims.get(claim)
        if not isinstance(refs, list): return False
        for key in refs:
            if not isinstance(key, str): continue
            e = evidence.get(key)
            if e and key in record['evidenceIds'] and record['id'] in e['entityIds'] and e['reportedOrVerifiedStatus'] in ('sourced', 'verified') and e['url'] and e['claim'].strip(): return True
        return False
    def sourced_site(f): return coordinates(f) and supports(f, 'operatingCoordinates')
    def mapped(r): return bool(r['providerGeographyId']) and r['geographyLevel'] != 'synthetic' and supports(r, 'providerGeographyId')
    def measured_share(f):
        sf = fields(f)
        value = sf['operational_share'] if 'operational_share' in sf else f['operationalShare']
        return number(value) and 0 <= value <= 1 and supports(f, 'operationalShare')
    def measured_weight(e): return e['weightBasis'] == 'measured' and number(e['dependencyWeight']) and supports(e, 'dependencyWeight')
    regions, routes = {r['id']: r for r in dataset['regions']}, {r['id']: r for r in dataset['routes']}
    companies = []
    for c in dataset['companies']:
        sites = [f for f in dataset['facilities'] if f['companyId'] == c['id']]
        usages = [u for u in dataset['routeUsage'] if u['companyId'] == c['id']]
        incoming = [e for e in dataset['commercialEdges'] if e['customerCompanyId'] == c['id']]
        outgoing = [e for e in dataset['commercialEdges'] if e['supplierCompanyId'] == c['id']]
        sourced = sum(sourced_site(f) for f in sites)
        companies.append({'id': c['id'], 'name': c['name'], 'supplierCount': len(incoming), 'customerCount': len(outgoing),
            'facilityCount': len(sites), 'routeUsageCount': len(usages), 'sourcedCoordinateCount': sourced,
            'syntheticOnlySites': bool(sites) and all(synthetic(f) for f in sites),
            'syntheticRouteGeometry': any(synthetic(u) and synthetic(routes[u['routeId']]) and geometry(routes[u['routeId']]) for u in usages),
            'sourcedRouteGeometry': any(supports(u, 'routeUsage') and supports(routes[u['routeId']], 'routeGeometry') and geometry(routes[u['routeId']]) for u in usages),
            'projectionMapping': any(sourced_site(f) and f['regionId'] in regions and mapped(regions[f['regionId']]) for f in sites),
            'operatingEvidenceState': 'Sourced' if sourced else 'Unknown',
            'measuredDependenceState': 'Sourced' if incoming and all(measured_weight(e) for e in incoming) else 'Unknown'})
    edges, facilities = dataset['commercialEdges'], dataset['facilities']
    counts = {k: len(dataset[k]) for k in GROUPS}
    values = {
        'reportedCompanies': sum(c['provenance'] == 'dataset_reported' for c in dataset['companies']),
        'reportedRelationships': sum(e['provenance'] == 'dataset_reported' for e in edges),
        'linkedCompanies': sum(c['supplierCount'] + c['customerCount'] > 0 for c in companies),
        'sourcedCoordinates': sum(c['sourcedCoordinateCount'] > 0 for c in companies),
        'syntheticOnlySites': sum(c['syntheticOnlySites'] for c in companies),
        'missingOperatingEvidence': sum(c['sourcedCoordinateCount'] == 0 for c in companies),
        'measuredOperationalShares': sum(measured_share(f) for f in facilities),
        'assumedOperationalShares': sum(number(f['operationalShare']) and (f['provenance'] in ('synthetic', 'assumed') or number(fields(f).get('operational_share_assumed'))) for f in facilities),
        'measuredWeights': sum(measured_weight(e) for e in edges),
        'assumedWeights': sum(e['weightBasis'] == 'assumed' and number(e['dependencyWeight']) for e in edges),
        'missingDemoWeights': sum(not number(e['dependencyWeight']) for e in edges),
        'unknownRealDependence': sum(not measured_weight(e) for e in edges),
        'syntheticGeometry': sum(c['syntheticRouteGeometry'] for c in companies),
        'sourcedGeometry': sum(c['sourcedRouteGeometry'] for c in companies),
        'projectionCompanies': sum(c['projectionMapping'] for c in companies),
        'projectionRegions': sum(mapped(r) for r in dataset['regions'])}
    metrics = [{'id': key, 'label': label, 'numerator': values[key], 'denominator': counts[group], 'population': group,
                'unit': 'records', 'provenanceScope': scope, 'definition': definition} for key, label, group, scope, definition in METRICS]
    compatibility = {k: {'status': 'eligible' if values[m] else 'unavailable', 'reason': reason} for k, m, reason in [
        ('companyWeather', 'sourcedCoordinates', 'Requires claim-specific sourced operating coordinates. Provider connectivity is not checked.'),
        ('futureProjections', 'projectionCompanies', 'Requires evidenced operating geography mapping. Compatible product installation and provider connectivity are not checked.')]}
    return {'schemaVersion': '1.0.0', 'status': 'available', 'datasetVersion': dataset['datasetVersion'], 'contentHash': coverage_hash(dataset),
        'hashAlgorithm': 'coverage-canonical-v1-sha256', 'counts': counts, 'metrics': metrics, 'companies': companies, 'compatibility': compatibility,
        'limitations': ['Installed-record completeness is not completeness of actual operations, suppliers or shipments.',
                       'Sourced means identifiable claim-specific evidence, not independent verification or provider connectivity.',
                       'Fields without explicit sourceFields.fieldEvidence links remain Unknown; generic attribution is insufficient.',
                       'Missing evidence and absent affected paths are not zero risk. Scenario direct-known counts are not evidence coverage.']}
