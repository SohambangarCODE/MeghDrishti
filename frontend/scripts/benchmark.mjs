import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { simulate } from '../src/engine/demo/simulate.js';
const f=JSON.parse(fs.readFileSync(new URL('../src/fixtures/reference.json',import.meta.url),'utf8'));
for(let i=0;i<20;i++)simulate(f.dataset,f.holdings,f.scenario);
const times=[];
for(let i=0;i<500;i++){const start=performance.now();simulate(f.dataset,f.holdings,f.scenario);times.push(performance.now()-start);}
times.sort((a,b)=>a-b);
console.log(JSON.stringify({engine:'browser engine in Node',runtime:process.version,companies:f.dataset.companies.length,edges:f.dataset.commercialEdges.length,holdings:f.holdings.length,iterations:times.length,p50ms:times[250],p95ms:times[475]},null,2));
