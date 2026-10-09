import { describe,it,expect } from 'vitest';
import fixture from '../fixtures/reference.json';
import { simulate,compareRun } from '../engine/demo/simulate.js';
import { previewCsv,commitPreview,parseAmount } from '../services/portfolio.js';
import { exportCsv } from '../services/export.js';
import { BrowserSimulationService } from '../services/mock/BrowserSimulationService.js';
import { RunHistory } from '../state/history.js';
import { LatestRequest } from '../state/latestRequest.js';
const fresh=()=>structuredClone(fixture),run=f=>simulate(f.dataset,f.holdings,f.scenario);
describe('browser reference engine',()=>{
  it('matches the three-hop golden fixture and unknown direct exposure',()=>{const r=run(fresh());expect(r.seeds[0].stress).toBeCloseTo(.6,12);expect(r.holdingsResults.map(h=>h.totalStress)).toEqual([expect.closeTo(.252,12),expect.closeTo(.0882,12),expect.closeTo(.03087,12),null]);expect(r.totals.totalCapital).toBe(10000000);expect(r.totals.connectedCapital).toBe(9000000);expect(r.totals.assumedWeightedExposure).toBeCloseTo(1334340,8);expect(r.holdingsResults.every(h=>h.directStress===null)).toBe(true);});
  it.each([1,2,3])('bounds traversal at %i commercial hops',hops=>{const f=fresh();f.scenario.maxCommercialHops=hops;const r=run(f);expect(r.holdingsResults.filter(h=>h.totalStress!==null)).toHaveLength(hops);expect(Math.max(...r.paths.map(p=>p.commercialDepth))).toBe(hops);});
  it('maps route-only and overlapping seeds without adding them',()=>{const f=fresh();f.scenario.eventIds=['demo:route-event'];expect(run(f).seeds[0].stress).toBeCloseTo(.192,12);expect(run(f).holdingsResults[0].totalStress).toBeCloseTo(.08064,12);f.scenario.eventIds.push('demo:facility-event');expect(run(f).holdingsResults[0].totalStress).toBeCloseTo(.252,12);expect(run(f).paths).toHaveLength(8);});
  it('retains parallel paths, takes strongest, and prevents cycles',()=>{const f=fresh(),edge=f.dataset.commercialEdges[0];f.dataset.commercialEdges.push({...edge,id:'demo:parallel',dependencyWeight:.9},{...edge,id:'demo:cycle',supplierCompanyId:'demo:beacon',customerCompanyId:'demo:delta',supplyItemIds:[]});const r=run(f);expect(r.holdingsResults[0].totalStress).toBeCloseTo(.378,12);expect(r.paths.every(p=>new Set(p.companyIds).size===p.companyIds.length)).toBe(true);expect(r.totals.connectedCapital).toBe(9000000);});
  it('preserves structural zero and distinguishes unknown weights',()=>{const f=fresh();f.scenario.eventOverrides={'demo:facility-event':0};let r=run(f);expect(r.totals.connectedCapital).toBe(9000000);expect(r.totals.positiveStressConnectedCapital).toBe(0);f.dataset.commercialEdges[0].dependencyWeight=null;r=run(f);expect(r.holdingsResults[0].totalStress).toBeNull();expect(r.holdingsResults[0].recordedPath).toBe(true);});
  it('counts duplicate holdings once after merging their actual capital',()=>{const f=fresh();f.holdings[0].amount=2000000;f.holdings.push({...f.holdings[0],id:'second'});expect(run(f).totals.assumedWeightedExposure).toBeCloseTo(1334340,8);f.holdings.push({...f.holdings[0]});expect(()=>run(f)).toThrow('Duplicate holding');});
  it('compares fixed snapshots without mutating raw evidence',()=>{const base=run(fresh()),copy=structuredClone(base);const r=compareRun(base,'demo:aster','demo:evergreen',1000000);expect(r.proposed.totals.totalCapital).toBe(10000000);expect(r.proposed.totals.connectedCapital).toBe(8000000);expect(r.proposed.totals.assumedWeightedExposure).toBeCloseTo(1082340,8);expect(base).toEqual(copy);expect(r.proposed.sourceSnapshot).toEqual(base.sourceSnapshot);expect(()=>compareRun(base,'demo:aster','demo:evergreen',5000000)).toThrow();});
  it('quarantines incomplete shares and rejects inconsistent sums',()=>{const f=fresh();f.dataset.facilities[0].operationalShare=.5;expect(run(f).seeds[0].stress).toBeNull();f.dataset.facilities.push({...f.dataset.facilities[0],id:'second',operationalShare:.8});expect(()=>run(f)).toThrow('shares exceed');});
  it('reports traversal truncation',()=>{const f=fresh(),r=simulate(f.dataset,f.holdings,f.scenario,{maxPaths:2});expect(r.status).toBe('partial');expect(r.coverage.truncated).toBe(true);});
});
describe('portfolio, history and exports',()=>{
  it('previews CSV, preserves unsupported rows, requires review and merges duplicates',()=>{const p=previewCsv('name,amount\nAster Motors,2000000\nAster Motors,2000000\nUnknown,1000000',fixture.dataset.companies);expect(p.rows[2].matchingStatus).toBe('unmatched');expect(()=>commitPreview(p.rows,fixture.dataset.companies)).toThrow('explicitly exclude');p.rows[2].matchingStatus='excluded';p.rows[2].exclusionReason='Analyst exclusion';const h=commitPreview(p.rows,fixture.dataset.companies);expect(h).toHaveLength(2);expect(h[0].amount).toBe(4000000);});
  it.each(['', '-1','NaN','Infinity','1e309'])('rejects invalid amount %s',v=>expect(()=>parseAmount(v)).toThrow());
  it('rejects malformed CSV and mixed currency',()=>{expect(()=>previewCsv('name,amount\n"bad,1',fixture.dataset.companies)).toThrow();const p=previewCsv('name,amount,currency\nAster Motors,10,USD',fixture.dataset.companies);expect(()=>commitPreview(p.rows,fixture.dataset.companies)).toThrow();});
  it('makes immutable runs, bounds history and handles denied storage',async()=>{const f=fresh();const r=await new BrowserSimulationService().analyze({...f,requestId:'test'});expect(Object.isFrozen(r.sourceSnapshot)).toBe(true);const h=new RunHistory({getItem:()=>null,setItem:()=>{throw new Error('denied');}},2);h.save(r);h.save({...r,id:'2'});h.save({...r,id:'3'});expect(h.list()).toHaveLength(2);expect(h.warning).toContain('denied');const csv=exportCsv({...r,holdingsResults:r.holdingsResults.map(x=>({...x,originalInputName:'=CMD()'}))});expect(csv).toContain("'=CMD()");expect(csv).toContain('Synthetic / assumed');});
  it('rejects stale async responses after input changes',async()=>{const gate=new LatestRequest();let resolve;const pending=new Promise(r=>resolve=r);let accepted=false;const task=gate.run(()=>pending,()=>accepted=true);gate.invalidate();resolve({});expect(await task).toBe(false);expect(accepted).toBe(false);});
});

it('normalizes explicit lakh units and rejects ambiguous units',()=>{
 const p=previewCsv('name,amount,currency,unit\nAster Motors,40,INR,lakh\nEvergreen Services,1000000,INR,rupees',fixture.dataset.companies);
 expect(commitPreview(p.rows,fixture.dataset.companies).map(h=>h.amount)).toEqual([4000000,1000000]);
 const invalid=previewCsv('name,amount,unit\nAster Motors,40,crore',fixture.dataset.companies);
 expect(()=>commitPreview(invalid.rows,fixture.dataset.companies)).toThrow();
});
it('restores saved snapshots and persists deletion without mutating other reports',async()=>{
 let value=null;const storage={getItem:()=>value,setItem:(key,v)=>value=v};
 const r=await new BrowserSimulationService().analyze({...fresh(),requestId:'history'});
 const history=new RunHistory(storage);history.save(r);history.save({...r,id:'second'});
 const restored=new RunHistory(storage);expect(restored.get(r.id).totals.assumedWeightedExposure).toBeCloseTo(1334340,8);
 restored.delete(r.id);expect(new RunHistory(storage).get(r.id)).toBeNull();expect(new RunHistory(storage).get('second')).not.toBeNull();
});
