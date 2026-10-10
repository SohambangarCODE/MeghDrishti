import fs from 'node:fs';
import { simulate } from '../src/engine/demo/simulate.js';
const f=JSON.parse(fs.readFileSync(0,'utf8'));
process.stdout.write(JSON.stringify(simulate(f.dataset,f.holdings,f.scenario)));
