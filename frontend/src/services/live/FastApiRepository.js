import { validateDataset, Holding, Scenario } from '../../schemas/contracts.js';
export class FastApiRepository {
  constructor(baseUrl){this.baseUrl=baseUrl.replace(/\/$/,'');}
  async catalog(){const r=await fetch(`${this.baseUrl}/api/v1/datasets`);if(!r.ok)throw new Error('Dataset catalog unavailable');return (await r.json()).datasets;}
  async load(datasetId='reference'){
    const response=await fetch(`${this.baseUrl}/api/v1/demo?datasetId=${encodeURIComponent(datasetId)}`,{signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error(`Demo dataset API unavailable (${response.status})`);
    const value=await response.json();
    validateDataset(value.dataset);value.holdings=value.holdings.map(h=>Holding.parse(h));value.scenario=Scenario.parse(value.scenario);
    return value;
  }
}
