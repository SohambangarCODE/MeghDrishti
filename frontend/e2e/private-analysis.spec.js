import {test,expect,navigateWorkspace,loginWorkspace} from './authenticated-test.js';
import {readFileSync} from 'node:fs';
import {simulate,compareRun} from '../src/engine/demo/simulate.js';
test.use({samplePortfolio:false});
const fixture=JSON.parse(readFileSync(new URL('../src/fixtures/reference.json',import.meta.url),'utf8'));
const owner='11111111-1111-4111-8111-111111111111',runId='55555555-5555-4555-8555-555555555555';
export async function privateApi(page,{delayAnalysis=null}={}){
 const state={portfolio:null,run:null,analyses:[],comparisons:[],reads:0,deleted:0,portfolioDeletes:0,failOpen:false,failCompare:false,failDelete:false};
 await page.route('**/api/v1/private/**',async route=>{
  const path=new URL(route.request().url()).pathname,method=route.request().method();
  if(path.endsWith('/portfolios')){
   if(method==='GET')return route.fulfill({json:{schemaVersion:'1.0.0',portfolios:state.portfolio?[state.portfolio]:[]}});
   const p=route.request().postDataJSON();state.portfolio={id:p.id,name:p.name,dataset_version:p.scenario.datasetVersion,updated_at:'2026-10-10T00:00:00Z',draft:{holdings:p.holdings,scenario:p.scenario}};
   return route.fulfill({json:{schemaVersion:'1.0.0',portfolio:state.portfolio}});
  }
  if(path.endsWith('/analysis')){
   const body=route.request().postDataJSON();expect(Object.keys(body).sort()).toEqual(['portfolioId','requestId']);expect(body.portfolioId).toBe(state.portfolio.id);state.analyses.push(body);
   if(delayAnalysis)await delayAnalysis();
   state.run={...simulate(fixture.dataset,state.portfolio.draft.holdings,state.portfolio.draft.scenario),id:runId,inputHash:'mock-private-input-hash',completedAt:'2026-10-10T00:00:00Z',ownerId:owner,portfolioId:body.portfolioId,storage:'private Supabase snapshot'};
   return route.fulfill({json:{schemaVersion:'1.0.0',run:state.run}});
  }
  if(path.endsWith('/compare')){
   const body=route.request().postDataJSON();state.comparisons.push(body);
   expect(Object.keys(body).sort()).toEqual(['amount','fromCompanyId','requestId','runId','toCompanyId']);expect(body.runId).toBe(state.run.id);
   expect(route.request().headers().authorization).toMatch(/^Bearer /);
   if(state.failCompare)return route.fulfill({status:503,json:{error:{message:'Comparison unavailable'}}});
   return route.fulfill({json:{...compareRun(state.run,body.fromCompanyId,body.toCompanyId,body.amount),fixedInputHash:'mock-fixed-input-hash',schemaVersion:'1.0.0',requestId:body.requestId}});
  }
  if(state.portfolio&&path.endsWith('/portfolios/'+state.portfolio.id)&&method==='DELETE'){
   if(state.failDelete)return route.fulfill({status:503,json:{error:{message:'Deletion unavailable'}}});
   const id=state.portfolio.id;state.portfolio=null;state.run=null;state.portfolioDeletes++;
   return route.fulfill({json:{schemaVersion:'1.0.0',deleted:id}});
  }
  if(path.endsWith('/runs'))return route.fulfill({json:{schemaVersion:'1.0.0',runs:state.run?[{id:runId,portfolio_id:state.portfolio.id,created_at:state.run.completedAt,input_hash:state.run.inputHash}]:[]}});
  if(path.endsWith('/runs/'+runId)){
   if(method==='DELETE'){state.run=null;state.deleted++;return route.fulfill({json:{schemaVersion:'1.0.0',deleted:runId}});}
   state.reads++;return route.fulfill({status:state.failOpen?503:200,json:state.failOpen?{error:{message:'Database unavailable'}}:{schemaVersion:'1.0.0',run:state.run}});
  }
  return route.fulfill({status:404,json:{error:{message:'Unexpected private request'}}});
 });return state;
}
export async function savedPortfolio(page){
 await navigateWorkspace(page,'/portfolio');await page.getByRole('button',{name:'Load sample portfolio',exact:true}).click();
 await page.getByLabel('Portfolio Name',{exact:true}).fill('Private analysis marker');await page.getByRole('button',{name:'Save Portfolio',exact:true}).click();
 await expect(page.getByText('Saved successfully in Supabase.',{exact:true})).toBeVisible();
}
test('saved private analysis, reports, export and reopen stay out of local history',async({page})=>{
 const state=await privateApi(page);await savedPortfolio(page);
 const amount=page.getByLabel('Amount for Aster Motors');await amount.fill('3000000');await amount.press('Tab');
 await expect(page.getByRole('button',{name:'Analyze saved portfolio',exact:true})).toBeDisabled();expect(state.analyses).toHaveLength(0);
 await page.getByRole('button',{name:'Save Portfolio',exact:true}).click();await expect(page.getByText('Saved successfully in Supabase.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Analyze saved portfolio',exact:true}).click();await expect(page).toHaveURL('/results/'+runId);
 await expect(page.getByRole('heading',{name:'Analysis results',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Save report',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>localStorage.getItem('meghdrishti:runs:v1'))).toBeNull();expect(state.analyses).toHaveLength(1);
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();const stream=await(await downloading).createReadStream();let text='';for await(const chunk of stream)text+=chunk;
 expect(JSON.parse(text).ownerId).toBe(owner);
 await navigateWorkspace(page,'/reports');await expect(page.getByRole('heading',{name:'Private cloud reports',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Open private report '+runId,exact:true})).toBeVisible();await expect(page.getByText('No saved local snapshots.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/auth/);await expect(page.getByRole('heading',{name:'Private cloud reports',exact:true})).toHaveCount(0);
 await loginWorkspace(page,false);await navigateWorkspace(page,'/reports');state.failOpen=true;
 await page.getByRole('button',{name:'Open private report '+runId,exact:true}).click();await expect(page.getByRole('alert')).toContainText('Open failed');
 state.failOpen=false;await page.getByRole('button',{name:'Open private report '+runId,exact:true}).click();await expect(page).toHaveURL('/results/'+runId);expect(state.reads).toBe(2);
 await expect(page.getByText('Saved in Supabase.',{exact:false})).toBeVisible();expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain(runId);
 await navigateWorkspace(page,'/reports');await page.getByRole('button',{name:'Delete private report '+runId,exact:true}).click();expect(state.deleted).toBe(0);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(state.deleted).toBe(0);
 await page.getByRole('button',{name:'Delete private report '+runId,exact:true}).click();await page.getByRole('button',{name:'Confirm private report deletion',exact:true}).click();
 await expect(page.getByText('No private cloud reports yet.',{exact:false})).toBeVisible();expect(state.deleted).toBe(1);
});

test('private compare uses the selected immutable baseline and preserves navigation',async({page})=>{
 const state=await privateApi(page);await savedPortfolio(page);await page.getByRole('button',{name:'Analyze saved portfolio',exact:true}).click();await expect(page).toHaveURL('/results/'+runId);
 const baseline=structuredClone(state.run),saved=structuredClone(state.portfolio);
 await page.getByRole('link',{name:'Compare this snapshot',exact:true}).click();await expect(page).toHaveURL('/compare?run='+runId);
 await expect(page.getByLabel('Baseline snapshot')).toHaveValue(runId);await expect(page.getByLabel('Baseline snapshot').locator('option')).toHaveCount(1);
 await page.getByRole('combobox',{name:'From holding',exact:true}).selectOption('demo:aster');await page.getByRole('combobox',{name:'To holding',exact:true}).selectOption('demo:evergreen');
 state.failCompare=true;await page.getByRole('button',{name:'Compare transfer',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Comparison unavailable');
 state.failCompare=false;await page.getByRole('button',{name:'Compare transfer',exact:true}).click();await expect(page.getByText('₹10,82,340.00',{exact:true})).toBeVisible();
 await expect(page.getByText('₹1,00,00,000.00',{exact:true})).toHaveCount(3);expect(state.run).toEqual(baseline);expect(state.portfolio).toEqual(saved);
 expect(state.comparisons[1]).toMatchObject({runId,fromCompanyId:'demo:aster',toCompanyId:'demo:evergreen',amount:1000000});
 await expect(page.getByRole('button',{name:'Apply allocation to draft',exact:true})).toHaveCount(0);
 await page.getByRole('link',{name:'View selected baseline results',exact:true}).click();await expect(page).toHaveURL('/results/'+runId);
 await page.getByRole('link',{name:'Compare this snapshot',exact:true}).click();await expect(page.getByLabel('Baseline snapshot')).toHaveValue(runId);
 await navigateWorkspace(page,'/compare?run=missing-run');await expect(page.getByText('No different baseline is selected automatically.',{exact:false})).toBeVisible();
});

test('main workspace portfolio deletion confirms, preserves failed drafts and clears associated reports',async({page})=>{
 const state=await privateApi(page);await savedPortfolio(page);const id=state.portfolio.id;
 await page.getByRole('button',{name:'Analyze saved portfolio',exact:true}).click();await expect(page).toHaveURL('/results/'+runId);
 await navigateWorkspace(page,'/portfolio');await page.getByLabel('Saved private portfolio').selectOption(id);await page.getByRole('button',{name:'Delete portfolio and reports',exact:true}).click();
 await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(state.portfolioDeletes).toBe(0);
 state.failDelete=true;await page.getByRole('button',{name:'Delete portfolio and reports',exact:true}).click();await page.getByRole('button',{name:'Confirm portfolio deletion',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Deletion unavailable');await expect(page.getByLabel('Amount for Aster Motors')).toHaveValue('4000000');
 state.failDelete=false;await page.getByRole('button',{name:'Confirm portfolio deletion',exact:true}).click();await expect(page.getByText('Private portfolio and reports deleted.',{exact:true})).toBeVisible();
 await expect(page.getByText('No holdings.',{exact:false})).toBeVisible();expect(state.portfolioDeletes).toBe(1);expect(state.run).toBeNull();
 await navigateWorkspace(page,'/reports');await expect(page.getByText('No private cloud reports yet.',{exact:false})).toBeVisible();
 await navigateWorkspace(page,'/results/'+runId);await expect(page.getByRole('heading',{name:'Result snapshot unavailable',exact:true})).toBeVisible();
 await page.goto('/cloud');await expect(page).toHaveURL('/reports');await expect(page.getByRole('link',{name:'Private cloud workspace',exact:true})).toHaveCount(0);
});
test('late private analysis cannot restore a report after logout and login',async({page})=>{
 let release,notify;const gate=new Promise(r=>release=r),started=new Promise(r=>notify=r);
 await privateApi(page,{delayAnalysis:async()=>{notify();await gate;}});await savedPortfolio(page);
 await page.getByRole('button',{name:'Analyze saved portfolio',exact:true}).click();await started;await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/auth/);
 await loginWorkspace(page,false);release();await navigateWorkspace(page,'/results/'+runId);
 await expect(page.getByRole('heading',{name:'Result snapshot unavailable',exact:true})).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('meghdrishti:runs:v1'))).toBeNull();
});
