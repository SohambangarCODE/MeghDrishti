import { z } from 'zod';
import { Holding, Scenario } from '../../schemas/contracts.js';
import { normalizeHoldings } from '../../engine/demo/simulate.js';

export const PrivatePortfolio = z.object({
  id:z.string().uuid(), name:z.string().trim().min(1).max(200),
  dataset_version:z.string().min(1),
  updated_at:z.string().datetime({offset:true}),
  draft:z.object({holdings:z.array(Holding).min(1).max(1000),scenario:Scenario}),
}).passthrough().superRefine((p,ctx)=>{
  if(p.dataset_version!==p.draft.scenario.datasetVersion)ctx.addIssue({code:'custom',message:'Saved scenario and dataset versions differ'});
  if(p.draft.holdings.some(h=>h.portfolioId!==p.id))ctx.addIssue({code:'custom',message:'Saved holding belongs to a different portfolio'});
});

export function portfolioWrite(draft,dataset){
  const name=draft.name.trim();
  if(!name||name.length>200)throw new Error('Enter a portfolio name of 1–200 characters.');
  if(!draft.holdings.length)throw new Error('Add at least one holding before saving. Empty portfolios can be edited but cannot be saved by the current API.');
  if(draft.holdings.length>1000)throw new Error('Portfolio limit is 1,000 holdings.');
  const scenario=Scenario.parse(draft.scenario);
  if(scenario.datasetVersion!==dataset.datasetVersion)throw new Error('Portfolio dataset is still loading or does not match the scenario.');
  const holdings=normalizeHoldings(draft.holdings.map(h=>Holding.parse(h)),dataset.companies).map(h=>({...h,portfolioId:draft.id}));
  return {id:z.string().uuid().parse(draft.id),name,holdings,scenario};
}
