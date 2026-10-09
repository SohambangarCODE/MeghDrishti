import fs from 'node:fs';
import { simulate,compareRun } from '../frontend/src/engine/demo/simulate.js';
const f=JSON.parse(fs.readFileSync(new URL('../frontend/src/fixtures/reference.json',import.meta.url),'utf8'));
const baseline=simulate(f.dataset,f.holdings,f.scenario);
console.log(JSON.stringify({label:'Demo simulation — synthetic assumptions',baseline:baseline.totals,transfer:compareRun(baseline,'demo:aster','demo:evergreen',1000000).proposed.totals},null,2));
