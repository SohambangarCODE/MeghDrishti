import {test,expect,navigateWorkspace,loginWorkspace} from './authenticated-test.js';
import {readFileSync} from 'node:fs';
import {BrowserSimulationService} from '../src/services/mock/BrowserSimulationService.js';
import {summarizeCoverage} from '../src/services/coverage.js';
test.use({samplePortfolio:false});
const fixture=JSON.parse(readFileSync(new URL('../src/fixtures/reference.json',import.meta.url),'utf8'));
const section=page=>page.getByRole('region',{name:'Dataset completeness',exact:true});
const row=(page,name)=>section(page).getByRole('row').filter({has:page.getByRole('rowheader',{name,exact:true})});

test('Evidence follows installed dataset selection and shows evidence separately from demo parameters',async({page})=>{
 await navigateWorkspace(page,'/evidence');
 await expect(section(page).getByText('Unique records: 5 companies',{exact:false})).toBeVisible();
 await expect(row(page,'Companies with sourced operating coordinates')).toContainText('0 / 5 companies');
 await page.getByRole('combobox',{name:'Dataset',exact:true}).selectOption('climateweb');
 await expect(section(page).getByText('Unique records: 215 companies, 350 commercial relationships, 327 facilities, 4 corridors, 215 route usages and 4 regions.',{exact:true})).toBeVisible();
 await expect(row(page,'Companies with recorded commercial relationships')).toContainText('192 / 215 companies');
 await expect(row(page,'Companies with sourced operating coordinates')).toContainText('0 / 215 companies');
 await expect(row(page,'Commercial relationships using assumed weights')).toContainText('350 / 350 commercial relationships');
 await expect(row(page,'Commercial relationships with missing effective demo weights')).toContainText('0 / 350 commercial relationships');
 await expect(row(page,'Commercial relationships with unknown measured dependence')).toContainText('350 / 350 commercial relationships');
 await expect(section(page).getByText('Company weather evidence: unavailable.',{exact:false})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

for(const ending of ['logout','account change'])test('private immutable coverage stays local and clears on '+ending,async({page})=>{
 let phase='installed';const publicRequests=[];
 await page.route('**/api/v1/datasets/coverage?**',async r=>{
  publicRequests.push({phase,url:r.request().url(),method:r.request().method(),body:r.request().postData()});await r.continue();
 });
 // Dataset switching loads a fixture, then AppState reloads its selected ID.
 // Force the second load to finish after the first coverage table is visible.
 let loads=0,releaseReload;const reloadGate=new Promise(r=>releaseReload=r);
 await page.route('**/api/v1/demo?datasetId=climateweb',async r=>{if(++loads===2)await reloadGate;await r.continue();});
 await navigateWorkspace(page,'/evidence');await page.getByRole('combobox',{name:'Dataset',exact:true}).selectOption('climateweb');
 await expect(section(page).getByText('Unique records: 215 companies',{exact:false})).toBeVisible();
 const importedVersion=(await section(page).getByText('Coverage dataset:',{exact:false}).textContent()).replace('Coverage dataset: ','');
 await expect.poll(()=>loads).toBe(2);releaseReload();
 await expect.poll(()=>publicRequests.filter(r=>new URL(r.url).searchParams.get('datasetId')===importedVersion).length).toBe(2);
 await expect(section(page).getByText('Unique records: 215 companies',{exact:false})).toBeVisible();
 const privateFixture=structuredClone(fixture);
 privateFixture.dataset.dataState='fictional_reference';
 privateFixture.dataset.companies.push({...privateFixture.dataset.companies[0],id:'private-coverage-company',externalId:'private-coverage-company',name:'Private coverage marker'});
 const run={...await new BrowserSimulationService().analyze({...privateFixture,requestId:'coverage-private'}),ownerId:'11111111-1111-4111-8111-111111111111',storage:'private Supabase snapshot'};
 await page.route('**/api/v1/private/**',r=>{
  const path=new URL(r.request().url()).pathname;
  return r.fulfill({json:{schemaVersion:'1.0.0',...(path.endsWith('/runs')?{runs:[{id:run.id,portfolio_id:run.portfolioId,created_at:run.completedAt}]}:path.endsWith('/portfolios')?{portfolios:[]}:{run})}});
 });
 await navigateWorkspace(page,'/reports');await page.getByRole('button',{name:'Open private report '+run.id,exact:true}).click();await expect(page).toHaveURL('/results/'+run.id);
 phase='private';
 await navigateWorkspace(page,'/evidence');
 await expect(section(page).getByText('Private immutable source snapshot.',{exact:false})).toBeVisible();
 await expect(section(page).getByText('Unique records: 6 companies',{exact:false})).toBeVisible();
 await expect(section(page).getByText('Content hash: '+(await summarizeCoverage(privateFixture.dataset)).contentHash,{exact:true})).toBeVisible();
 await expect(page.getByRole('combobox',{name:'Dataset',exact:true})).toHaveValue('climateweb');
 // Installed requests before opening are legitimate; private coverage must make
 // zero public requests. Keep payload assertions across the entire workflow.
 expect(publicRequests.filter(r=>r.phase==='private')).toHaveLength(0);
 for(const request of publicRequests){
  expect(request.method).toBe('GET');expect(request.body).toBeNull();
  const query=new URL(request.url).searchParams;
  expect([...query.keys()]).toEqual(['datasetId']);
  expect([fixture.dataset.datasetVersion,importedVersion]).toContain(query.get('datasetId'));
 }
 expect(JSON.stringify(publicRequests)).not.toContain('private-coverage');
 expect(JSON.stringify(publicRequests)).not.toContain('Private coverage marker');
 expect(JSON.stringify(publicRequests)).not.toContain(run.id);
 expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('private-coverage');
 expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain(run.id);
 if(ending==='account change'){
  await page.route('**/auth/v1/token?grant_type=password',r=>{
   const now=Math.floor(Date.now()/1000),enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),user={id:'22222222-2222-4222-8222-222222222222',email:'second@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}};
   return r.fulfill({json:{access_token:`${enc({alg:'HS256'})}.${enc({sub:user.id,exp:now+3600})}.mock`,refresh_token:'second-mock-refresh',expires_in:3600,token_type:'bearer',user}});
  });
 }
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/auth/);
 await expect(page.getByText('Private immutable source snapshot.',{exact:false})).toHaveCount(0);
 expect(publicRequests.filter(r=>r.phase==='private')).toHaveLength(0);phase='installed';
 await loginWorkspace(page,false);await navigateWorkspace(page,'/evidence');
 await expect(section(page).getByText('Selected installed dataset.',{exact:false})).toBeVisible();
 // loginWorkspace intentionally reloads the browser; selection starts at the reference fixture.
 await expect(section(page).getByText('Unique records: 5 companies',{exact:false})).toBeVisible();
 expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('private-coverage');
});

test('coverage failure and empty denominators remain explicit',async({page})=>{
 await page.route('**/api/v1/datasets/coverage?**',r=>r.fulfill({status:503,json:{error:{message:'Coverage service unavailable'}}}));
 await navigateWorkspace(page,'/evidence');await expect(section(page).getByRole('alert')).toContainText('Coverage unavailable.');
 await page.unroute('**/api/v1/datasets/coverage?**');
 const cases=JSON.parse(readFileSync(new URL('../../backend/tests/fixtures/coverage-cases.json',import.meta.url),'utf8'));
 const empty={...cases.empty,datasetVersion:fixture.dataset.datasetVersion};
 await page.route('**/api/v1/datasets/coverage?**',async r=>r.fulfill({json:await summarizeCoverage(empty)}));
 await navigateWorkspace(page,'/portfolio');await navigateWorkspace(page,'/evidence');
 await expect(row(page,'Companies with sourced operating coordinates')).toContainText('0 / 0 companies');
 await expect(row(page,'Companies with sourced operating coordinates')).toContainText('Not applicable');
});
