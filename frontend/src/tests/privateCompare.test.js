import {it,expect} from 'vitest';
import fixture from '../fixtures/reference.json';
import {BrowserSimulationService} from '../services/mock/BrowserSimulationService.js';
import {compareRun} from '../engine/demo/simulate.js';
import {validateTransfer,validatePrivateComparison} from '../services/live/privateCompare.js';
import {validatePrivateRun} from '../services/live/privateRuns.js';
const owner='mock-owner';
const baseline=async()=>validatePrivateRun({schemaVersion:'1.0.0',run:{...await new BrowserSimulationService().analyze({...fixture,requestId:'mock'}),ownerId:owner,storage:'private Supabase snapshot'}},owner);
const transfer={runId:'mock',fromCompanyId:'demo:aster',toCompanyId:'demo:evergreen',amount:1000000,requestId:'comparison-request'};
it('validates backend transfer rules without altering the baseline',async()=>{
 const run=await baseline(),copy=structuredClone(run);validateTransfer(run,transfer.fromCompanyId,transfer.toCompanyId,transfer.amount);
 for(const args of [['demo:aster','demo:aster',1],['unsupported','demo:aster',1],['demo:aster','demo:evergreen',0],['demo:aster','demo:evergreen',4000001]])expect(()=>validateTransfer(run,...args)).toThrow();
 expect(run).toEqual(copy);
});
it('accepts an immutable private comparison and rejects altered inputs, IDs, capital or transfers',async()=>{
 const run=await baseline(),body={...transfer,runId:run.id},result={...compareRun(run,body.fromCompanyId,body.toCompanyId,body.amount),fixedInputHash:'mock-fixed-input-hash',schemaVersion:'1.0.0',requestId:body.requestId};
 expect(validatePrivateComparison(result,run,body,owner).proposed.totals.assumedWeightedExposure).toBe(1082340);
 for(const change of [r=>r.baselineRunId='wrong',r=>r.proposed.totals.totalCapital++,r=>r.proposed.scenarioSnapshot.transmissionMultiplier=.5,r=>r.baseline.portfolioSnapshot[0].amount++,r=>r.transfer.amount=1]){
  const changed=structuredClone(result);change(changed);expect(()=>validatePrivateComparison(changed,run,body,owner)).toThrow();
 }
});
