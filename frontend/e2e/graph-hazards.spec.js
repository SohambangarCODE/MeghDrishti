import {test,expect,navigateWorkspace,loginWorkspace} from './authenticated-test.js';
import {readFileSync} from 'node:fs';
import {BrowserSimulationService} from '../src/services/mock/BrowserSimulationService.js';
const fixture=JSON.parse(readFileSync(new URL('../src/fixtures/reference.json',import.meta.url),'utf8'));
test.use({samplePortfolio:false});
const ring=[[77,19],[78,19],[78,20],[77,19]];
function spatialFixture(){
 const demo=structuredClone(fixture),d=demo.dataset,base=d.regions[0];
 d.regions=[{...base,boundary:{type:'Polygon',coordinates:[ring]}},
 {...base,id:'test-multi',name:'Test multipolygon',provenance:'unknown',boundary:{type:'MultiPolygon',coordinates:[[ring],[[[79,19],[80,19],[80,20],[79,19]]]]}},
 {...base,id:'test-centroid',name:'Test centroid',provenance:'dataset_reported',centroid:[79,20]},
 {...base,id:'test-missing',name:'Test unavailable region'}];
 d.events[0].geographicTargets=d.regions.map(r=>r.id);
 demo.scenario.eventIds=d.events.map(e=>e.id);
 return demo;
}
async function install(page,demo,run=null){
 await page.route('**/api/v1/demo?datasetId=reference',r=>r.fulfill({json:demo}));
 if(run)await page.evaluate(r=>localStorage.setItem('meghdrishti:runs:v1',JSON.stringify([r])),run);
 await page.reload();await expect(page.getByRole('heading',{name:'Portfolio overview',exact:true})).toBeVisible();
}
test('graph dragging retains positions and exact path edges highlight while background stays visible',async({page},testInfo)=>{
 const demo=structuredClone(fixture),original=demo.dataset.commercialEdges[0];
 demo.dataset.commercialEdges.push({...original,id:'test-parallel-edge',supplyItemIds:[]});
 const run=await new BrowserSimulationService().analyze({...demo,requestId:"graph-phase2"});await install(page,demo,run);
 await navigateWorkspace(page,'/graph');await page.getByRole('button',{name:'Explore all entities',exact:true}).click();
 const node=page.locator('.react-flow__node[data-id="demo:delta"]');await expect(node).toBeVisible();await node.scrollIntoViewIfNeeded();
 const before=await node.getAttribute('style'),edge=page.locator('.react-flow__edge[data-id="'+original.id+'"] .react-flow__edge-path');
 const edgeBefore=await edge.getAttribute('d'),box=await node.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+35,box.y+box.height/2+35,{steps:8});await page.mouse.up();
 await expect(node).not.toHaveAttribute('style',before);
 const position=await node.evaluate(el=>el.style.transform);await expect(edge).not.toHaveAttribute('d',edgeBefore);
 await page.getByRole('button',{name:'Aster Motors',exact:true}).click();await expect(page.locator('.graph-inspector')).toContainText('Aster Motors');
 expect(await node.evaluate(el=>el.style.transform)).toBe(position);
 const count=await page.locator('.react-flow__node').count(),path=run.paths.find(p=>p.commercialDepth===1&&p.companyIds.join('|')==='demo:delta|demo:aster');
 await page.getByRole('button',{name:'Delta Components → Aster Motors',exact:true}).first().click();
 await expect(page.locator('.react-flow__node')).toHaveCount(count);await expect(node).toHaveClass(/path-highlighted/);
 await expect(page.locator('.react-flow__edge[data-id="'+path.edgeIds[0]+'"]')).toHaveClass(/path-highlighted/);
 const parallel=path.edgeIds[0]===original.id?'test-parallel-edge':original.id;
 await expect(page.locator('.react-flow__edge[data-id="'+parallel+'"]')).toHaveClass(/path-background/);
 await expect(page.locator('.react-flow__node[data-id="demo:cedar"]')).toHaveClass(/path-background/);
 await expect(page.locator('.graph-inspector')).toContainText('Aster Motors');expect(await node.evaluate(el=>el.style.transform)).toBe(position);
 await page.screenshot({path:testInfo.outputPath('highlighted-path.png'),fullPage:true});
 await page.getByRole('button',{name:'Clear path focus',exact:true}).click();await expect(page.locator('.react-flow__node.path-background')).toHaveCount(0);
 expect(await node.evaluate(el=>el.style.transform)).toBe(position);
 await page.screenshot({path:testInfo.outputPath('draggable-graph.png'),fullPage:true});
});
test('hazards render polygon, multipolygon and centroid targets without remount or viewport reset',async({page},testInfo)=>{
 await install(page,spatialFixture());await navigateWorkspace(page,'/locations');
 await page.getByRole('button',{name:'Load online map tiles'}).click();const map=page.locator('.leaflet-container'),id=await map.evaluate(el=>el._leaflet_id);
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.waitForTimeout(400);const viewport=await page.locator('.leaflet-map-pane').getAttribute('style');
 await page.getByRole('checkbox',{name:'Hazards',exact:true}).check();
 await expect(page.locator('.hazard-target-region')).toHaveCount(2);await expect(page.locator('.hazard-target-centroid')).toHaveCount(1);
 const panel=page.getByRole('region',{name:'Modeled hazard targets'});await expect(panel).toContainText('Geometry unavailable.');await expect(panel).toContainText('geography unknown');await expect(panel).toContainText('geography synthetic');await expect(panel).toContainText('no hazard footprint or radius');
 expect(await map.evaluate(el=>el._leaflet_id)).toBe(id);expect(await page.locator('.leaflet-map-pane').getAttribute('style')).toBe(viewport);
 await page.getByLabel('Find corridor',{exact:true}).fill('SYNTHETIC');await expect(page.locator('.hazard-target-region')).toHaveCount(2);
 await page.getByRole('checkbox',{name:'Hazards',exact:true}).uncheck();await expect(page.locator('.hazard-target-region')).toHaveCount(0);await expect(page.locator('.hazard-target-centroid')).toHaveCount(0);
 await page.getByRole('checkbox',{name:'Hazards',exact:true}).check();await expect(page.locator('.hazard-target-region')).toHaveCount(2);
 await page.getByRole('combobox',{name:'Modeled climate event',exact:true}).selectOption('demo:route-event');await expect(page.locator('.hazard-target-region')).toHaveCount(0);await expect(panel).toContainText('no geographic target regions');
 await page.getByRole('combobox',{name:'Modeled climate event',exact:true}).selectOption('demo:facility-event');await expect(page.locator('.hazard-target-region')).toHaveCount(2);
 expect(await map.evaluate(el=>el._leaflet_id)).toBe(id);expect(await page.locator('.leaflet-map-pane').getAttribute('style')).toBe(viewport);
 await page.screenshot({path:testInfo.outputPath('modeled-targets.png'),fullPage:true});
});
test('private hazards use saved event intensity and source geography and clear after logout',async({page})=>{
 await page.getByRole('combobox',{name:'Dataset',exact:true}).selectOption('climateweb');
 await expect(page.getByRole('combobox',{name:'Dataset',exact:true})).toBeEnabled();
 const demo=spatialFixture();demo.dataset.regions[0].name='Private historical target region';
 demo.scenario.eventOverrides={'demo:facility-event':.37};
 const run={...await new BrowserSimulationService().analyze({...demo,requestId:"private-phase2"}),ownerId:'11111111-1111-4111-8111-111111111111',storage:'private Supabase snapshot'};
 await page.route('**/api/v1/private/**',r=>{const path=new URL(r.request().url()).pathname;return r.fulfill({json:{schemaVersion:'1.0.0',...(path.endsWith('/runs')?{runs:[{id:run.id,portfolio_id:run.portfolioId,created_at:run.completedAt}]}:path.endsWith('/portfolios')?{portfolios:[]}:{run})}});});
 await navigateWorkspace(page,'/reports');await page.getByRole('button',{name:'Open private report '+run.id,exact:true}).click();await expect(page).toHaveURL('/results/'+run.id);
 const publicCalls=[];await page.route('**/api/v1/datasets/coverage?**',r=>{publicCalls.push(r.request().url());return r.continue();});
 await navigateWorkspace(page,'/locations');await page.getByRole('checkbox',{name:'Hazards',exact:true}).check();
 const panel=page.getByRole('region',{name:'Modeled hazard targets'});await expect(panel).toContainText('Private historical target region');await expect(panel).toContainText('intensity 0.37');await expect(panel).toContainText('explicit hypothetical assumption');
 await expect(page.getByText('Weather evidence unavailable for historical snapshots.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Load online map tiles'}).click();await expect(page.locator('.hazard-target-region')).toHaveCount(2);
 expect(publicCalls).toEqual([]);expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('Private historical target region');
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await loginWorkspace(page,false);await navigateWorkspace(page,'/locations');
 await expect(page.getByRole('checkbox',{name:'Hazards',exact:true})).not.toBeChecked();await expect(page.getByText(/Private historical target region/)).toHaveCount(0);
});
