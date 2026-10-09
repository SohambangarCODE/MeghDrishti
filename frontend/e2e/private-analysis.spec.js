import {test,expect,navigateWorkspace,loginWorkspace} from './authenticated-test.js';
import {readFileSync} from 'node:fs';
import {simulate} from '../src/engine/demo/simulate.js';
test.use({samplePortfolio:false});
const fixture=JSON.parse(readFileSync(new URL('../src/fixtures/reference.json',import.meta.url),'utf8'));
const owner='11111111-1111-4111-8111-111111111111',runId='55555555-5555-4555-8555-555555555555';
async function privateApi(page,{delayAnalysis=null}={}){
 const state={portfolio:null,run:null,analyses:[],reads:0,deleted:0,failOpen:false};
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
  if(path.endsWith('/runs'))return route.fulfill({json:{schemaVersion:'1.0.0',runs:state.run?[{id:runId,portfolio_id:state.portfolio.id,created_at:state.run.completedAt,input_hash:state.run.inputHash}]:[]}});
  if(path.endsWith('/runs/'+runId)){
   if(method==='DELETE'){state.run=null;state.deleted++;return route.fulfill({json:{schemaVersion:'1.0.0',deleted:runId}});}
   state.reads++;return route.fulfill({status:state.failOpen?503:200,json:state.failOpen?{error:{message:'Database unavailable'}}:{schemaVersion:'1.0.0',run:state.run}});
  }
  return route.fulfill({status:404,json:{error:{message:'Unexpected private request'}}});
 });return state;
}
async function savedPortfolio(page){
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
test('late private analysis cannot restore a report after logout and login',async({page})=>{
 let release,notify;const gate=new Promise(r=>release=r),started=new Promise(r=>notify=r);
 await privateApi(page,{delayAnalysis:async()=>{notify();await gate;}});await savedPortfolio(page);
 await page.getByRole('button',{name:'Analyze saved portfolio',exact:true}).click();await started;await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/auth/);
 await loginWorkspace(page,false);release();await navigateWorkspace(page,'/results/'+runId);
 await expect(page.getByRole('heading',{name:'Result snapshot unavailable',exact:true})).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('meghdrishti:runs:v1'))).toBeNull();
});
