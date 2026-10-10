import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {summarizeCoverage,coverageHash,CoverageReport,getInstalledCoverage} from '../services/coverage.js';
const cases=JSON.parse(readFileSync(new URL('../../../backend/tests/fixtures/coverage-cases.json',import.meta.url),'utf8'));
const values=r=>Object.fromEntries(r.metrics.map(m=>[m.id,m.numerator]));
describe('evidence completeness',()=>{
 it('public request helper rejects a snapshot before making a network request',async()=>{
  await expect(getInstalledCoverage(cases.mixed)).rejects.toThrow('installed dataset identifier only');
 });
 for(const name of ['mixed','empty'])it(name+' evidence states and immutability',async()=>{
  const d=structuredClone(cases[name]),before=JSON.stringify(d),r=CoverageReport.parse(await summarizeCoverage(d));
  expect(values(r)).toEqual(name==='mixed'?cases.expectedMixed:Object.fromEntries(Object.keys(cases.expectedMixed).map(k=>[k,0])));
  expect(JSON.stringify(d)).toBe(before);expect(await summarizeCoverage(d)).toEqual(r);
  if(name==='empty')expect(r.metrics.every(m=>m.denominator===0)).toBe(true);
  else expect(r.companies.map(c=>c.id)).toEqual(['001','002','003']);
 });
 it('rejects incomplete snapshot and untrusted coverage counts',async()=>{
  const d=structuredClone(cases.mixed);delete d.facilities;await expect(summarizeCoverage(d)).rejects.toThrow();
  const r=await summarizeCoverage(cases.mixed);r.metrics[0].denominator=100;expect(()=>CoverageReport.parse(r)).toThrow();
 });
 it('does not upgrade raw null or generic source attribution',async()=>{
  const d=structuredClone(cases.mixed);d.facilities[0].sourceFields.operational_share=null;expect(values(await summarizeCoverage(d)).measuredOperationalShares).toBe(0);
  d.facilities[0].evidenceIds=['generic'];expect(values(await summarizeCoverage(d)).sourcedCoordinates).toBe(0);
 });
 it('hash ignores object insertion order but distinguishes content',async()=>{
  const d=structuredClone(cases.mixed),before=await coverageHash(d);expect(await coverageHash(Object.fromEntries(Object.entries(d).reverse()))).toBe(before);
  d.companies[0].name='different';expect(await coverageHash(d)).not.toBe(before);
 });
});
