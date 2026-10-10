import { writeFileSync } from 'node:fs';
const version = 'synthetic-1.0.0';
const meta = { provenance: 'synthetic', evidenceIds: ['demo:evidence'], missingFields: [], datasetVersion: version };
const company = (key, name, ticker) => ({ ...meta, id: `demo:${key}`, externalId: null, name, ticker, exchange: 'DEMO', sectorId: 'demo:sector', countryOfRegistration: null, roles: key === 'delta' ? ['supplier', 'company'] : ['company'] });
const edge = (key, from, to, weight, supplyItemIds = []) => ({ ...meta, id: `demo:${key}`, supplierCompanyId: `demo:${from}`, customerCompanyId: `demo:${to}`, dependencyWeight: weight, weightBasis: 'assumed', substitutability: null, supplyItemIds, status: 'synthetic', currentAsOf: null });
const event = (key, targets) => ({ ...meta, id: `demo:${key}`, hazardType: 'heat', geographicTargets: [], affectedEntityIds: targets, intensity: 0.8, intensityBasis: 'synthetic assumption', validStart: '2026-10-09', validEnd: '2026-10-15', fetchedAt: null, mode: 'demo', source: 'Stored synthetic event', model: null });
const dataset = {
  schemaVersion: '1.0.0', datasetVersion: version,
  companies: [company('delta','Delta Components','DELTA'),company('aster','Aster Motors','ASTER'),company('beacon','Beacon Logistics','BEACON'),company('cedar','Cedar Retail','CEDAR'),company('evergreen','Evergreen Services','EVERGREEN')],
  regions: [{ ...meta, id:'demo:region', name:'Illustrative manufacturing region', countryISO3:null, geographyLevel:'synthetic', providerGeographyId:null, boundary:null, centroid:null }],
  facilities: [{ ...meta, id:'demo:facility', companyId:'demo:delta', name:'Delta synthetic facility', facilityType:'factory', regionId:'demo:region', latitude:20, longitude:78, locationPrecision:'illustrative', operatingRelationship:'operator', operationalShare:1, vulnerabilityByHazard:{heat:0.75} }],
  routes: [{ ...meta, id:'demo:route', name:'Synthetic freight route', mode:'freight', waypointIds:['demo:waypoint'], geometry:null, regionIds:['demo:region'], operatingStatus:'synthetic', vulnerabilityByHazard:{heat:0.6} }],
  waypoints:[{ ...meta, id:'demo:waypoint', regionId:'demo:region', coordinates:null, role:'illustrative freight waypoint' }],
  routeUsage:[{ ...meta, id:'demo:usage', companyId:'demo:delta', routeId:'demo:route', shipmentShare:0.4, substitutability:0 }],
  commodities:[{ ...meta, id:'demo:components', name:'Electronic components', category:'synthetic supply item' }],
  supplyItems:[{ ...meta, id:'demo:item', supplierId:'demo:delta', customerId:'demo:aster', commodityId:'demo:components', facilityIds:['demo:facility'], routeIds:['demo:route'] }],
  commercialEdges:[edge('delta-aster','delta','aster',0.6,['demo:item']),edge('aster-beacon','aster','beacon',0.5),edge('beacon-cedar','beacon','cedar',0.5)],
  evidence:[{ id:'demo:evidence', sourceName:'PRD section 9 synthetic reference', url:null, retrievedAt:null, documentDate:'2026-10-09', claim:'Fictional operational relationships and modeling assumptions; no real company or forecast claims.', entityIds:[], reportedOrVerifiedStatus:'synthetic' }],
  events:[event('facility-event',['demo:facility']),event('route-event',['demo:route'])],
};
const holdings = ['aster','beacon','cedar','evergreen'].map((c,i) => ({id:`demo:holding-${c}`,portfolioId:'demo:portfolio',companyId:`demo:${c}`,originalInputName:dataset.companies.find(x=>x.id===`demo:${c}`).name,amount:[4000000,3000000,2000000,1000000][i],currency:'INR',matchingStatus:'matched',exclusionReason:null}));
const scenario = { id:'demo:scenario', mode:'demo', eventIds:['demo:facility-event'], maxCommercialHops:3, transmissionMultiplier:0.7, assumptionOverrides:[], futureProjectionQuery:null, modelVersion:'demo-1.0.0', datasetVersion:version };
writeFileSync(new URL('../src/fixtures/reference.json',import.meta.url), JSON.stringify({dataset,holdings,scenario},null,2)+'\n');
