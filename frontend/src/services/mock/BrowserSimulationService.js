import { simulate, compareRun } from '../../engine/demo/simulate.js';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
export async function digest(value) {
  const bytes=new TextEncoder().encode(JSON.stringify(canonical(value)));
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function freeze(value) {if (value&&typeof value==='object'&&!Object.isFrozen(value)) {Object.freeze(value);Object.values(value).forEach(freeze);}return value;}
export class BrowserSimulationService {
  async analyze({dataset,holdings,scenario,requestId,draftRevision=0}) {
    const startedAt=new Date().toISOString();
    const result=simulate(dataset,holdings,scenario);
    const id=crypto.randomUUID();
    return freeze({...result,id,runId:id,requestId,draftRevision,ownerId:null,portfolioId:holdings[0].portfolioId,
      inputHash:await digest({dataset,holdings,scenario}),startedAt,completedAt:new Date().toISOString(),storage:'local demo history'});
  }
  async compare(run,fromId,toId,amount) {
    return freeze({...compareRun(run,fromId,toId,amount),schemaVersion:'1.0.0',fixedInputHash:await digest({dataset:run.sourceSnapshot,scenario:run.scenarioSnapshot})});
  }
}
