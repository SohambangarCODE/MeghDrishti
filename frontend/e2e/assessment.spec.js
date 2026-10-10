import {test,expect,navigateWorkspace,loginWorkspace} from './authenticated-test.js';
import {readFileSync} from 'node:fs';
import {BrowserSimulationService} from '../src/services/mock/BrowserSimulationService.js';
const fixture=JSON.parse(readFileSync(new URL('../src/fixtures/reference.json',import.meta.url),'utf8'));
test.use({samplePortfolio:false});
async function openRun(page){
 const run={...await new BrowserSimulationService().analyze({...fixture,requestId:'assessment-browser'}),ownerId:'11111111-1111-4111-8111-111111111111',storage:'private Supabase snapshot'};
 await page.route('**/api/v1/private/runs',r=>r.fulfill({json:{schemaVersion:'1.0.0',runs:[{id:run.id,portfolio_id:run.portfolioId,created_at:run.completedAt,input_hash:run.inputHash}]}}));
 await page.route('**/api/v1/private/runs/'+run.id,r=>r.fulfill({json:{schemaVersion:'1.0.0',run}}));
 await navigateWorkspace(page,'/reports');await page.getByRole('button',{name:'Open private report '+run.id,exact:true}).click();
 await expect(page).toHaveURL('/results/'+run.id);return run;
}
const assessment=run=>({schemaVersion:'1.0.0',status:'available',runId:run.id,model:'mock-gemini',disclosure:'AI-generated interpretation of modeled results.',sections:[{id:'executiveSummary',title:'Executive summary',statements:[{factId:'exposure',text:'Private assessment for the selected snapshot.'}]}]});
test('Results requests authenticated assessment, renders sections and preserves private snapshot',async({page})=>{
 const run=await openRun(page);let requests=0;
 await page.route('**/api/v1/private/runs/'+run.id+'/assessment',async r=>{
  requests++;expect(r.request().method()).toBe('POST');expect(r.request().headers().authorization).toMatch(/^Bearer /);expect(r.request().postData()).toBeNull();
  await new Promise(resolve=>setTimeout(resolve,250));return r.fulfill({json:assessment(run)});
 });
 await page.getByRole('button',{name:'Generate AI Assessment',exact:true}).click();
 await expect(page.getByRole('button',{name:'Generating AI assessment...',exact:true})).toBeDisabled();
 await expect(page.getByRole('region',{name:'Generated AI assessment',exact:true})).toContainText('Private assessment for the selected snapshot.');
 await expect(page.getByRole('heading',{name:'Holding-level results',exact:true})).toBeVisible();expect(requests).toBe(1);
 expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('Private assessment');
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await loginWorkspace(page,false);
 await navigateWorkspace(page,'/results/'+run.id);await expect(page.getByText('Private assessment for the selected snapshot.')).toHaveCount(0);
});
test('Quota failure leaves Results functional and allows retry',async({page})=>{
 const run=await openRun(page);
 await page.route('**/api/v1/private/runs/'+run.id+'/assessment',r=>r.fulfill({json:{schemaVersion:'1.0.0',runId:run.id,status:'unavailable',sections:[],error:{code:'QUOTA',message:'Gemini quota or rate limit reached.'}}}));
 await page.getByRole('button',{name:'Generate AI Assessment',exact:true}).click();await expect(page.getByText('Gemini quota or rate limit reached.',{exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Holding-level results',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Generate AI Assessment',exact:true})).toBeEnabled();
});
test('Delayed private assessment is discarded after logout',async({page})=>{
 const run=await openRun(page);let release;let started;const requested=new Promise(resolve=>started=resolve),blocked=new Promise(resolve=>release=resolve);
 await page.route('**/api/v1/private/runs/'+run.id+'/assessment',async r=>{started();await blocked;try{await r.fulfill({json:assessment(run)});}catch{}});
 await page.getByRole('button',{name:'Generate AI Assessment',exact:true}).click();await requested;
 await page.getByRole('button',{name:'Sign out',exact:true}).click();release();await loginWorkspace(page,false);
 await navigateWorkspace(page,'/results/'+run.id);await expect(page.getByText('Private assessment for the selected snapshot.')).toHaveCount(0);
});
