"""Authoritative NetworkX engine. No I/O or presentation dependencies."""
from copy import deepcopy
from pathlib import Path
import hashlib
import json
import math
import networkx as nx
from .models import Dataset, Holding, Scenario

DEFAULTS = json.loads((Path(__file__).parents[1] / 'config/model-defaults.json').read_text())

def normalize_holdings(rows, companies):
    parsed = [Holding.model_validate(r).model_dump() for r in rows]
    if not parsed: raise ValueError('Portfolio is empty')
    if len({h['id'] for h in parsed}) != len(parsed): raise ValueError('Duplicate holding record ID')
    if len({h['portfolioId'] for h in parsed}) != 1: raise ValueError('Use one portfolio per analysis')
    known = {c['id'] for c in companies}
    merged = {}
    for h in parsed:
        if h['companyId'] is not None and h['companyId'] not in known: raise ValueError(f"Unsupported company ID: {h['companyId']}")
        key = h['companyId'] if h['matchingStatus'] == 'matched' else h['id']
        if key in merged: merged[key]['amount'] += h['amount']
        else: merged[key] = deepcopy(h)
    if sum(h['amount'] for h in merged.values()) > 9007199254740991: raise ValueError('Portfolio amount exceeds safe numeric bound')
    return list(merged.values())

def apply_overlays(dataset, scenario):
    d = deepcopy(dataset)
    allowed = {'facilities': {'operationalShare','vulnerability'}, 'routes': {'vulnerability'},
               'routeUsage': {'shipmentShare','substitutability'}, 'commercialEdges': {'dependencyWeight'}}
    seen = set()
    for o in scenario['assumptionOverrides']:
        key = (o['targetId'], o['field'], o.get('hazardType'))
        if key in seen: raise ValueError('Duplicate assumption overlay')
        seen.add(key)
        found = False
        for group, fields in allowed.items():
            for record in d[group]:
                if record['id'] != o['targetId']: continue
                if o['field'] not in fields: raise ValueError('Overlay field does not apply to entity')
                if o['field'] == 'vulnerability':
                    if not o.get('hazardType'): raise ValueError('Vulnerability overlay requires hazardType')
                    record['vulnerabilityByHazard'] = record['vulnerabilityByHazard'] or {}
                    record['vulnerabilityByHazard'][o['hazardType']] = o['value']
                else: record[o['field']] = o['value']
                record['provenance'] = 'assumed'
                found = True
        if not found: raise ValueError('Unknown overlay target')
    event_ids = {e['id'] for e in d['events']}
    for key, value in scenario.get('eventOverrides', {}).items():
        if key not in event_ids or key not in scenario['eventIds']: raise ValueError('Unknown or unselected event override')
        event = next(e for e in d['events'] if e['id'] == key)
        event['intensity'] = value
        event['intensityBasis'] = 'explicit hypothetical assumption'
        event['provenance'] = 'assumed'
    return Dataset.model_validate(d).model_dump()

def simulate(dataset, holdings, scenario, max_paths=None):
    raw = Dataset.model_validate(dataset).model_dump()
    s = Scenario.model_validate(scenario).model_dump()
    if s['datasetVersion'] != raw['datasetVersion'] or s['modelVersion'] != DEFAULTS['modelVersion']:
        raise ValueError('Dataset/model version mismatch')
    if len(raw['companies']) > DEFAULTS['maxCompanies'] or len(raw['commercialEdges']) > DEFAULTS['maxEdges']:
        raise ValueError('Dataset exceeds explicit engine bounds')
    d = apply_overlays(raw, s)
    portfolio = normalize_holdings(holdings, d['companies'])
    events = [e for e in d['events'] if e['id'] in s['eventIds']]
    if len(events) != len(set(s['eventIds'])): raise ValueError('Unknown scenario event')
    graph = nx.MultiDiGraph()
    graph.add_nodes_from(c['id'] for c in d['companies'])
    for e in d['commercialEdges']:
        graph.add_edge(e['supplierCompanyId'], e['customerCompanyId'], key=e['id'], **e)
    # Only ancestors within the selected hop limit can affect a portfolio holding.
    relevant = {h['companyId'] for h in portfolio if h['matchingStatus'] == 'matched'}
    frontier = set(relevant)
    for _ in range(s['maxCommercialHops']):
        frontier = {p for n in frontier for p in graph.predecessors(n)} - relevant
        relevant.update(frontier)
    seeds = []
    warnings = []
    def seed(event, record, company, factors, kind):
        missing = [name for name, value in factors.items() if value is None]
        stress = None if missing else math.prod(factors.values())
        seeds.append({'id': f"{event['id']}|{record['id']}", 'companyId': company, 'eventId':event['id'],
                      'entityId':record['id'], 'kind':kind, 'stress':stress, 'factors':factors,
                      'missingFields':missing, 'evidenceIds':record['evidenceIds']})
    for event in events:
        targets, regions = set(event['affectedEntityIds']), set(event['geographicTargets'])
        for f in d['facilities']:
            if f['id'] not in targets and f['regionId'] not in regions: continue
            sites = [x for x in d['facilities'] if x['companyId'] == f['companyId']]
            complete = all(x['operationalShare'] is not None for x in sites) and abs(sum(x['operationalShare'] or 0 for x in sites)-1) < 1e-12
            seed(event, f, f['companyId'], {'intensity':event['intensity'],
                 'vulnerability':(f['vulnerabilityByHazard'] or {}).get(event['hazardType']),
                 'operationalShare':f['operationalShare'] if complete else None}, 'facility')
        for route in d['routes']:
            if route['id'] not in targets and not (targets.intersection(route['waypointIds']) or regions.intersection(route['regionIds'])): continue
            for usage in d['routeUsage']:
                if usage['routeId'] != route['id']: continue
                seed(event, usage, usage['companyId'], {'intensity':event['intensity'],
                     'vulnerability':(usage.get('vulnerabilityByHazard') if usage.get('vulnerabilityByHazard') is not None else (route['vulnerabilityByHazard'] or {})).get(event['hazardType']),
                     'shipmentShare':usage['shipmentShare'],
                     'remainingFraction':None if usage['substitutability'] is None else 1-usage['substitutability']}, 'route')
    paths = []
    limit = max_paths if max_paths is not None else DEFAULTS['maxPaths']
    if limit < 1: raise ValueError('Path bound must be positive')
    truncated = False
    def visit(seed_record, nodes, edges, stress, missing):
        nonlocal truncated
        if len(paths) >= limit:
            truncated = True
            return
        path_id = json.dumps([seed_record['id'], *edges], separators=(',', ':'))
        paths.append({'id':path_id, 'seedId':seed_record['id'], 'companyIds':nodes, 'edgeIds':edges,
                      'commercialDepth':len(edges), 'stress':stress, 'missingFields':missing,
                      'evidenceIds':sorted(set(seed_record['evidenceIds'] + [eid for edge in edges for eid in next(e for e in d['commercialEdges'] if e['id']==edge)['evidenceIds']]))})
        if len(edges) == s['maxCommercialHops']: return
        for _, customer, edge_id, e in sorted(graph.out_edges(nodes[-1], keys=True, data=True), key=lambda x:x[2]):
            if customer in nodes or customer not in relevant: continue
            weight = e['dependencyWeight']
            next_missing = missing + ([f'{edge_id}.dependencyWeight'] if weight is None else [])
            value = None if stress is None or weight is None else stress * weight * s['transmissionMultiplier']
            visit(seed_record, nodes+[customer], edges+[edge_id], value, next_missing)
            if truncated: return
    for seed_record in sorted(seeds, key=lambda x:x['id']):
        if seed_record['companyId'] in relevant:
            visit(seed_record, [seed_record['companyId']], [], seed_record['stress'], seed_record['missingFields'])
            if truncated: break
    if truncated: warnings.append(f'Traversal truncated at {limit} paths; results are partial, not a complete maximum')
    results = []
    for h in portfolio:
        candidates = [p for p in paths if p['companyIds'][-1] == h['companyId']] if h['matchingStatus']=='matched' else []
        supported = sorted([p for p in candidates if p['stress'] is not None], key=lambda p:(-p['stress'],p['commercialDepth'],p['id']))
        best = supported[0] if supported else None
        direct_candidates = [p for p in candidates if p['commercialDepth']==0]
        # Absent own-operation coverage is never interpreted as zero.
        direct = None if not direct_candidates or any(p['stress'] is None for p in direct_candidates) else max(p['stress'] for p in direct_candidates)
        indirects = [p['stress'] for p in supported if p['commercialDepth']>0]
        missing = sorted(set(v for p in candidates for v in p['missingFields']))
        if direct is None: missing.append('directOperationalCoverage')
        stress = best['stress'] if best else None
        results.append({**h, 'directStress':direct, 'indirectStress':max(indirects) if indirects else None,
                        'totalStress':stress, 'selectedPathIds':[best['id']] if best else [],
                        'selectedCommercialDepth':best['commercialDepth'] if best else None,
                        'connected':best is not None, 'recordedPath':bool(candidates),
                        'connectedAmount':h['amount'] if best else 0,
                        'assumedWeightedExposure':h['amount']*stress if best else None,
                        'evidenceStatus':'Synthetic / assumed' if best else ('Unknown inputs' if candidates else 'No recorded affected path'),
                        'missingFields':missing})
    total = sum(h['amount'] for h in portfolio)
    mapped = sum(h['amount'] for h in portfolio if h['matchingStatus']=='matched')
    modeled = sum(r['amount'] for r in results if r['totalStress'] is not None)
    totals = {'currency':'INR', 'totalCapital':total,'mappedCapital':mapped,'unmappedCapital':total-mapped,
              'modeledCapital':modeled,'unmodeledCapital':total-modeled,
              'connectedCapital':sum(r['connectedAmount'] for r in results),
              'positiveStressConnectedCapital':sum(r['amount'] for r in results if (r['totalStress'] or 0)>0),
              'assumedWeightedExposure':sum(r['assumedWeightedExposure'] or 0 for r in results)}
    shared = []
    for c in d['companies']:
        affected = sorted({r['companyId'] for r in results if any(c['id'] in p['companyIds'][:-1] and p['companyIds'][-1]==r['companyId'] for p in paths)})
        if len(affected)>1: shared.append({'companyId':c['id'],'holdingCompanyIds':affected})
    return {'schemaVersion':'1.0.0','mode':'demo','status':'partial' if truncated else 'completed',
            'portfolioSnapshot':portfolio,'scenarioSnapshot':s,'sourceSnapshot':raw,
            'eventSnapshot':events,'holdingsResults':results,'paths':paths,'seeds':seeds,
            'totals':totals,'warnings':warnings,'sharedDependencies':shared,
            'coverage':{'holdingCount':len(results),'matchedHoldingCount':sum(h['matchingStatus']=='matched' for h in portfolio),
                        'modeledHoldingCount':sum(r['totalStress'] is not None for r in results),
                        'directKnownHoldingCount':sum(r['directStress'] is not None for r in results),
                        'truncated':truncated},
            'assumptions':deepcopy(DEFAULTS)}

def input_hash(dataset, holdings, scenario):
    content = json.dumps({'dataset':dataset,'holdings':holdings,'scenario':scenario}, sort_keys=True, separators=(',',':'), allow_nan=False)
    return hashlib.sha256(content.encode()).hexdigest()

def compare_run(run, from_id, to_id, amount):
    if from_id == to_id or not math.isfinite(amount) or amount <= 0: raise ValueError('Choose different holdings and a positive transfer')
    holdings = deepcopy(run['portfolioSnapshot'])
    source = next((h for h in holdings if h['companyId']==from_id and h['matchingStatus']=='matched'), None)
    target = next((h for h in holdings if h['companyId']==to_id and h['matchingStatus']=='matched'), None)
    if not source or not target: raise ValueError('Transfer requires two matched holdings')
    if amount > source['amount']: raise ValueError('Transfer exceeds source amount')
    source['amount'] -= amount
    target['amount'] += amount
    proposed = simulate(run['sourceSnapshot'], holdings, run['scenarioSnapshot'])
    if not math.isclose(proposed['totals']['totalCapital'],run['totals']['totalCapital'],rel_tol=0,abs_tol=1e-8): raise ValueError('Capital invariant failed')
    return {'baselineRunId':run.get('id'), 'label':'Hypothetical allocation sensitivity, not a recommendation',
            'fixedInputHash':input_hash(run['sourceSnapshot'], [], run['scenarioSnapshot']),
            'baseline':deepcopy(run), 'proposed':proposed,
            'transfer':{'fromCompanyId':from_id,'toCompanyId':to_id,'amount':amount,'currency':'INR'}}
