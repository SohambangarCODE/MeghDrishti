import {test,expect,loginWorkspace} from './authenticated-test.js';
import {readFileSync} from 'node:fs';
test.use({samplePortfolio:false});
const fixture=JSON.parse(readFileSync(new URL('../src/fixtures/reference.json',import.meta.url),'utf8'));
const savedRow=(id,name)=>({id,name,owner_id:'11111111-1111-4111-8111-111111111111',dataset_version:fixture.dataset.datasetVersion,
 updated_at:'2026-10-10T00:00:00Z',draft:{holdings:fixture.holdings.map(h=>({...h,portfolioId:id})),scenario:fixture.scenario}});
async function mockPortfolios(page,{records=[],failSave=false,failList=false,delaySave=null}={}){
 const state={records,writes:[],failSave,failList};
 await page.route('**/api/v1/private/portfolios',async r=>{
  if(r.request().method()==='GET')return r.fulfill({status:state.failList?503:200,json:state.failList?{error:{message:'Database unavailable'}}:{schemaVersion:'1.0.0',portfolios:state.records}});
  const body=r.request().postDataJSON();state.writes.push(body);expect(Object.keys(body).sort()).toEqual(['holdings','id','name','scenario']);
  if(delaySave)await delaySave();
  if(state.failSave)return r.fulfill({status:503,json:{error:{message:'Database unavailable'}}});
  const row={id:body.id,name:body.name,updated_at:'2026-10-10T01:00:00Z',dataset_version:body.scenario.datasetVersion,draft:{holdings:body.holdings,scenario:body.scenario}};
  state.records=[row,...state.records.filter(p=>p.id!==row.id)];
  return r.fulfill({json:{schemaVersion:'1.0.0',portfolio:row}});
 });return state;
}
async function addHolding(page,name='Test Portfolio A'){
 await page.getByLabel('Portfolio Name',{exact:true}).fill(name);
 await page.getByLabel('Company search',{exact:true}).fill('Aster Motors');
 await page.getByLabel('Investment amount (INR)',{exact:true}).fill('123.45');
 await page.getByRole('button',{name:'Add holding',exact:true}).click();
}
test('empty initial state, create/update same identity, refresh and reopen',async({page})=>{
 const state=await mockPortfolios(page);await page.goto('/portfolio');
 await page.evaluate(()=>localStorage.setItem('meghdrishti:draft:synthetic-1.0.0',JSON.stringify({name:'legacy private draft',holdings:[{amount:999}]})));
 await page.reload();expect(await page.evaluate(()=>localStorage.getItem('meghdrishti:draft:synthetic-1.0.0'))).toBeNull();
 await expect(page.getByText('No holdings.',{exact:false})).toBeVisible();await expect(page.getByLabel('Amount for Aster Motors')).toHaveCount(0);
 await page.getByRole('button',{name:'Save Portfolio',exact:true}).click();await expect(page.getByRole('alert')).toContainText('portfolio name');expect(state.writes).toHaveLength(0);
 await addHolding(page);await expect(page.getByText('Unsaved Changes',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Save Portfolio',exact:true}).click();await expect(page.getByText('Saved successfully in Supabase.',{exact:true})).toBeVisible();
 expect(state.writes[0].holdings[0].amount).toBe(123.45);const id=state.writes[0].id;
 const amount=page.getByLabel('Amount for Aster Motors');await amount.fill('456.78');await amount.press('Tab');
 await expect(page.getByText('Unsaved Changes',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Save Portfolio',exact:true}).click();
 await expect.poll(()=>state.writes.length).toBe(2);await expect(page.getByText('Saved successfully in Supabase.',{exact:true})).toBeVisible();
 expect(state.writes[1].id).toBe(id);expect(state.records).toHaveLength(1);
 expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('Test Portfolio A');
 await page.reload();await expect(page.getByText('No holdings.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Refresh My Portfolios',exact:true}).click();await page.getByLabel('Saved private portfolio').selectOption(id);await page.getByRole('button',{name:'Open Portfolio',exact:true}).click();
 await expect(page.getByLabel('Portfolio Name',{exact:true})).toHaveValue('Test Portfolio A');await expect(page.getByLabel('Amount for Aster Motors')).toHaveValue('456.78');
 await page.getByRole('button',{name:'Create Portfolio',exact:true}).click();await expect(page.getByText('No holdings.',{exact:false})).toBeVisible();await addHolding(page,'Second portfolio');
 await page.getByRole('button',{name:'Save Portfolio',exact:true}).click();await expect.poll(()=>state.writes.length).toBe(3);expect(state.writes[2].id).not.toBe(id);
});

test('opening an imported portfolio selects its dataset and edits keep its saved identity',async({page})=>{
 const response=await page.request.get('http://127.0.0.1:8000/api/v1/demo?datasetId=climateweb');expect(response.ok()).toBe(true);
 const imported=await response.json(),id='44444444-4444-4444-8444-444444444444';
 const row={id,name:'Imported private portfolio',dataset_version:imported.dataset.datasetVersion,updated_at:'2026-10-10T00:00:00Z',draft:{holdings:imported.holdings.map(h=>({...h,portfolioId:id})),scenario:imported.scenario}};
 const state=await mockPortfolios(page,{records:[row]});await page.goto('/portfolio');
 await page.getByRole('button',{name:'Refresh My Portfolios',exact:true}).click();await page.getByLabel('Saved private portfolio').selectOption(id);await page.getByRole('button',{name:'Open Portfolio',exact:true}).click();
 await expect(page.getByLabel('Dataset',{exact:true})).toHaveValue('climateweb');await expect(page.getByLabel('Amount for Agilent Technologies')).toBeVisible();
 await page.getByRole('button',{name:'Remove Agilent Technologies',exact:true}).click();await expect(page.getByText('Unsaved Changes',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Save Portfolio',exact:true}).click();await expect(page.getByText('Saved successfully in Supabase.',{exact:true})).toBeVisible();
 expect(state.writes[0].id).toBe(id);expect(state.writes[0].scenario.datasetVersion).toBe(imported.dataset.datasetVersion);expect(state.writes[0].holdings).toHaveLength(imported.holdings.length-1);
});
test('failed save/load preserves edits and switching requires confirmation',async({page})=>{
 const id='33333333-3333-4333-8333-333333333333';const state=await mockPortfolios(page,{records:[savedRow(id,'Previously saved')],failSave:true});
 await page.goto('/portfolio');await addHolding(page,'Keep my edits');
 await page.getByRole('button',{name:'Save Portfolio',exact:true}).click();await expect(page.getByRole('alert')).toContainText('unsaved changes were retained');
 await expect(page.getByLabel('Portfolio Name',{exact:true})).toHaveValue('Keep my edits');await expect(page.getByText('Unsaved Changes',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Refresh My Portfolios',exact:true}).click();await page.getByLabel('Saved private portfolio').selectOption(id);
 page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Open Portfolio',exact:true}).click();await expect(page.getByLabel('Portfolio Name',{exact:true})).toHaveValue('Keep my edits');
 state.failList=true;page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Open Portfolio',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Open failed'})).toBeVisible();
 await expect(page.getByLabel('Amount for Aster Motors')).toHaveValue('123.45');
 state.failList=false;page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Open Portfolio',exact:true}).click();await expect(page.getByLabel('Portfolio Name',{exact:true})).toHaveValue('Previously saved');
 await expect(page.getByText('Unsaved Changes',{exact:true})).toHaveCount(0);expect(state.writes).toHaveLength(1);
});
test('sample selection is explicit and saved samples keep provenance',async({page})=>{
 const state=await mockPortfolios(page);await page.goto('/portfolio');await page.getByRole('button',{name:'Load sample portfolio',exact:true}).click();
 await expect(page.getByLabel('Amount for Aster Motors')).toHaveValue('4000000');await expect(page.getByText('Mode: Explicit synthetic sample.',{exact:false})).toBeVisible();expect(state.writes).toHaveLength(0);
 await page.getByRole('button',{name:'Save Portfolio',exact:true}).click();await expect(page.getByText('Saved successfully in Supabase.',{exact:true})).toBeVisible();
 expect(state.writes[0].scenario.mode).toBe('demo');expect(state.writes[0].scenario.datasetVersion).toBe(fixture.dataset.datasetVersion);
 await expect(page.getByRole('button',{name:'Run synthetic analysis',exact:true})).toBeDisabled();
});
test('late save cannot populate a new login session',async({page})=>{
 let release,notify;const gate=new Promise(r=>release=r),started=new Promise(r=>notify=r);
 await mockPortfolios(page,{delaySave:async()=>{notify();await gate;}});await page.goto('/portfolio');await addHolding(page,'Private stale marker');
 await page.getByRole('button',{name:'Save Portfolio',exact:true}).click();await started;
 await expect(page.getByRole('button',{name:'Saving Portfolio...',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/auth/);release();
 await loginWorkspace(page,false);await page.goto('/portfolio');await expect(page.getByLabel('Portfolio Name',{exact:true})).toHaveValue('');await expect(page.getByText('No holdings.',{exact:false})).toBeVisible();
 expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('Private stale marker');
});

test('account change rejects an earlier account load and clears its draft and list',async({page})=>{
 const id='33333333-3333-4333-8333-333333333333';
 await mockPortfolios(page,{records:[savedRow(id,'User A private')]});await page.goto('/portfolio');
 await addHolding(page,'User A unsaved');await page.getByRole('button',{name:'Refresh My Portfolios',exact:true}).click();
 await page.getByLabel('Saved private portfolio').selectOption(id);
 let release,notify;const gate=new Promise(r=>release=r),started=new Promise(r=>notify=r);
 await page.route('**/api/v1/private/portfolios',async r=>{notify();await gate;return r.fulfill({json:{schemaVersion:'1.0.0',portfolios:[savedRow(id,'User A private')]}});});
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Open Portfolio',exact:true}).click();await started;
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/auth/);
 await page.route('**/api/v1/private/portfolios',r=>r.fulfill({json:{schemaVersion:'1.0.0',portfolios:[]}}));
 await page.route('**/auth/v1/token?grant_type=password',r=>r.fulfill({json:{access_token:'mock-account-b-token',refresh_token:'mock-b-refresh',expires_in:3600,token_type:'bearer',user:{id:'22222222-2222-4222-8222-222222222222',email:'second@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}}}}));
 await loginWorkspace(page,false);await page.goto('/portfolio');release();
 await expect(page.getByText('Signed in as second@example.test',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Portfolio Name',{exact:true})).toHaveValue('');await expect(page.getByText('No holdings.',{exact:false})).toBeVisible();
 await expect(page.getByLabel('Saved private portfolio').locator('option')).toHaveCount(1);
});

test('invalid saved responses do not overwrite the draft and session expiry clears it',async({page})=>{
 const id='33333333-3333-4333-8333-333333333333',row=savedRow(id,'Broken row');row.dataset_version='wrong';
 await mockPortfolios(page,{records:[row]});await page.goto('/portfolio');await addHolding(page,'Keep valid edits');
 await page.getByRole('button',{name:'Refresh My Portfolios',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Could not load My Portfolios');
 await expect(page.getByLabel('Portfolio Name',{exact:true})).toHaveValue('Keep valid edits');
 await page.evaluate(()=>window.dispatchEvent(new Event('meghdrishti:session-expired')));await expect(page).toHaveURL(/auth/);
 await loginWorkspace(page,false);await page.goto('/portfolio');await expect(page.getByLabel('Portfolio Name',{exact:true})).toHaveValue('');
 await expect(page.getByText('No holdings.',{exact:false})).toBeVisible();
});
