import {StoredRun} from '../../state/history.js';
import {validatePrivateRun} from './privateRuns.js';
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export function validateTransfer(run,fromCompanyId,toCompanyId,amount){
 const matched=run.portfolioSnapshot.filter(h=>h.matchingStatus==='matched');
 const from=matched.find(h=>h.companyId===fromCompanyId),to=matched.find(h=>h.companyId===toCompanyId);
 if(fromCompanyId===toCompanyId||!Number.isFinite(amount)||amount<=0)throw new Error('Choose different holdings and a positive transfer.');
 if(!from||!to)throw new Error('Transfer requires two matched holdings from the selected snapshot.');
 if(amount>from.amount)throw new Error('Transfer exceeds source amount.');
}
export function validatePrivateComparison(result,run,transfer,ownerId){
 if(result.baselineRunId!==run.id||result.requestId!==transfer.requestId||typeof result.fixedInputHash!=='string')throw new Error('Comparison response does not match the selected baseline/request.');
 const baseline=validatePrivateRun({schemaVersion:result.schemaVersion,run:result.baseline},ownerId,run.id);
 const proposed=StoredRun.omit({id:true,inputHash:true}).parse(result.proposed);
 for(const field of ['sourceSnapshot','scenarioSnapshot','eventSnapshot']){
  if(canonical(baseline[field])!==canonical(run[field])||canonical(proposed[field])!==canonical(run[field]))throw new Error('Comparison changed the immutable '+field+'.');
 }
 if(canonical(baseline.portfolioSnapshot)!==canonical(run.portfolioSnapshot)||baseline.inputHash!==run.inputHash)throw new Error('Comparison baseline inputs changed.');
 if(Math.abs(proposed.totals.totalCapital-run.totals.totalCapital)>1e-8)throw new Error('Comparison did not preserve total capital.');
 if(result.transfer?.currency!=='INR'||result.transfer.fromCompanyId!==transfer.fromCompanyId||result.transfer.toCompanyId!==transfer.toCompanyId||result.transfer.amount!==transfer.amount)throw new Error('Comparison transfer does not match this request.');
 return {...result,baseline,proposed};
}
