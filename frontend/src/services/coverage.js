import {z} from 'zod';
import {validateDataset} from '../schemas/contracts.js';
import definitions from '../../../shared/coverage-metrics.json' with {type:'json'};
const groups=['companies','commercialEdges','facilities','routes','routeUsage','regions'];
const number=v=>typeof v==='number'&&Number.isFinite(v);
const fields=r=>r.sourceFields||{};
const synthetic=r=>r.provenance==='synthetic'||fields(r).parameter_status==='synthetic_demo'||fields(r).simulation_parameter_status==='synthetic_demo'||fields(r).is_synthetic===true;
const coordinates=r=>number(r.latitude)&&number(r.longitude)&&Math.abs(r.latitude)<=90&&Math.abs(r.longitude)<=180;
const geometry=r=>r.geometry?.type==='LineString'&&Array.isArray(r.geometry.coordinates)&&r.geometry.coordinates.length>=2&&r.geometry.coordinates.every(p=>Array.isArray(p)&&p.length===2&&number(p[0])&&number(p[1])&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90);
function canonical(v){
 if(v===null)return ['null'];
 if(typeof v==='boolean')return ['boolean',v];
 if(number(v)){const buffer=new ArrayBuffer(8);new DataView(buffer).setFloat64(0,v===0?0:v);return ['number',[...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join('')];}
 if(typeof v==='string')return ['string',v];
 if(Array.isArray(v))return ['array',v.map(canonical)];
 if(v&&typeof v==='object')return ['object',Object.keys(v).sort().map(k=>[k,canonical(v[k])])];
 throw new Error('Coverage requires finite JSON values.');
}
export async function coverageHash(dataset){
 const bytes=new TextEncoder().encode(JSON.stringify(canonical(dataset)));
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function summarizeCoverage(dataset){
 // Observe the immutable original; do not fill absent snapshot fields from current data.
 validateDataset(dataset);
 const evidence=new Map(dataset.evidence.map(e=>[e.id,e]));
 const supports=(r,claim)=>{
  const sf=fields(r),refs=sf.fieldEvidence?.[claim];
  if(r.provenance!=='sourced'||synthetic(r)||!Array.isArray(refs))return false;
  return refs.some(key=>{const e=evidence.get(key);return e&&r.evidenceIds.includes(key)&&e.entityIds.includes(r.id)&&['sourced','verified'].includes(e.reportedOrVerifiedStatus)&&!!e.url&&!!e.claim.trim();});
 };
 const sourcedSite=f=>coordinates(f)&&supports(f,'operatingCoordinates');
 const mapped=r=>!!r.providerGeographyId&&r.geographyLevel!=='synthetic'&&supports(r,'providerGeographyId');
 const measuredShare=f=>{const sf=fields(f),v=Object.hasOwn(sf,'operational_share')?sf.operational_share:f.operationalShare;return number(v)&&v>=0&&v<=1&&supports(f,'operationalShare');};
 const measuredWeight=e=>e.weightBasis==='measured'&&number(e.dependencyWeight)&&supports(e,'dependencyWeight');
 const regions=new Map(dataset.regions.map(r=>[r.id,r])),routes=new Map(dataset.routes.map(r=>[r.id,r]));
 const companies=dataset.companies.map(c=>{
  const sites=dataset.facilities.filter(f=>f.companyId===c.id),usages=dataset.routeUsage.filter(u=>u.companyId===c.id),incoming=dataset.commercialEdges.filter(e=>e.customerCompanyId===c.id),outgoing=dataset.commercialEdges.filter(e=>e.supplierCompanyId===c.id),sourced=sites.filter(sourcedSite).length;
  return {id:c.id,name:c.name,supplierCount:incoming.length,customerCount:outgoing.length,facilityCount:sites.length,routeUsageCount:usages.length,sourcedCoordinateCount:sourced,
   syntheticOnlySites:sites.length>0&&sites.every(synthetic),
   syntheticRouteGeometry:usages.some(u=>synthetic(u)&&synthetic(routes.get(u.routeId))&&geometry(routes.get(u.routeId))),
   sourcedRouteGeometry:usages.some(u=>supports(u,'routeUsage')&&supports(routes.get(u.routeId),'routeGeometry')&&geometry(routes.get(u.routeId))),
   projectionMapping:sites.some(f=>sourcedSite(f)&&regions.has(f.regionId)&&mapped(regions.get(f.regionId))),
   operatingEvidenceState:sourced?'Sourced':'Unknown',measuredDependenceState:incoming.length>0&&incoming.every(measuredWeight)?'Sourced':'Unknown'};
 });
 const count=(rows,p)=>rows.filter(p).length,edges=dataset.commercialEdges,facilities=dataset.facilities;
 const counts=Object.fromEntries(groups.map(k=>[k,dataset[k].length]));
 const values={reportedCompanies:count(dataset.companies,c=>c.provenance==='dataset_reported'),reportedRelationships:count(edges,e=>e.provenance==='dataset_reported'),
  linkedCompanies:count(companies,c=>c.supplierCount+c.customerCount>0),sourcedCoordinates:count(companies,c=>c.sourcedCoordinateCount>0),syntheticOnlySites:count(companies,c=>c.syntheticOnlySites),missingOperatingEvidence:count(companies,c=>c.sourcedCoordinateCount===0),
  measuredOperationalShares:count(facilities,measuredShare),assumedOperationalShares:count(facilities,f=>number(f.operationalShare)&&(['synthetic','assumed'].includes(f.provenance)||number(fields(f).operational_share_assumed))),
  measuredWeights:count(edges,measuredWeight),assumedWeights:count(edges,e=>e.weightBasis==='assumed'&&number(e.dependencyWeight)),missingDemoWeights:count(edges,e=>!number(e.dependencyWeight)),unknownRealDependence:count(edges,e=>!measuredWeight(e)),
  syntheticGeometry:count(companies,c=>c.syntheticRouteGeometry),sourcedGeometry:count(companies,c=>c.sourcedRouteGeometry),projectionCompanies:count(companies,c=>c.projectionMapping),projectionRegions:count(dataset.regions,mapped)};
 const metrics=definitions.map(([id,label,group,scope,definition])=>({id,label,numerator:values[id],denominator:counts[group],population:group,unit:'records',provenanceScope:scope,definition}));
 const compatibility=Object.fromEntries([
  ['companyWeather','sourcedCoordinates','Requires claim-specific sourced operating coordinates. Provider connectivity is not checked.'],
  ['futureProjections','projectionCompanies','Requires evidenced operating geography mapping. Compatible product installation and provider connectivity are not checked.']
 ].map(([k,m,reason])=>[k,{status:values[m]?'eligible':'unavailable',reason}]));
 return {schemaVersion:'1.0.0',status:'available',datasetVersion:dataset.datasetVersion,contentHash:await coverageHash(dataset),hashAlgorithm:'coverage-canonical-v1-sha256',counts,metrics,companies,compatibility,
  limitations:['Installed-record completeness is not completeness of actual operations, suppliers or shipments.',
   'Sourced means identifiable claim-specific evidence, not independent verification or provider connectivity.',
   'Fields without explicit sourceFields.fieldEvidence links remain Unknown; generic attribution is insufficient.',
   'Missing evidence and absent affected paths are not zero risk. Scenario direct-known counts are not evidence coverage.']};
}
const countSchema=z.number().int().nonnegative();
const companySchema=z.object({id:z.string().min(1),name:z.string(),supplierCount:countSchema,customerCount:countSchema,facilityCount:countSchema,routeUsageCount:countSchema,sourcedCoordinateCount:countSchema,syntheticOnlySites:z.boolean(),syntheticRouteGeometry:z.boolean(),sourcedRouteGeometry:z.boolean(),projectionMapping:z.boolean(),operatingEvidenceState:z.enum(['Sourced','Unknown']),measuredDependenceState:z.enum(['Sourced','Unknown'])});
const eligibility=z.object({status:z.enum(['eligible','unavailable']),reason:z.string()});
export const CoverageReport=z.object({schemaVersion:z.literal('1.0.0'),status:z.literal('available'),datasetVersion:z.string().min(1),contentHash:z.string().regex(/^[a-f0-9]{64}$/),hashAlgorithm:z.literal('coverage-canonical-v1-sha256'),counts:z.object(Object.fromEntries(groups.map(k=>[k,countSchema]))),
 metrics:z.array(z.object({id:z.string(),label:z.string(),numerator:countSchema,denominator:countSchema,population:z.enum(groups),unit:z.literal('records'),provenanceScope:z.string(),definition:z.string()})),companies:z.array(companySchema),compatibility:z.object({companyWeather:eligibility,futureProjections:eligibility}),limitations:z.array(z.string())})
 .superRefine((r,ctx)=>{
  if(r.companies.length!==r.counts.companies||new Set(r.companies.map(c=>c.id)).size!==r.companies.length||r.metrics.length!==definitions.length||new Set(r.metrics.map(m=>m.id)).size!==definitions.length)ctx.addIssue({code:'custom',message:'Invalid coverage counts.'});
  for(const [id,,group] of definitions){const m=r.metrics.find(m=>m.id===id);if(!m||m.population!==group||m.denominator!==r.counts[group]||m.numerator>m.denominator)ctx.addIssue({code:'custom',message:'Invalid coverage denominator.'});}
 });
// Only this installed-ID request can reach the public API. Private snapshots use summarizeCoverage.
export async function getInstalledCoverage(datasetId,signal){
 if(typeof datasetId!=='string'||!datasetId||datasetId.length>200)throw new Error('Coverage accepts an installed dataset identifier only.');
 const base=import.meta.env.VITE_API_BASE_URL;
 if(!base)throw new Error('Coverage API requires the FastAPI backend.');
 const response=await fetch(`${base}/api/v1/datasets/coverage?${new URLSearchParams({datasetId})}`,{signal});
 const body=await response.json();
 if(!response.ok)throw new Error(body.error?.message||'Dataset coverage unavailable.');
 return CoverageReport.parse(body);
}
