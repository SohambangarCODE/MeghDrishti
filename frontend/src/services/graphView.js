// Presentation only: exact IDs from this graph, never a different dataset.
export function resolveGraphEntity(nodes, value) {
  if (value === null || value === undefined) return {entity:null,error:null};
  if (typeof value !== 'string' || !value.trim() || value.length > 512 || /[\u0000-\u001f\u007f]/.test(value))
    return {entity:null,error:'Invalid graph entity ID.'};
  const matches=nodes.filter(n=>n.id===value);
  return matches.length===1?{entity:matches[0],error:null}:{entity:null,error:'Entity unavailable in this source snapshot.'};
}
export function graphSubset(data, filtered, focus, {limit=40,path=null}={}) {
  const unique=new Map(data.nodes.map(n=>[n.id,n]));
  const priority=new Set(focus?[focus.id]:[]);
  if(focus) for(const e of data.edges) {
    if(e.sourceId!==focus.id&&e.targetId!==focus.id)continue;
    // Companies focus on commercial neighbors; other entity links remain inspectable.
    if(focus.kind==='company'&&!e.commercialHop)continue;
    if(unique.has(e.sourceId))priority.add(e.sourceId);
    if(unique.has(e.targetId))priority.add(e.targetId);
  }
  const nodes=[...priority].map(id=>unique.get(id)).filter(Boolean);
  for(const n of filtered)if(!priority.has(n.id)&&nodes.length<Math.max(limit,priority.size)){
    priority.add(n.id);nodes.push(n);
  }
  const ids=new Set(nodes.map(n=>n.id)),seen=new Set();
  const edges=data.edges.filter(e=>{
    if(!ids.has(e.sourceId)||!ids.has(e.targetId)||seen.has(e.id))return false;
    if(path&&!focus&&!path.edgeIds.includes(e.id))return false;
    seen.add(e.id);return true;
  });
  const neighborhood=focus?nodes.filter(n=>n.id===focus.id||data.edges.some(e=>(focus.kind!=='company'||e.commercialHop)&&((e.sourceId===focus.id&&e.targetId===n.id)||(e.targetId===focus.id&&e.sourceId===n.id)))).map(n=>n.id):[];
  return {nodes,edges,neighborhood,omitted:filtered.filter(n=>!ids.has(n.id)).length};
}
export function graphLimitations(data,dataset) {
  const missing=data.edges.some(e=>!data.nodes.some(n=>n.id===e.sourceId)||!data.nodes.some(n=>n.id===e.targetId));
  const metadata=dataset?.sourceMetadata||{};
  const partial=metadata.partial===true||metadata.hasMore===true||metadata.pagination?.hasMore===true||metadata.pagination?.nextCursor!=null||metadata.relationshipsComplete===false;
  return partial||missing?'Source graph is partial or has unresolved relationship endpoints. Additional upstream relationships may be missing.':'Shows recorded relationships in this source snapshot; real-world relationship completeness is unknown.';
}
