import {test,expect,navigateWorkspace} from './authenticated-test.js';
import {readFileSync} from 'node:fs';
import {simulate,compareRun} from '../src/engine/demo/simulate.js';
const pointer=JSON.parse(readFileSync(new URL('../../backend/data/normalized/climateweb/active.json',import.meta.url)));
const fixture=JSON.parse(readFileSync(new URL('../../backend/data/normalized/climateweb/'+pointer.file,import.meta.url)));
test.use({samplePortfolio:false});
test('Sectivia investment sample loads without saving, confirms replacement and exercises private workflow',async({page})=>{
 test.setTimeout(60000);
 let portfolio=null,run=null,writes=0,analyses=0;
 const owner='11111111-1111-4111-8111-111111111111',id='55555555-5555-4555-8555-555555555555';
 await page.route('**/api/v1/private/**',async r=>{
  const p=new URL(r.request().url()).pathname;
  expect(r.request().headers().authorization).toMatch(/^Bearer /);
  if(p.endsWith('/portfolios')){
   if(r.request().method()==='GET')return r.fulfill({json:{schemaVersion:'1.0.0',portfolios:portfolio?[portfolio]:[]}});
   writes++;const body=r.request().postDataJSON();portfolio={id:body.id,name:body.name,dataset_version:body.scenario.datasetVersion,updated_at:new Date().toISOString(),draft:{holdings:body.holdings,scenario:body.scenario}};
   return r.fulfill({json:{schemaVersion:'1.0.0',portfolio}});
  }
  if(p.endsWith('/analysis')){
   analyses++;expect(portfolio.dataset_version).toBe(fixture.dataset.datasetVersion);
   run={...simulate(fixture.dataset,portfolio.draft.holdings,portfolio.draft.scenario),id,inputHash:'sample-test',completedAt:new Date().toISOString(),ownerId:owner,portfolioId:portfolio.id,storage:'private Supabase snapshot'};
   return r.fulfill({json:{schemaVersion:'1.0.0',run}});
  }
  if(p.endsWith('/assessment'))return r.fulfill({json:{schemaVersion:'1.0.0',runId:id,status:'available',model:'mock-Gemini',disclosure:'AI-generated interpretation of modeled results.',sections:[{id:'executiveSummary',title:'Executive summary',statements:[{factId:'exposure',text:'Sectivia snapshot assessment.'}]}]}});
  if(p.endsWith('/compare')){const b=r.request().postDataJSON();return r.fulfill({json:{...compareRun(run,b.fromCompanyId,b.toCompanyId,b.amount),fixedInputHash:'sample-fixed',schemaVersion:'1.0.0',requestId:b.requestId}});}
  if(p.endsWith('/runs'))return r.fulfill({json:{schemaVersion:'1.0.0',runs:run?[{id,portfolio_id:portfolio.id,created_at:run.completedAt,input_hash:run.inputHash}]:[]}});
  if(p.endsWith('/runs/'+id))return r.fulfill({json:{schemaVersion:'1.0.0',run}});
  return r.fulfill({status:404,json:{error:{message:'Unexpected test request'}}});
 });
 await navigateWorkspace(page,'/portfolio');
 await page.getByRole('button',{name:'Load Sample Investment Portfolio',exact:true}).click();
 await expect(page.getByRole('combobox',{name:'Dataset',exact:true})).toHaveValue('climateweb');
 for(const h of fixture.holdings)await expect(page.getByLabel('Amount for '+h.originalInputName,{exact:true})).toHaveValue(String(h.amount));
 expect(writes).toBe(0);expect(analyses).toBe(0);await expect(page.getByText('₹1,00,00,000.00',{exact:true}).last()).toBeVisible();
 await expect(page.getByRole('button',{name:'Analyze saved portfolio',exact:true})).toBeDisabled();
 const before=await page.getByLabel('Portfolio Name',{exact:true}).inputValue();
 page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Load Sample Investment Portfolio',exact:true}).click();
 await expect(page.getByLabel('Portfolio Name',{exact:true})).toHaveValue(before);
 await page.getByRole('button',{name:'Save Portfolio',exact:true}).click();await expect(page.getByText('Saved successfully in Supabase.',{exact:true})).toBeVisible();
 expect(writes).toBe(1);expect(portfolio.draft.holdings.map(h=>h.companyId)).toEqual(['a','abbv','cah','cvs']);
 await page.getByRole('button',{name:'Analyze saved portfolio',exact:true}).click();await expect(page).toHaveURL('/results/'+id);
 await expect(page.getByRole('heading',{name:'Analysis results',exact:true})).toBeVisible();expect(run.sourceSnapshot.datasetVersion).toBe(fixture.dataset.datasetVersion);
 await page.getByRole('button',{name:'Generate AI Assessment',exact:true}).click();await expect(page.getByText('Sectivia snapshot assessment.',{exact:true})).toBeVisible();
 await navigateWorkspace(page,'/graph?run='+id);await expect(page.getByRole('heading',{name:'Exposure graph',exact:true})).toBeVisible();await expect(page.locator('.react-flow__node')).not.toHaveCount(0);
 await navigateWorkspace(page,'/locations?run='+id);await expect(page.getByRole('heading',{name:'Operational locations',exact:true})).toBeVisible();
 await navigateWorkspace(page,'/compare?run='+id);await page.getByRole('combobox',{name:'From holding',exact:true}).selectOption('abbv');await page.getByRole('combobox',{name:'To holding',exact:true}).selectOption('cvs');await page.getByRole('button',{name:'Compare transfer',exact:true}).click();await expect(page.getByRole('button',{name:'Reset comparison',exact:true})).toBeVisible();await expect(page.getByText('Total capital preserved.',{exact:false})).toBeVisible();
 await navigateWorkspace(page,'/reports');await page.getByRole('button',{name:'Open private report '+id,exact:true}).click();await expect(page).toHaveURL('/results/'+id);
 expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain(id);
});



