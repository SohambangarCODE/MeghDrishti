import {test,expect,navigateWorkspace,loginWorkspace} from './authenticated-test.js';
import {readFileSync} from 'node:fs';
import {BrowserSimulationService} from '../src/services/mock/BrowserSimulationService.js';
test.use({samplePortfolio:false});
const fixture=JSON.parse(readFileSync(new URL('../src/fixtures/reference.json',import.meta.url),'utf8'));
const mixed=JSON.parse(readFileSync(new URL('../../backend/tests/fixtures/coverage-cases.json',import.meta.url),'utf8')).mixed;
const holdingsTable=page=>page.getByRole('heading',{name:'Holdings',exact:true}).locator('..').getByRole('table');

test('claim-specific labels distinguish sourced, synthetic, unmatched and unknown records',async({page},testInfo)=>{
 const demo=structuredClone(fixture);demo.dataset=structuredClone(mixed);demo.dataset.datasetVersion=fixture.dataset.datasetVersion;
 for(const rows of Object.values(demo.dataset).filter(Array.isArray))for(const r of rows)if(r.datasetVersion)r.datasetVersion=demo.dataset.datasetVersion;
 demo.dataset.commercialEdges[2].provenance='unknown';
 demo.holdings=demo.dataset.companies.map(c=>({...fixture.holdings[0],id:'holding-'+c.id,companyId:c.id,originalInputName:c.name}));
 demo.holdings.push({...fixture.holdings[0],id:'unmatched',companyId:null,matchingStatus:'excluded',exclusionReason:'Unmatched test input',originalInputName:'Unmatched test company'});
 await page.route('**/api/v1/demo?datasetId=reference',r=>r.fulfill({json:demo}));await page.reload();
 await navigateWorkspace(page,'/portfolio');await page.getByRole('button',{name:'Load sample portfolio',exact:true}).click();
 const table=holdingsTable(page);
 await expect(table.getByRole('row').filter({hasText:'Test Company 001'})).toContainText('Sourced operating coordinates');
 await expect(table.getByRole('row').filter({hasText:'Test Company 002'})).toContainText('Measured supplier dependence');
 await expect(table.getByRole('row').filter({hasText:'Test Company 003'})).toContainText('Synthetic locations only');
 await expect(table.getByRole('row').filter({hasText:'Unmatched test company'})).toContainText('Unavailable');
 await page.screenshot({path:testInfo.outputPath('portfolio-evidence.png'),fullPage:true});
 await navigateWorkspace(page,'/graph');await page.getByRole('button',{name:'Explore all entities',exact:true}).click();
 for(const [id,relationship,weight] of [['e1','Sourced relationship record','Measured dependency weight'],['e2','Dataset-reported relationship','Assumed dependency weight'],['e3','Relationship unknown','Dependency weight unknown']]){
  await page.getByRole('button',{name:'Inspect relationship '+id,exact:true}).click();
  await expect(page.locator('.graph-inspector')).toContainText(relationship);await expect(page.locator('.graph-inspector')).toContainText(weight);
 }
 await page.screenshot({path:testInfo.outputPath('graph-evidence.png'),fullPage:true});
 await navigateWorkspace(page,'/locations');
 await expect(page.getByRole('heading',{name:'f1',exact:true}).locator('..')).toContainText('Sourced operating coordinates');
 await expect(page.getByRole('heading',{name:'f2',exact:true}).locator('..')).toContainText('Operating-coordinate evidence unknown');
 await expect(page.getByRole('heading',{name:'f3',exact:true}).locator('..')).toContainText('Synthetic facility / coordinates');
 await expect(page.getByRole('heading',{name:'route-a',exact:true}).locator('..')).toContainText('Sourced route geometry');
 await expect(page.getByRole('heading',{name:'route-b',exact:true}).locator('..')).toContainText('Synthetic route geometry');
 await page.screenshot({path:testInfo.outputPath('locations-evidence.png'),fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('editing evidence follows installed dataset switching and does not assert zero real dependence',async({page})=>{
 page.on('dialog',d=>d.accept());
 await navigateWorkspace(page,'/portfolio');await page.getByRole('button',{name:'Load sample portfolio',exact:true}).click();
 await expect(holdingsTable(page).getByRole('row').filter({hasText:'Evergreen'})).toContainText('No recorded commercial relationships');
 await page.getByRole('combobox',{name:'Dataset',exact:true}).selectOption('climateweb');
 await expect(page.getByRole('combobox',{name:'Dataset',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Load sample portfolio',exact:true}).click();
 await expect(holdingsTable(page)).toContainText('Synthetic locations only');
 await expect(holdingsTable(page)).not.toContainText('Evergreen');
 await navigateWorkspace(page,'/locations');await expect(page.getByText('Synthetic facility / coordinates',{exact:true}).first()).toBeVisible();
 await expect(page.getByText('Synthetic route geometry',{exact:true}).first()).toBeVisible();
});

for(const ending of ['logout','account change'])test('private historical entity evidence remains local and clears on '+ending,async({page},testInfo)=>{
 await navigateWorkspace(page,'/portfolio');await page.getByRole('combobox',{name:'Dataset',exact:true}).selectOption('climateweb');
 await expect(page.getByRole('combobox',{name:'Dataset',exact:true})).toBeEnabled();
 const privateFixture=structuredClone(fixture),d=privateFixture.dataset;
 const privateFacility={...d.facilities[0],id:'private-evidence-facility',companyId:fixture.holdings[0].companyId,name:'Private historical operating site',provenance:'sourced',latitude:0,longitude:0,evidenceIds:['private-evidence'],sourceFields:{fieldEvidence:{operatingCoordinates:['private-evidence']}}};
 d.facilities.push(privateFacility);
 const edge=d.commercialEdges[0];edge.provenance='sourced';edge.weightBasis='measured';edge.evidenceIds=['private-evidence'];edge.sourceFields={fieldEvidence:{dependencyWeight:['private-evidence']}};
 d.routes[0].provenance='sourced';d.routes[0].evidenceIds=['private-evidence'];d.routes[0].sourceFields={fieldEvidence:{routeGeometry:['private-evidence']}};
 d.routes[0].geometry={type:'LineString',coordinates:[[0,0],[1,1]]}; // Test-only sourced geometry; original fixture has none.
 d.evidence.push({id:'private-evidence',sourceName:'Test-only historical evidence',url:'https://example.com/test-only-evidence',claim:'Test-only coordinate, weight and geometry evidence.',entityIds:[privateFacility.id,edge.id,d.routes[0].id],reportedOrVerifiedStatus:'sourced',retrievedAt:null,documentDate:null});
 const run={...await new BrowserSimulationService().analyze({...privateFixture,requestId:'private-entity-evidence'}),ownerId:'11111111-1111-4111-8111-111111111111',storage:'private Supabase snapshot'};
 await page.route('**/api/v1/private/**',r=>{const path=new URL(r.request().url()).pathname;return r.fulfill({json:{schemaVersion:'1.0.0',...(path.endsWith('/runs')?{runs:[{id:run.id,portfolio_id:run.portfolioId,created_at:run.completedAt}]}:path.endsWith('/portfolios')?{portfolios:[]}:{run})}});});
 await navigateWorkspace(page,'/reports');await page.getByRole('button',{name:'Open private report '+run.id,exact:true}).click();await expect(page).toHaveURL('/results/'+run.id);
 const publicCalls=[];await page.route('**/api/v1/datasets/coverage?**',r=>{publicCalls.push(r.request().url());return r.continue();});
 await navigateWorkspace(page,'/portfolio');await page.getByText('Saved report holdings evidence (immutable snapshot)',{exact:true}).click();
 const historical=page.getByRole('table',{name:'Saved report holdings evidence'});
 await expect(historical).toContainText('Sourced operating coordinates');await expect(historical).toContainText('Measured supplier dependence');
 await page.getByRole('button',{name:'Add holding',exact:true}).click();await expect(holdingsTable(page)).toContainText('Synthetic locations only');
 await expect(historical).toContainText('Sourced operating coordinates');
 await navigateWorkspace(page,'/graph');await page.getByRole('button',{name:'Inspect relationship '+edge.id,exact:true}).click();await expect(page.locator('.graph-inspector')).toContainText('Measured dependency weight');
 await navigateWorkspace(page,'/locations');await expect(page.getByRole('heading',{name:privateFacility.name,exact:true}).locator('..')).toContainText('Sourced operating coordinates');
 await expect(page.getByText('Weather evidence unavailable for historical snapshots.',{exact:false})).toBeVisible();
 await expect(page.getByRole('combobox',{name:'Dataset',exact:true})).toHaveValue('climateweb');
 await page.getByRole('combobox',{name:'Transport corridor',exact:true}).selectOption(d.routes[0].id);await expect(page.locator('.location-card.selected')).toContainText('Sourced route geometry');
 if(ending==='logout')await page.screenshot({path:testInfo.outputPath('private-locations-evidence.png'),fullPage:true});
 expect(publicCalls).toEqual([]);expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('private-evidence');
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/auth/);await expect(page.getByText(privateFacility.name,{exact:true})).toHaveCount(0);
 if(ending==='account change')await page.route('**/auth/v1/token?grant_type=password',r=>{const now=Math.floor(Date.now()/1000),enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),user={id:'22222222-2222-4222-8222-222222222222',email:'second@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}};return r.fulfill({json:{access_token:`${enc({alg:'HS256'})}.${enc({sub:user.id,exp:now+3600})}.mock`,refresh_token:'second-mock',expires_in:3600,token_type:'bearer',user}});});
 await loginWorkspace(page,false);await navigateWorkspace(page,'/locations');await expect(page.getByText(privateFacility.name,{exact:true})).toHaveCount(0);
 await expect(page.getByText('Synthetic facility / coordinates',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('private-evidence');
});
