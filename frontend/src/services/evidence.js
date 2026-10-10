// Shared claim rules used by completeness and entity details. No I/O or caches.
import {validateDataset} from '../schemas/contracts.js';
export const finiteNumber=v=>typeof v==='number'&&Number.isFinite(v);
export const sourceFields=r=>r?.sourceFields||{};
export const isSynthetic=r=>!!r&&(r.provenance==='synthetic'||sourceFields(r).parameter_status==='synthetic_demo'||sourceFields(r).simulation_parameter_status==='synthetic_demo'||sourceFields(r).is_synthetic===true);
export const hasCoordinates=r=>!!r&&finiteNumber(r.latitude)&&finiteNumber(r.longitude)&&Math.abs(r.latitude)<=90&&Math.abs(r.longitude)<=180;
export const hasGeometry=r=>r?.geometry?.type==='LineString'&&Array.isArray(r.geometry.coordinates)&&r.geometry.coordinates.length>=2&&r.geometry.coordinates.every(p=>Array.isArray(p)&&p.length===2&&finiteNumber(p[0])&&finiteNumber(p[1])&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90);
export function evidenceRules(dataset){
 const evidence=new Map((dataset?.evidence||[]).map(e=>[e.id,e]));
 const supports=(r,claim)=>{
  const refs=sourceFields(r).fieldEvidence?.[claim];
  if(r?.provenance!=='sourced'||isSynthetic(r)||!Array.isArray(refs))return false;
  return refs.some(key=>{const e=evidence.get(key);return e&&r.evidenceIds?.includes(key)&&e.entityIds?.includes(r.id)&&['sourced','verified'].includes(e.reportedOrVerifiedStatus)&&/^https?:\/\//i.test(e.url||'')&&typeof e.claim==='string'&&!!e.claim.trim();});
 };
 const sourcedSite=f=>hasCoordinates(f)&&supports(f,'operatingCoordinates');
 const mapped=r=>!!r?.providerGeographyId&&r.geographyLevel!=='synthetic'&&supports(r,'providerGeographyId');
 const measuredShare=f=>{const sf=sourceFields(f),v=Object.hasOwn(sf,'operational_share')?sf.operational_share:f?.operationalShare;return finiteNumber(v)&&v>=0&&v<=1&&supports(f,'operationalShare');};
 const measuredWeight=e=>e?.weightBasis==='measured'&&finiteNumber(e.dependencyWeight)&&supports(e,'dependencyWeight');
 return {supports,sourcedSite,mapped,measuredShare,measuredWeight};
}
export function companyCoverage(dataset,rules=evidenceRules(dataset)){
 const {supports,sourcedSite,mapped,measuredWeight}=rules;
 const regions=new Map(dataset.regions.map(r=>[r.id,r])),routes=new Map(dataset.routes.map(r=>[r.id,r]));
 return dataset.companies.map(c=>{
  const sites=dataset.facilities.filter(f=>f.companyId===c.id),usages=dataset.routeUsage.filter(u=>u.companyId===c.id),incoming=dataset.commercialEdges.filter(e=>e.customerCompanyId===c.id),outgoing=dataset.commercialEdges.filter(e=>e.supplierCompanyId===c.id),sourced=sites.filter(sourcedSite).length;
  return {id:c.id,name:c.name,supplierCount:incoming.length,customerCount:outgoing.length,facilityCount:sites.length,routeUsageCount:usages.length,sourcedCoordinateCount:sourced,
   syntheticOnlySites:sites.length>0&&sites.every(isSynthetic),
   syntheticRouteGeometry:usages.some(u=>isSynthetic(u)&&isSynthetic(routes.get(u.routeId))&&hasGeometry(routes.get(u.routeId))),
   sourcedRouteGeometry:usages.some(u=>supports(u,'routeUsage')&&supports(routes.get(u.routeId),'routeGeometry')&&hasGeometry(routes.get(u.routeId))),
   projectionMapping:sites.some(f=>sourcedSite(f)&&regions.has(f.regionId)&&mapped(regions.get(f.regionId))),
   operatingEvidenceState:sourced?'Sourced':'Unknown',measuredDependenceState:incoming.length>0&&incoming.every(measuredWeight)?'Sourced':'Unknown'};
 });
}
const label=(text,detail)=>({text,detail});
const unavailable=()=>label('Unavailable','The matching immutable source record or compatible dataset is unavailable. No installed-dataset substitution is used.');
const uniqueMap=rows=>{const map=new Map();for(const r of rows){if(typeof r.id==='string')map.set(r.id,map.has(r.id)?null:r);}return map;};
export function createEntityEvidence(dataset){
 const groups=['companies','facilities','commercialEdges','routes','routeUsage','regions','evidence'];
 let available=!!dataset?.datasetVersion&&groups.every(k=>Array.isArray(dataset[k]));
 try{if(available)validateDataset(dataset);}catch{available=false;}
 const records=Object.fromEntries(groups.map(k=>[k,uniqueMap(available?dataset[k]:[])]));
 const rules=evidenceRules(available?dataset:null);
 const record=(group,id)=>{const r=records[group].get(id);return r&&(!r.datasetVersion||r.datasetVersion===dataset.datasetVersion)?r:null;};
 const companies=new Map(available?companyCoverage(dataset,rules).map(c=>[c.id,c]):[]);
 return {available,datasetVersion:dataset?.datasetVersion||null,
  holding(h){
   const c=h?.matchingStatus==='matched'&&record('companies',h.companyId),summary=c&&companies.get(c.id);
   if(!summary)return {operating:unavailable(),dependence:unavailable()};
   return {operating:summary.sourcedCoordinateCount?label('Sourced operating coordinates','Claim-specific sourced coordinates; this is not independent operational verification.'):summary.syntheticOnlySites?label('Synthetic locations only','Illustrative sites do not establish real operating-location coverage.'):label('Operating evidence unknown','No claim-specific sourced operating coordinates are recorded.'),
    dependence:summary.supplierCount+summary.customerCount===0?label('No recorded commercial relationships','No records does not mean zero actual supplier dependence or risk.'):summary.measuredDependenceState==='Sourced'?label('Measured supplier dependence','All recorded incoming weights have claim-specific sourced measurement evidence; actual supplier completeness remains unknown.'):label('Supplier dependence unknown','Assumed weights or absent incoming measurements do not establish real supplier dependence.')};
  },
  edge(edge){
   const r=record('commercialEdges',edge?.id),matched=r&&r.supplierCompanyId===edge.sourceId&&r.customerCompanyId===edge.targetId;
   if(!matched)return {relationship:label('Relationship unknown','No reliable source record matches this edge ID and its directed endpoints.'),weight:label('Dependency weight unknown','No reliable source weight evidence is available.')};
   return {relationship:isSynthetic(r)?label('Synthetic relationship','Explicitly identified as synthetic; not an observed commercial relationship.'):r.provenance==='dataset_reported'?label('Dataset-reported relationship','Supplied commercial topology; not independently verified and not a measured dependency.'):r.provenance==='sourced'?label('Sourced relationship record','Source record provenance; this label alone does not establish a measured dependency weight.'):label('Relationship unknown','Commercial provenance is unknown.'),
    weight:rules.measuredWeight(r)?label('Measured dependency weight','Supported by claim-specific sourced dependencyWeight evidence.'):r.weightBasis==='assumed'&&finiteNumber(r.dependencyWeight)?label('Assumed dependency weight','Simulation input; not measured supplier dependence.'):label('Dependency weight unknown','No claim-specific measured evidence or usable explicitly assumed weight.')};
  },
  facility(id){const r=record('facilities',id);return !r?unavailable():isSynthetic(r)?label('Synthetic facility / coordinates','Illustrative operating record; a map pin is not a verified facility.'):rules.sourcedSite(r)?label('Sourced operating coordinates','Claim-specific sourced coordinate evidence; not independent verification of all operations.'):label('Operating-coordinate evidence unknown','Coordinates or source labels alone do not establish operating evidence.');},
  route(id){const r=record('routes',id);return !r?unavailable():isSynthetic(r)&&hasGeometry(r)?label('Synthetic route geometry','Illustrative corridor; not observed shipments.'):rules.supports(r,'routeGeometry')&&hasGeometry(r)?label('Sourced route geometry','Claim-specific geometry evidence; company usage and shipment direction require their own evidence.'):label('Route geometry unknown','No usable geometry with sufficient claim-specific provenance.');}
 };
}
