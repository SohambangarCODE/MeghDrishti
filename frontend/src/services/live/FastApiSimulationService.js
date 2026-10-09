import { z } from 'zod';
import { digest } from '../mock/BrowserSimulationService.js';
import { Scenario, Dataset, Holding } from '../../schemas/contracts.js';
const responseSchema=z.object({schemaVersion:z.literal('1.0.0'),mode:z.literal('demo'),id:z.string(),requestId:z.string(),draftRevision:z.number(),
  scenarioSnapshot:Scenario,sourceSnapshot:Dataset,portfolioSnapshot:z.array(Holding),
  holdingsResults:z.array(z.object({companyId:z.string().nullable(),totalStress:z.number().min(0).max(1).nullable()}).passthrough()),
  paths:z.array(z.object({id:z.string(),companyIds:z.array(z.string()),edgeIds:z.array(z.string())}).passthrough()),
  totals:z.object({totalCapital:z.number().finite(),connectedCapital:z.number().finite(),assumedWeightedExposure:z.number().finite()}).passthrough()}).passthrough();
export class FastApiSimulationService {
  constructor(baseUrl,session) {this.baseUrl=baseUrl.replace(/\/$/,'');this.session=session;}
  async request(path,{signal,...options}={}) {
    const timeout=AbortSignal.timeout(15000);
    const response=await fetch(`${this.baseUrl}/api/v1${path}`,{...options,signal:signal?AbortSignal.any([signal,timeout]):timeout,
      headers:{'Content-Type':'application/json','X-Demo-Session':this.session,...options.headers}});
    const body=await response.json();
    if (!response.ok) throw new Error(body.error?.message||`API error ${response.status}`);
    if (body.schemaVersion!=='1.0.0') throw new Error('Unsupported response schema version');
    return body;
  }
  async analyze({holdings,scenario,requestId,draftRevision,signal}) {
    const result=await this.request('/analysis',{method:'POST',signal,headers:{'Idempotency-Key':requestId},body:JSON.stringify({holdings,scenario,requestId,draftRevision,schemaVersion:'1.0.0'})});
    const parsed=responseSchema.parse(result);
    if(parsed.requestId!==requestId||parsed.draftRevision!==draftRevision)throw new Error('Response identity/revision mismatch');
    if(parsed.scenarioSnapshot.datasetVersion!==scenario.datasetVersion||parsed.scenarioSnapshot.modelVersion!==scenario.modelVersion)throw new Error('Response model/dataset version mismatch');
    return parsed;
  }
  async compare(run,fromCompanyId,toCompanyId,amount) {
    // Imported local snapshots may not exist in this process. Persist the exact baseline first.
    const baseline=await this.analyze({holdings:run.portfolioSnapshot,scenario:run.scenarioSnapshot,requestId:`compare-${run.id}`,draftRevision:0});
    if(await digest(baseline.sourceSnapshot)!==await digest(run.sourceSnapshot))throw new Error('Dataset contents changed; comparison requires the original immutable source version');
    return this.request('/compare',{method:'POST',body:JSON.stringify({runId:baseline.id,fromCompanyId,toCompanyId,amount,requestId:crypto.randomUUID()})});
  }
}
