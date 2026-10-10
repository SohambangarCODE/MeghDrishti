// Spatial presentation only. No provider calls, footprint inference or mutation.
const coordinate=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
const ring=r=>Array.isArray(r)&&r.length>=4&&r.every(coordinate)&&r[0][0]===r.at(-1)[0]&&r[0][1]===r.at(-1)[1];
const polygon=p=>Array.isArray(p)&&p.length>0&&p.every(ring);
export function regionGeometry(region) {
 const boundary=region?.boundary?.type==='Feature'?region.boundary.geometry:region?.boundary;
 if(boundary?.type==='Polygon'&&polygon(boundary.coordinates))return {type:'boundary',geometry:boundary};
 if(boundary?.type==='MultiPolygon'&&Array.isArray(boundary.coordinates)&&boundary.coordinates.length>0&&boundary.coordinates.every(polygon))return {type:'boundary',geometry:boundary};
 if(coordinate(region?.centroid))return {type:'centroid',geometry:{type:'Point',coordinates:region.centroid}};
 return {type:'unavailable',geometry:null};
}
export function modeledEvents(dataset,scenario,privateRun=null) {
 if(privateRun)return Array.isArray(privateRun.eventSnapshot)?privateRun.eventSnapshot.filter(e=>e&&typeof e.id==='string'&&e.id.trim()):[];
 return (dataset?.events||[]).filter(e=>scenario?.eventIds?.includes(e.id)).map(e=>{
  const value=scenario.eventOverrides?.[e.id];
  return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1?{...e,intensity:value,intensityBasis:'explicit hypothetical assumption',provenance:'assumed'}:e;
 });
}
export function hazardTargets(dataset,events,eventId) {
 const matching=events.filter(e=>e?.id===eventId);
 if(matching.length!==1)return {event:null,targets:[],notice:'Modeled event snapshot unavailable.'};
 const event=matching[0];
 if(event.datasetVersion&&event.datasetVersion!==dataset.datasetVersion)return {event:null,targets:[],notice:'Modeled event version does not match this source snapshot.'};
 if(!Array.isArray(event.geographicTargets)||event.geographicTargets.some(id=>typeof id!=='string'||!id.trim()))return {event,targets:[],notice:'Geographic targets unavailable in this modeled event snapshot.'};
 const targets=[...new Set(event.geographicTargets)].map(id=>{
  const regions=(dataset.regions||[]).filter(r=>r.id===id&&(!r.datasetVersion||r.datasetVersion===dataset.datasetVersion));
  const region=regions.length===1?regions[0]:null,shape=regionGeometry(region);
  const provenance=region?.provenance||'unavailable';
  const text=`Modeled target region: ${region?.name||id}; ${event.hazardType||'hazard unknown'}; intensity ${event.intensity??'unknown'}; basis ${event.intensityBasis||'unknown'}; event ${event.id} (${event.provenance||'unknown'}); geography ${provenance}; geography level ${region?.geographyLevel||'unknown'}. ${shape.type==='centroid'?'Target-region centroid only, no hazard footprint or radius.':shape.type==='boundary'?'Supplied region boundary, not an observed hazard footprint.':'Geometry unavailable.'}`;
  return {id,region,...shape,provenance,text};
 });
 return {event,targets,notice:targets.length?null:'This modeled event has no geographic target regions. Entity-targeted disruption is not a spatial hazard footprint.'};
}
