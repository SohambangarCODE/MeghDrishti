import { z } from 'zod';
import { Holding, Scenario, Dataset } from '../schemas/contracts.js';
export const StoredRun=z.object({id:z.string(),mode:z.literal('demo'),schemaVersion:z.literal('1.0.0'),
  portfolioSnapshot:z.array(Holding),scenarioSnapshot:Scenario,sourceSnapshot:Dataset,
  holdingsResults:z.array(z.object({amount:z.number().finite(),totalStress:z.number().min(0).max(1).nullable()}).passthrough()),
  totals:z.object({totalCapital:z.number().finite().nonnegative(),assumedWeightedExposure:z.number().finite().nonnegative()}).passthrough(),
  paths:z.array(z.object({id:z.string(),companyIds:z.array(z.string()),edgeIds:z.array(z.string())}).passthrough()),
  eventSnapshot:z.array(z.unknown()),warnings:z.array(z.string()),inputHash:z.string()}).passthrough();
export const isPrivateRun=run=>run.storage==='private Supabase snapshot'||!!run.ownerId&&run.storage!=='temporary backend demo memory';
export class RunHistory {
  constructor(storage,limit=20) {
    this.storage=storage;this.limit=limit;this.runs=[];this.warning='';
    try {
      const text=storage?.getItem('meghdrishti:runs:v1');
      if (text) this.runs=z.array(StoredRun).max(limit).parse(JSON.parse(text));
    } catch {this.warning='Local history unavailable or invalid; using memory for this session.';this.storage=null;}
    if (!storage) this.warning='Local storage unavailable; history lasts for this session only.';
  }
  save(run) {
    if(isPrivateRun(run))throw new Error('Private reports cannot be saved in local demo history.');
    StoredRun.parse(run);
    this.runs=[structuredClone(run),...this.runs.filter(r=>r.id!==run.id)].slice(0,this.limit);
    try {this.storage?.setItem('meghdrishti:runs:v1',JSON.stringify(this.runs));}
    catch {this.storage=null;this.warning='Local storage denied or full; history lasts for this session only.';}
  }
  delete(id) {
    this.runs=this.runs.filter(run=>run.id!==id);
    try {this.storage?.setItem('meghdrishti:runs:v1',JSON.stringify(this.runs));}
    catch {this.storage=null;this.warning='Deletion applies to this session only; browser storage could not be updated.';}
  }
  list() {return structuredClone(this.runs);}
  get(id) {return structuredClone(this.runs.find(r=>r.id===id)??null);}
}
