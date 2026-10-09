import defaults from '../../../../config/model-defaults.json' with { type: 'json' };
import { validateDataset, Holding, Scenario } from '../../schemas/contracts.js';

export function normalizeHoldings(rows, companies) {
  const parsed = rows.map(h => Holding.parse(h));
  if (!parsed.length) throw new Error('Portfolio is empty');
  if (new Set(parsed.map(h => h.id)).size !== parsed.length) throw new Error('Duplicate holding record ID');
  if (new Set(parsed.map(h => h.portfolioId)).size !== 1) throw new Error('Use one portfolio per analysis');
  const known = new Set(companies.map(c => c.id));
  const merged = new Map();
  for (const h of parsed) {
    if (h.companyId !== null && !known.has(h.companyId)) throw new Error(`Unsupported company ID: ${h.companyId}`);
    const key = h.matchingStatus === 'matched' ? h.companyId : h.id;
    if (merged.has(key)) merged.get(key).amount += h.amount;
    else merged.set(key, structuredClone(h));
  }
  const result = [...merged.values()];
  if (result.reduce((n,h) => n+h.amount,0) > Number.MAX_SAFE_INTEGER) throw new Error('Portfolio exceeds safe numeric bound');
  return result;
}

function applyOverlays(dataset, scenario) {
  const d = structuredClone(dataset);
  const allowed = {facilities:['operationalShare','vulnerability'], routes:['vulnerability'],routeUsage:['shipmentShare','substitutability'],commercialEdges:['dependencyWeight']};
  const seen = new Set();
  for (const o of scenario.assumptionOverrides) {
    const key=JSON.stringify([o.targetId,o.field,o.hazardType]);
    if (seen.has(key)) throw new Error('Duplicate assumption overlay');
    seen.add(key);
    let found=false;
    for (const [group,fields] of Object.entries(allowed)) for (const r of d[group]) {
      if (r.id !== o.targetId) continue;
      if (!fields.includes(o.field)) throw new Error('Overlay field does not apply to entity');
      if (o.field === 'vulnerability') {
        if (!o.hazardType) throw new Error('Vulnerability overlay requires hazardType');
        r.vulnerabilityByHazard ??= {};
        r.vulnerabilityByHazard[o.hazardType]=o.value;
      } else r[o.field]=o.value;
      r.provenance='assumed'; found=true;
    }
    if (!found) throw new Error('Unknown overlay target');
  }
  for (const [id,value] of Object.entries(scenario.eventOverrides)) {
    const event=d.events.find(e=>e.id===id);
    if (!event || !scenario.eventIds.includes(id)) throw new Error('Unknown or unselected event override');
    Object.assign(event,{intensity:value,intensityBasis:'explicit hypothetical assumption',provenance:'assumed'});
  }
  return validateDataset(d);
}

/** Pure credential-free reference engine. All UI filters operate after this function. */
export function simulate(dataset, holdings, scenario, {maxPaths=defaults.maxPaths}={}) {
  const raw=validateDataset(dataset), s=Scenario.parse(scenario);
  if (s.datasetVersion !== raw.datasetVersion || s.modelVersion !== defaults.modelVersion) throw new Error('Dataset/model version mismatch');
  if (raw.companies.length>defaults.maxCompanies || raw.commercialEdges.length>defaults.maxEdges) throw new Error('Dataset exceeds explicit engine bounds');
  if (!Number.isInteger(maxPaths) || maxPaths<1) throw new Error('Path bound must be a positive integer');
  const d=applyOverlays(raw,s), portfolio=normalizeHoldings(holdings,d.companies);
  const events=d.events.filter(e=>s.eventIds.includes(e.id));
  if (events.length!==new Set(s.eventIds).size) throw new Error('Unknown scenario event');
  const relevant=new Set(portfolio.filter(h=>h.matchingStatus==='matched').map(h=>h.companyId));
  for (let i=0;i<s.maxCommercialHops;i++) {
    const previous=new Set(relevant);
    d.commercialEdges.filter(e=>previous.has(e.customerCompanyId)).forEach(e=>relevant.add(e.supplierCompanyId));
  }
  const seeds=[],warnings=[];
  const seed=(event,record,companyId,factors,kind)=>{
    const missingFields=Object.entries(factors).filter(([,v])=>v===null).map(([k])=>k);
    seeds.push({id:`${event.id}|${record.id}`,companyId,eventId:event.id,entityId:record.id,kind,
      stress:missingFields.length?null:Object.values(factors).reduce((a,b)=>a*b,1),factors,missingFields,evidenceIds:record.evidenceIds});
  };
  for (const event of events) {
    for (const f of d.facilities) {
      if (!event.affectedEntityIds.includes(f.id) && !event.geographicTargets.includes(f.regionId)) continue;
      const sites=d.facilities.filter(x=>x.companyId===f.companyId);
      const complete=sites.every(x=>x.operationalShare!==null) && Math.abs(sites.reduce((a,x)=>a+(x.operationalShare??0),0)-1)<1e-12;
      seed(event,f,f.companyId,{intensity:event.intensity,vulnerability:f.vulnerabilityByHazard?.[event.hazardType]??null,operationalShare:complete?f.operationalShare:null},'facility');
    }
    for (const r of d.routes) {
      if (!event.affectedEntityIds.includes(r.id) && !r.waypointIds.some(k=>event.affectedEntityIds.includes(k)) && !r.regionIds.some(k=>event.geographicTargets.includes(k))) continue;
      for (const u of d.routeUsage.filter(u=>u.routeId===r.id)) seed(event,u,u.companyId,{intensity:event.intensity,
        vulnerability:r.vulnerabilityByHazard?.[event.hazardType]??null,shipmentShare:u.shipmentShare,
        remainingFraction:u.substitutability===null?null:1-u.substitutability},'route');
    }
  }
  const edgesById=new Map(d.commercialEdges.map(e=>[e.id,e]));
  const paths=[]; let truncated=false;
  const visit=(seedRecord,companyIds,edgeIds,stress,missingFields)=>{
    if (paths.length>=maxPaths) {truncated=true;return;}
    paths.push({id:JSON.stringify([seedRecord.id,...edgeIds]),seedId:seedRecord.id,companyIds,edgeIds,
      commercialDepth:edgeIds.length,stress,missingFields,
      evidenceIds:[...new Set([...seedRecord.evidenceIds,...edgeIds.flatMap(id=>edgesById.get(id).evidenceIds)])].sort()});
    if (edgeIds.length===s.maxCommercialHops) return;
    const next=d.commercialEdges.filter(e=>e.supplierCompanyId===companyIds.at(-1)).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
    for (const edge of next) {
      if (companyIds.includes(edge.customerCompanyId) || !relevant.has(edge.customerCompanyId)) continue;
      const value=stress===null || edge.dependencyWeight===null?null:stress*edge.dependencyWeight*s.transmissionMultiplier;
      visit(seedRecord,[...companyIds,edge.customerCompanyId],[...edgeIds,edge.id],value,
        [...missingFields,...(edge.dependencyWeight===null?[`${edge.id}.dependencyWeight`]:[])]);
      if (truncated) return;
    }
  };
  for (const record of [...seeds].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)) {
    if (relevant.has(record.companyId)) visit(record,[record.companyId],[],record.stress,record.missingFields);
    if (truncated) break;
  }
  if (truncated) warnings.push(`Traversal truncated at ${maxPaths} paths; results are partial, not a complete maximum`);
  const holdingsResults=portfolio.map(h=>{
    const candidates=h.matchingStatus==='matched'?paths.filter(p=>p.companyIds.at(-1)===h.companyId):[];
    const supported=candidates.filter(p=>p.stress!==null).sort((a,b)=>b.stress-a.stress||a.commercialDepth-b.commercialDepth||(a.id<b.id?-1:a.id>b.id?1:0));
    const best=supported[0];
    const directCandidates=candidates.filter(p=>!p.commercialDepth);
    const directStress=!directCandidates.length||directCandidates.some(p=>p.stress===null)?null:Math.max(...directCandidates.map(p=>p.stress));
    const indirects=supported.filter(p=>p.commercialDepth>0).map(p=>p.stress);
    const missingFields=[...new Set(candidates.flatMap(p=>p.missingFields))].sort();
    if (directStress===null) missingFields.push('directOperationalCoverage');
    return {...h,directStress,indirectStress:indirects.length?Math.max(...indirects):null,totalStress:best?.stress??null,
      selectedPathIds:best?[best.id]:[],selectedCommercialDepth:best?.commercialDepth??null,connected:!!best,recordedPath:!!candidates.length,
      connectedAmount:best?h.amount:0,assumedWeightedExposure:best?h.amount*best.stress:null,
      evidenceStatus:best?'Synthetic / assumed':candidates.length?'Unknown inputs':'No recorded affected path',missingFields};
  });
  const sum=(rows,fn)=>rows.reduce((a,r)=>a+fn(r),0);
  const total=sum(portfolio,h=>h.amount),mapped=sum(portfolio,h=>h.matchingStatus==='matched'?h.amount:0),modeled=sum(holdingsResults,r=>r.totalStress!==null?r.amount:0);
  return {schemaVersion:'1.0.0',mode:'demo',status:truncated?'partial':'completed',portfolioSnapshot:portfolio,
    scenarioSnapshot:s,sourceSnapshot:raw,eventSnapshot:events,holdingsResults,paths,seeds,
    totals:{currency:'INR',totalCapital:total,mappedCapital:mapped,unmappedCapital:total-mapped,modeledCapital:modeled,unmodeledCapital:total-modeled,
      connectedCapital:sum(holdingsResults,r=>r.connectedAmount),positiveStressConnectedCapital:sum(holdingsResults,r=>(r.totalStress??0)>0?r.amount:0),
      assumedWeightedExposure:sum(holdingsResults,r=>r.assumedWeightedExposure??0)},warnings,
    sharedDependencies:d.companies.map(c=>({companyId:c.id,holdingCompanyIds:[...new Set(holdingsResults.filter(r=>paths.some(p=>p.companyIds.slice(0,-1).includes(c.id)&&p.companyIds.at(-1)===r.companyId)).map(r=>r.companyId))].sort()})).filter(x=>x.holdingCompanyIds.length>1),
    coverage:{holdingCount:holdingsResults.length,matchedHoldingCount:portfolio.filter(h=>h.matchingStatus==='matched').length,
      modeledHoldingCount:holdingsResults.filter(r=>r.totalStress!==null).length,directKnownHoldingCount:holdingsResults.filter(r=>r.directStress!==null).length,truncated},assumptions:structuredClone(defaults)};
}

export function compareRun(run,fromId,toId,amount) {
  if (fromId===toId || !Number.isFinite(amount) || amount<=0) throw new Error('Choose different holdings and a positive transfer');
  const holdings=structuredClone(run.portfolioSnapshot);
  const source=holdings.find(h=>h.companyId===fromId&&h.matchingStatus==='matched');
  const target=holdings.find(h=>h.companyId===toId&&h.matchingStatus==='matched');
  if (!source||!target) throw new Error('Transfer requires two matched holdings');
  if (amount>source.amount) throw new Error('Transfer exceeds source amount');
  source.amount-=amount;target.amount+=amount;
  const proposed=simulate(run.sourceSnapshot,holdings,run.scenarioSnapshot);
  if (Math.abs(proposed.totals.totalCapital-run.totals.totalCapital)>1e-8) throw new Error('Capital invariant failed');
  return {baselineRunId:run.id,label:'Hypothetical allocation sensitivity, not a recommendation',baseline:structuredClone(run),proposed,
    transfer:{fromCompanyId:fromId,toCompanyId:toId,amount,currency:'INR'}};
}
