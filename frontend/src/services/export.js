import Papa from 'papaparse';
export function csvSafe(value) {const text=String(value??'');return /^[\s]*[=+\-@\t\r\n]/.test(text)?`'${text}`:text;}
export function exportJson(run) {return JSON.stringify(run,null,2);}
export function exportCsv(run) {
  const rows=run.holdingsResults.map(r=>({runId:run.id,mode:run.mode,source:'Synthetic / assumed',modelVersion:run.scenarioSnapshot.modelVersion,
    datasetVersion:run.scenarioSnapshot.datasetVersion,scenario:run.scenarioSnapshot.id,inputHash:run.inputHash,currency:r.currency,unit:'rupees',
    name:r.originalInputName,companyId:r.companyId,amount:r.amount,matchingStatus:r.matchingStatus,exclusionReason:r.exclusionReason,
    directStress:r.directStress,indirectStress:r.indirectStress,totalStress:r.totalStress,connectedAmount:r.connectedAmount,
    assumedWeightedExposure:r.assumedWeightedExposure,evidenceStatus:r.evidenceStatus,missingFields:r.missingFields.join('; '),
    selectedPaths:r.selectedPathIds.join('; '),transmission:run.scenarioSnapshot.transmissionMultiplier,hops:run.scenarioSnapshot.maxCommercialHops,
    assumptions:JSON.stringify(run.scenarioSnapshot.assumptionOverrides),eventSnapshot:JSON.stringify(run.eventSnapshot),
    totalCapital:run.totals.totalCapital,unmodeledCapital:run.totals.unmodeledCapital,unmappedCapital:run.totals.unmappedCapital,
    limitation:'Assumed exposure, not investment loss; no recorded path does not establish safety'}));
  return Papa.unparse(rows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,csvSafe(v)]))));
}
export function download(content,filename,type) {
  const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
