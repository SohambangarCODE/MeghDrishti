import { z } from 'zod';

export const SCHEMA_VERSION = '1.0.0';
const id = z.string().min(1);
const fraction = z.number().finite().min(0).max(1);
const nullableFraction = fraction.nullable();
const meta = {
  provenance: z.enum(['synthetic', 'dataset_reported', 'sourced', 'assumed', 'unknown']),
  evidenceIds: z.array(id), missingFields: z.array(id), datasetVersion: id,
};
export const Company = z.object({ ...meta, id, externalId: id.nullable(), name: id,
  ticker: id.nullable(), exchange: id.nullable(), sectorId: id,
  countryOfRegistration: id.nullable(), roles: z.array(id) });
export const Region = z.object({ ...meta, id, name: id, countryISO3: id.nullable(),
  geographyLevel: id, providerGeographyId: id.nullable(), boundary: z.unknown().nullable(),
  centroid: z.tuple([z.number(), z.number()]).nullable() });
export const Facility = z.object({ ...meta, id, companyId: id, name: id, facilityType: id,
  regionId: id.nullable(), latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(), locationPrecision: id,
  operatingRelationship: id, operationalShare: nullableFraction,
  vulnerabilityByHazard: z.record(z.string(), nullableFraction).nullable() });
export const Route = z.object({ ...meta, id, name: id, mode: id, waypointIds: z.array(id),
  geometry: z.unknown().nullable(), regionIds: z.array(id), operatingStatus: id.nullable(),
  vulnerabilityByHazard: z.record(z.string(), nullableFraction).nullable() });
export const Waypoint = z.object({ ...meta, id, regionId: id.nullable(),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]).nullable(), role: id });
export const RouteUsage = z.object({ ...meta, id, companyId: id, routeId: id,
  shipmentShare: nullableFraction, substitutability: nullableFraction });
export const Commodity = z.object({ ...meta, id, name: id, category: id.nullable() });
export const SupplyItem = z.object({ ...meta, id, supplierId: id, customerId: id,
  commodityId: id.nullable(), facilityIds: z.array(id), routeIds: z.array(id) });
export const CommercialEdge = z.object({ ...meta, id, supplierCompanyId: id, customerCompanyId: id,
  dependencyWeight: nullableFraction, weightBasis: z.enum(['measured', 'assumed']),
  substitutability: nullableFraction, supplyItemIds: z.array(id), status: id.nullable(), currentAsOf: id.nullable() });
export const Evidence = z.object({ id, sourceName: id, url: z.string().url().nullable().refine(v => v === null || /^https?:\/\//i.test(v), 'Only HTTP(S) evidence links'),
  retrievedAt: id.nullable(), documentDate: id.nullable(), claim: id, entityIds: z.array(id), reportedOrVerifiedStatus: id });
export const Event = z.object({ ...meta, id, hazardType: id, geographicTargets: z.array(id), affectedEntityIds: z.array(id),
  intensity: nullableFraction, intensityBasis: id, validStart: id, validEnd: id,
  fetchedAt: id.nullable(), mode: z.literal('demo'), source: id, model: id.nullable() });
export const Holding = z.object({ id, portfolioId: id, companyId: id.nullable(), originalInputName: id,
  amount: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER), currency: z.literal('INR'),
  matchingStatus: z.enum(['matched', 'unmatched', 'ambiguous', 'excluded']), exclusionReason: id.nullable() })
  .refine(h => h.matchingStatus !== 'matched' || h.companyId !== null, 'Matched holding needs a company')
  .refine(h => h.matchingStatus !== 'excluded' || h.exclusionReason !== null, 'Exclusion needs a reason');
export const Overlay = z.object({ targetId: id,
  field: z.enum(['operationalShare', 'shipmentShare', 'substitutability', 'dependencyWeight', 'vulnerability']),
  hazardType: id.nullable().optional(), value: fraction, rationale: id, provenance: z.literal('assumed') });
export const Scenario = z.object({ id, mode: z.literal('demo'), eventIds: z.array(id).min(1),
  maxCommercialHops: z.number().int().min(1).max(3), transmissionMultiplier: fraction,
  assumptionOverrides: z.array(Overlay), futureProjectionQuery: z.null(), modelVersion: id, datasetVersion: id,
  eventOverrides: z.record(z.string(), fraction).default({}) });
export const Dataset = z.object({ schemaVersion: z.literal(SCHEMA_VERSION), datasetVersion: id,
  companies: z.array(Company), regions: z.array(Region), facilities: z.array(Facility),
  routes: z.array(Route), waypoints: z.array(Waypoint), routeUsage: z.array(RouteUsage),
  commodities: z.array(Commodity), supplyItems: z.array(SupplyItem), commercialEdges: z.array(CommercialEdge),
  evidence: z.array(Evidence), events: z.array(Event) });

export function validateDataset(input) {
  const d = Dataset.parse(input);
  const all = Object.values(d).filter(Array.isArray).flat();
  const ids = new Set();
  for (const r of all) {
    if (ids.has(r.id)) throw new Error(`Duplicate record ID: ${r.id}`);
    ids.add(r.id);
    if (r.datasetVersion && r.datasetVersion !== d.datasetVersion) throw new Error(`Record version mismatch: ${r.id}`);
  }
  const ref = (list, key) => { if (key !== null && !list.some(r => r.id === key)) throw new Error(`Broken reference: ${key}`); };
  for (const r of all) for (const e of r.evidenceIds ?? []) ref(d.evidence, e);
  for (const f of d.facilities) {
    ref(d.companies, f.companyId); ref(d.regions, f.regionId);
    if ((f.latitude === null) !== (f.longitude === null)) throw new Error(`Incomplete coordinate pair: ${f.id}`);
  }
  for (const r of d.routes) { r.regionIds.forEach(k => ref(d.regions, k)); r.waypointIds.forEach(k => ref(d.waypoints, k)); }
  for (const w of d.waypoints) ref(d.regions, w.regionId);
  for (const u of d.routeUsage) { ref(d.companies, u.companyId); ref(d.routes, u.routeId); }
  for (const e of d.commercialEdges) {
    ref(d.companies, e.supplierCompanyId); ref(d.companies, e.customerCompanyId);
    e.supplyItemIds.forEach(k => ref(d.supplyItems, k));
    for (const k of e.supplyItemIds) {
      const item = d.supplyItems.find(s => s.id === k);
      if (item.supplierId !== e.supplierCompanyId || item.customerId !== e.customerCompanyId) throw new Error(`Supply-item direction mismatch: ${k}`);
    }
  }
  for (const s of d.supplyItems) {
    ref(d.companies, s.supplierId); ref(d.companies, s.customerId); ref(d.commodities, s.commodityId);
    s.facilityIds.forEach(k => ref(d.facilities, k)); s.routeIds.forEach(k => ref(d.routes, k));
  }
  for (const e of d.events) {
    e.geographicTargets.forEach(k => ref(d.regions, k));
    e.affectedEntityIds.forEach(k => ref([...d.facilities, ...d.routes, ...d.waypoints], k));
  }
  for (const c of d.companies) {
    const facilities = d.facilities.filter(f => f.companyId === c.id);
    if (facilities.reduce((sum, f) => sum + (f.operationalShare ?? 0), 0) > 1 + 1e-12) throw new Error(`Operational shares exceed one: ${c.id}`);
    const usages = d.routeUsage.filter(u => u.companyId === c.id);
    if (new Set(usages.map(u => u.routeId)).size !== usages.length) throw new Error(`Duplicate route mapping: ${c.id}`);
    if (usages.reduce((sum, u) => sum + (u.shipmentShare ?? 0), 0) > 1 + 1e-12) throw new Error(`Shipment shares exceed one: ${c.id}`);
  }
  return d;
}
