import {evidenceRules,isSynthetic,hasCoordinates,hasGeometry} from './evidence.js';
export function geometryStyle(record,kind,dataset) {
  const rules=evidenceRules(dataset);
  const synthetic=isSynthetic(record)||record?.provenance==='assumed'||record?.sourceFields?.geometry_status==='assumed';
  const sourced=kind==='facility'?rules.sourcedSite(record):hasGeometry(record)&&rules.supports(record,'routeGeometry');
  const status=synthetic?'synthetic':sourced?'sourced':'unknown';
  return {status,dashArray:status==='synthetic'?'6 5':status==='unknown'?'1 5':null,
    opacity:status==='synthetic'?.55:status==='unknown'?.65:.9,
    fillOpacity:status==='sourced'?1:status==='synthetic'?0:.25};
}
export function facilitiesForView(data,companyId,limit=50) {
  const rows=data.facilities.filter(f=>!companyId||f.companyId===companyId);
  return companyId?rows:rows.slice(0,limit);
}
export function viewportKey(points,focus='') {
  if(!points.length)return `empty:${focus}`;
  const lat=points.map(p=>p[0]),lon=points.map(p=>p[1]);
  return JSON.stringify([Math.min(...lat),Math.max(...lat),Math.min(...lon),Math.max(...lon),focus]);
}
export {hasCoordinates,hasGeometry};
