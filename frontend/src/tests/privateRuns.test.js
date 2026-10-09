import {it,expect} from 'vitest';
import {requireSavedPortfolio,validatePrivateRun} from '../services/live/privateRuns.js';
import {RunHistory} from '../state/history.js';
import {simulate} from '../engine/demo/simulate.js';
import fixture from '../fixtures/reference.json';
const owner='11111111-1111-4111-8111-111111111111';
const run=()=>({...simulate(fixture.dataset,fixture.holdings,fixture.scenario),id:'mock-run',inputHash:'mock-hash',completedAt:'2026-10-10T00:00:00Z',ownerId:owner,storage:'private Supabase snapshot'});
it('rejects unsaved private analysis even when a saved ID exists',()=>{
 expect(()=>requireSavedPortfolio({isDirty:true,activePortfolioId:'saved-id',lastSavedAt:'saved'})).toThrow('Save your unsaved');
 expect(()=>requireSavedPortfolio({isDirty:false,activePortfolioId:'new-id',lastSavedAt:null})).toThrow('Save or open');
 expect(()=>requireSavedPortfolio({isDirty:false,activePortfolioId:'saved-id',lastSavedAt:'saved'})).not.toThrow();
});
it('validates private report identity and rejects another account or selection',()=>{
 const value=run(),response={schemaVersion:'1.0.0',run:value};
 expect(validatePrivateRun(response,owner,value.id).id).toBe(value.id);
 expect(()=>validatePrivateRun(response,'other-owner')).toThrow('session');
 expect(()=>validatePrivateRun(response,owner,'wrong-id')).toThrow('selection');
});
it('cannot persist a private snapshot through local history',()=>{
 const writes=[],history=new RunHistory({getItem:()=>null,setItem:(...args)=>writes.push(args)});
 expect(()=>history.save(run())).toThrow('Private reports');expect(writes).toHaveLength(0);expect(history.list()).toEqual([]);
});
it('retains legacy backend demo reports with their demo session owner',()=>{
 const value={...run(),ownerId:'demo-session-capability',storage:'temporary backend demo memory'},history=new RunHistory(null);
 history.save(value);expect(history.get(value.id).storage).toBe('temporary backend demo memory');
});
