import {z} from 'zod';
import {validateDataset} from '../schemas/contracts.js';
import definitions from '../../../backend/shared/coverage-metrics.json' with {type:'json'};
const groups=['companies','commercialEdges','facilities','routes','routeUsage','regions'];
import {finiteNumber as number,sourceFields as fields,evidenceRules,companyCoverage} from './evidence.js';
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
 const rules=evidenceRules(dataset),{mapped,measuredShare,measuredWeight}=rules;
 const companies=companyCoverage(dataset,rules);
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
