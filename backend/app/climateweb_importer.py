"""Adapter for the inspected corrected ClimateWeb package; no source regeneration."""
import csv
import hashlib
import json
import os
from copy import deepcopy
from pathlib import Path
from .models import Dataset, Holding, Scenario
from .engine import DEFAULTS


def read_source(json_path=None, companies_path=None, relations_path=None):
    if bool(json_path) == bool(companies_path or relations_path):
        raise ValueError('Choose JSON OR the complete CSV pair')
    if json_path:
        return json.loads(Path(json_path).read_text(encoding='utf-8-sig'))
    if not companies_path or not relations_path:
        raise ValueError('Both CSV files are required')
    def rows(path):
        with Path(path).open(encoding='utf-8-sig', newline='') as f:
            result = list(csv.DictReader(f))
        for row in result:
            for key, value in list(row.items()):
                if key.endswith('_json') and value:
                    parsed = json.loads(value)
                    row[key[:-5] if key != 'assumptions_json' else key] = parsed
        return result
    companies, relations = rows(companies_path), rows(relations_path)
    configurations = [c['demo_configuration'] for c in companies if c.get('demo_configuration_json', '').strip()]
    if len(configurations) != 1:
        raise ValueError('Exactly one global demo_configuration_json is required across all company rows')
    for row in relations:
        row['supplier'], row['customer'] = row['supplier_id'], row['customer_id']
    return {'companies': companies, 'relations': relations, 'demo_operational_layer': configurations[0],
            'attribution': 'Sectivia (https://sectivia.com), CC BY 4.0', 'url': 'https://sectivia.com/dataset/'}


def fraction(value, name):
    if value is None: raise ValueError(f'Missing assumed input: {name}')
    n = float(value)
    if not 0 <= n <= 1: raise ValueError(f'Invalid fraction: {name}')
    return n


def adapt(source, accept_synthetic=False):
    if not accept_synthetic: raise ValueError('Explicit synthetic demo acceptance required')
    g = source['demo_operational_layer']
    if g['mode'] != 'synthetic_operational_demo': raise ValueError('Unsupported data state')
    params = g['model_parameters']
    if params['commercial_weight_field'] != 'effective_dependency_weight_assumed' or not params['replacement_applied_once']:
        raise ValueError('Unsupported commercial weight semantics')
    if params['money_currency'] != 'INR' or params['money_unit'] != 'rupee': raise ValueError('Expected INR rupees')
    version = 'climateweb:' + g['dataset_revision']
    evidence_id = 'climateweb:evidence:reported'
    synthetic_id = 'climateweb:evidence:assumptions'
    def meta(provenance='synthetic', missing=None, fields=None):
        return dict(provenance=provenance, evidenceIds=[evidence_id if provenance == 'dataset_reported' else synthetic_id],
                    missingFields=missing or [], datasetVersion=version, sourceFields=fields)
    d = dict(schemaVersion='1.0.0', datasetVersion=version, dataState=g['mode'],
             sourceMetadata={'attribution':source.get('attribution'), 'datasetRevision':g['dataset_revision'],
                             'suppliedModelVersion':params['model_version'], 'generationTime':g['generated_at'],
                             'commercialWeightPolicy':'effective weight includes replacement exactly once',
                             'regionEventPolicy':'region heat targets synthetic facilities; route disruption uses explicit corridors'},
             **{k:[] for k in ['companies','regions','facilities','routes','waypoints','routeUsage','commodities','supplyItems','commercialEdges','evidence','events']})
    for c in source['companies']:
        if c.get('company_id_resolved', c['id']) != c['id']: raise ValueError('Company ID mismatch')
        d['companies'].append(dict(**meta('dataset_reported', c.get('missing_fields', []), {'country':c.get('country'),'segmentId':g['import_mapping_metadata']['segment_label_to_id'].get(c.get('segment'),c.get('segment'))}),
            id=c['id'], externalId=c['id'], name=c['name'], ticker=c.get('ticker') or None, exchange=c.get('exchange') or None,
            sectorId=c['sector'], countryOfRegistration=c.get('country') or None, roles=['company']))
        for f in c['simulation_assets']:
            if f['company_id'] != c['id'] or f['parameter_status'] != 'synthetic_demo': raise ValueError('Invalid facility mapping/status')
            d['facilities'].append(dict(**meta(missing=f['missing_fields'], fields={'operational_share':f['operational_share'],
                'operational_share_assumed':f['operational_share_assumed'],'parameter_status':f['parameter_status']}),
                id=f['asset_id'], companyId=c['id'], name=f['asset_name'], facilityType=f['asset_type'], regionId=f['region_id'],
                latitude=f['latitude'], longitude=f['longitude'], locationPrecision=f['coordinate_precision'],
                operatingRelationship=f['operator_relationship'], operationalShare=fraction(f['operational_share_assumed'],'operational share'),
                vulnerabilityByHazard={'heat':fraction(f['heat_vulnerability_assumed'],'heat vulnerability')}))
        for r in c['simulation_routes']:
            if r['company_id'] != c['id'] or r['parameter_status'] != 'synthetic_demo': raise ValueError('Invalid route mapping/status')
            d['routeUsage'].append(dict(**meta(missing=r['missing_fields'], fields={'dependence_share':r['dependence_share'],
                'route_shipment_share_assumed':r['route_shipment_share_assumed'],'parameter_status':r['parameter_status']}),
                id=c['id']+'::'+r['route_id'], companyId=c['id'], routeId=r['route_id'],
                shipmentShare=fraction(r['route_shipment_share_assumed'],'shipment share'),
                substitutability=fraction(r['replacement_fraction_assumed'],'route replacement'),
                vulnerabilityByHazard={'route_disruption':fraction(r['route_vulnerability_assumed'],'route vulnerability')}))
    for r in g['regions']:
        box=r['geographic_scope']['bbox']
        if len(box)!=4 or not (-180<=box[0]<box[2]<=180 and -90<=box[1]<box[3]<=90): raise ValueError('Invalid region bounds')
        d['regions'].append(dict(**meta(), id=r['region_id'], name=r['region_name'], countryISO3='USA', geographyLevel='synthetic',
            providerGeographyId=None, boundary=r['geographic_scope'], centroid=[(box[0]+box[2])/2,(box[1]+box[3])/2]))
    for r in g['routes']:
        geometry=r['geometry_geojson']
        if geometry['type']!='LineString' or len(geometry['coordinates'])<2: raise ValueError('Invalid route geometry')
        for point in geometry['coordinates']:
            if len(point)!=2 or not (-180<=point[0]<=180 and -90<=point[1]<=90): raise ValueError('Invalid route coordinate')
        d['routes'].append(dict(**meta(missing=r['missing_fields']),id=r['route_id'],name=r['route_name'],mode=r['transport_mode'],
            waypointIds=[],geometry=geometry,regionIds=[r['origin']['region_id'],r['destination']['region_id']],
            operatingStatus='synthetic_demo',vulnerabilityByHazard=None))
    for c in g['commodity_context']['definitions']:
        d['commodities'].append(dict(**meta(),id=c['commodity_id'],name=c['commodity_name'],category='synthetic_context_only'))
    for e in source['relations']:
        if e['relationship_provenance']!='dataset_reported' or e['simulation_parameter_status']!='synthetic_demo': raise ValueError('Invalid relationship provenance')
        weight=fraction(e['effective_dependency_weight_assumed'],'effective dependency weight')
        base=fraction(e['dependency_weight_assumed'],'dependency weight');replacement=fraction(e['replacement_fraction_assumed'],'replacement')
        if abs(weight-base*(1-replacement))>1e-10: raise ValueError('Effective weight mismatch')
        item_id=e['demo_relationship_id']+'::context'
        d['supplyItems'].append(dict(**meta(),id=item_id,supplierId=e['supplier'],customerId=e['customer'],
            commodityId=e['demo_commodity_id'],facilityIds=[],routeIds=[]))
        d['commercialEdges'].append(dict(**meta('dataset_reported',e.get('demo_missing_fields',[]),
            {'dependency_weight_assumed':base,'replacement_fraction_assumed':replacement,'effective_dependency_weight_assumed':weight,
             'simulation_parameter_status':'synthetic_demo'}),id=e['demo_relationship_id'],supplierCompanyId=e['supplier'],customerCompanyId=e['customer'],
            dependencyWeight=weight,weightBasis='assumed',substitutability=None,supplyItemIds=[item_id],status='dataset_reported',currentAsOf=None))
    for e in g['scenario_fixtures']:
        targets=[f['id'] for f in d['facilities'] if f['regionId']==e['target_id']] if e['target_type']=='region' else [e['target_id']]
        d['events'].append(dict(**meta(fields={'name':e['name'],'targetType':e['target_type'],'targetId':e['target_id']}),id=e['id'],
            hazardType=e['hazard_type'],geographicTargets=[],affectedEntityIds=targets,intensity=fraction(e['intensity'],'intensity'),
            intensityBasis=e['intensity_basis'],validStart=g['generated_at'],validEnd=g['generated_at'],fetchedAt=None,mode='demo',
            source='Supplied synthetic scenario fixture',model=None))
    d['evidence']=[dict(id=evidence_id,sourceName='Sectivia supplied relationship dataset',url=source.get('url'),retrievedAt=None,
        documentDate=None,claim='Real company identities and dataset-reported relationships; not independently verified contracts.',entityIds=[],reportedOrVerifiedStatus='dataset_reported'),
        dict(id=synthetic_id,sourceName='ClimateWeb synthetic operational enrichment',url=None,retrievedAt=None,documentDate=None,
        claim='All operating sites, coordinates, corridors, shares, vulnerabilities and commodity roles are synthetic. Measured operational and dependence shares remain null.',entityIds=[],reportedOrVerifiedStatus='synthetic')]
    dataset=Dataset.model_validate(d).model_dump()
    portfolio=g['example_portfolio'];companies={c['id']:c for c in d['companies']}
    holdings=[Holding.model_validate(dict(id=portfolio['id']+'::'+h['company_id'],portfolioId=portfolio['id'],companyId=h['company_id'],
        originalInputName=companies[h['company_id']]['name'],amount=h['amount'],currency=h['currency'],matchingStatus='matched',exclusionReason=None)).model_dump() for h in portfolio['holdings']]
    scenario=Scenario.model_validate(dict(id=g['example_scenario_id'],mode='demo',eventIds=[g['example_scenario_id']],maxCommercialHops=params['maximum_commercial_hops'],
        transmissionMultiplier=params['transmission_multiplier'],assumptionOverrides=[],futureProjectionQuery=None,modelVersion=DEFAULTS['modelVersion'],datasetVersion=version)).model_dump()
    return {'dataset':dataset,'holdings':holdings,'scenario':scenario,'referenceCalculations':deepcopy(g['reference_calculations']),
            'scenarioFixtures':deepcopy(g['scenario_fixtures']),'exampleSourceChain':g['example_source_chain']}


def stage_and_promote(source, output_dir, accept_synthetic=False):
    """Validate before atomic immutable-version publication; invalid input cannot replace active."""
    value=adapt(source,accept_synthetic)
    root=Path(output_dir);root.mkdir(parents=True,exist_ok=True)
    payload=json.dumps(value,sort_keys=True,separators=(',',':')).encode()
    digest=hashlib.sha256(payload).hexdigest();version_path=root/(digest+'.json')
    if not version_path.exists():
        temp=root/(digest+'.tmp');temp.write_bytes(payload);os.replace(temp,version_path)
    pointer={'datasetVersion':value['dataset']['datasetVersion'],'file':version_path.name,'sha256':digest,
             'counts':{k:len(value['dataset'][k]) for k in ['companies','commercialEdges','facilities','routes','routeUsage']}}
    temporary=root/'active.tmp';temporary.write_text(json.dumps(pointer,indent=2),encoding='utf-8');os.replace(temporary,root/'active.json')
    return pointer
