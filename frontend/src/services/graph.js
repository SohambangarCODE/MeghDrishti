export function graphData(dataset,holdings=[]) {
  const nodes=[],edges=[];
  const groups={companies:'company',facilities:'facility',routes:'route',waypoints:'waypoint',commodities:'commodity',regions:'region',events:'hazard'};
  for (const [group,kind] of Object.entries(groups)) for (const record of dataset[group]) nodes.push({id:record.id,kind,label:record.name||record.hazardType||record.id,record});
  const link=(source,target,kind,commercialHop=false,id=`${kind}:${source}:${target}`)=>edges.push({id,sourceId:source,targetId:target,kind,commercialHop});
  for (const f of dataset.facilities) {link(f.companyId,f.id,'operates');if(f.regionId)link(f.id,f.regionId,'located_in');}
  for (const e of dataset.commercialEdges) link(e.supplierCompanyId,e.customerCompanyId,'supplies',true,e.id);
  for (const u of dataset.routeUsage) link(u.companyId,u.routeId,'uses_route',false,u.id);
  for (const r of dataset.routes) {r.waypointIds.forEach(w=>link(r.id,w,'passes_through'));r.regionIds.forEach(g=>link(r.id,g,'passes_through'));}
  for (const s of dataset.supplyItems) if(s.commodityId)link(s.supplierId,s.commodityId,'provides',false,s.id);
  for (const e of dataset.events) [...e.affectedEntityIds,...e.geographicTargets].forEach(t=>link(e.id,t,'exposed_to'));
  if (holdings.length) {
    nodes.push({id:'portfolio:current',kind:'portfolio',label:'Portfolio capital',record:{provenance:'synthetic'}});
    const ids=new Set(holdings.filter(h=>h.companyId&&h.matchingStatus==='matched').map(h=>h.companyId));
    ids.forEach(id=>link('portfolio:current',id,'holds'));
  }
  return {nodes,edges};
}
export function layoutGraph(nodes,edges) {
  // Stable layers by entity kind and commercial depth, independent of screen size.
  const companyIds=new Set(nodes.filter(n=>n.kind==='company').map(n=>n.id));
  const depth=new Map([...companyIds].map(id=>[id,0]));
  for(let pass=0;pass<3;pass++) {
    const prev=new Map(depth);
    for(const e of edges.filter(e=>e.commercialHop)) depth.set(e.targetId,Math.min(3,Math.max(depth.get(e.targetId)||0,(prev.get(e.sourceId)||0)+1)));
  }
  const lanes=new Map();
  const kindLayer={hazard:0,region:0,facility:1,route:1,waypoint:0,commodity:2,portfolio:0};
  return nodes.map(n=>{
    const layer=n.kind==='company'?2+(depth.get(n.id)||0):kindLayer[n.kind]??0;
    const row=lanes.get(layer)||0;lanes.set(layer,row+1);
    return {...n,position:{x:layer*270,y:row*130}};
  });
}
