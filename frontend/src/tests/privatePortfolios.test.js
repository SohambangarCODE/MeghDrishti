import {it,expect} from 'vitest';
import fixture from '../fixtures/reference.json';
import {PrivatePortfolio,portfolioWrite} from '../services/live/privatePortfolios.js';
const id='33333333-3333-4333-8333-333333333333';
const draft=()=>({id,name:'  My portfolio  ',holdings:structuredClone(fixture.holdings),scenario:structuredClone(fixture.scenario)});
it('preserves IDs, decimals and scenario provenance in the authenticated write contract',()=>{
 const input=draft();input.holdings[0].amount=123.45;
 const body=portfolioWrite(input,fixture.dataset);
 expect(body.name).toBe('My portfolio');expect(body.id).toBe(id);
 expect(body.holdings[0].amount).toBe(123.45);expect(body.holdings[0].companyId).toBe(input.holdings[0].companyId);
 expect(body.holdings.every(h=>h.portfolioId===id&&h.currency==='INR')).toBe(true);
 expect(body.scenario).toMatchObject(input.scenario);expect(input.holdings[0].portfolioId).not.toBe(id);
});
it('rejects invalid names, empty holdings, unsupported companies, currencies and versions',()=>{
 for(const modify of [d=>d.name='',d=>d.holdings=[],d=>d.holdings[0].companyId='unknown',d=>d.holdings[0].currency='USD',d=>d.scenario.datasetVersion='other']){
  const input=draft();modify(input);expect(()=>portfolioWrite(input,fixture.dataset)).toThrow();
 }
});
it('rejects inconsistent authoritative responses before replacing the current draft',()=>{
 const body=portfolioWrite(draft(),fixture.dataset);
 const row={id,name:body.name,dataset_version:fixture.dataset.datasetVersion,updated_at:'2026-10-10T00:00:00Z',draft:{holdings:body.holdings,scenario:body.scenario}};
 expect(PrivatePortfolio.parse(row).id).toBe(id);
 expect(()=>PrivatePortfolio.parse({...row,dataset_version:'other'})).toThrow();
 const wrong=structuredClone(row);wrong.draft.holdings[0].portfolioId='other';expect(()=>PrivatePortfolio.parse(wrong)).toThrow();
 expect(()=>PrivatePortfolio.parse({...row,updated_at:null})).toThrow();
});
