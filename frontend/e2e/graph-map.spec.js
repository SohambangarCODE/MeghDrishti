import {test,expect,navigateWorkspace} from './authenticated-test.js';
import {readFileSync} from 'node:fs';
const fixture=JSON.parse(readFileSync(new URL('../src/fixtures/reference.json',import.meta.url),'utf8'));
const mixed=JSON.parse(readFileSync(new URL('../../backend/tests/fixtures/coverage-cases.json',import.meta.url),'utf8')).mixed;
test.use({samplePortfolio:false});
async function install(page,demo){
 await page.route('**/api/v1/demo?datasetId=reference',r=>r.fulfill({json:demo}));
 await page.reload();await expect(page.getByRole('heading',{name:'Portfolio overview',exact:true})).toBeVisible();
}
function largeDemo(){
 const demo=structuredClone(fixture),d=demo.dataset;
 d.companies.push(...Array.from({length:100},(_,i)=>({...d.companies[0],id:'test-company-'+i,name:'Test company '+i})));
 d.facilities.push(...Array.from({length:65},(_,i)=>({...d.facilities[0],id:'test-site-'+i,name:'Test site '+i,companyId:'test-company-90',operationalShare:null,latitude:20+i/100,longitude:78+i/100})));
 d.commercialEdges.push({...d.commercialEdges[0],id:'test-in',supplierCompanyId:d.companies[0].id,customerCompanyId:'test-company-90',supplyItemIds:[]},
 {...d.commercialEdges[0],id:'test-out',supplierCompanyId:'test-company-90',customerCompanyId:d.companies[1].id,supplyItemIds:[]});
 return demo;
}
test('Locations links focus a company beyond 40 and retain its directed neighborhood',async({page},testInfo)=>{
 const demo=largeDemo();await install(page,demo);await navigateWorkspace(page,'/locations');
 await page.getByRole('combobox',{name:'Company selection',exact:true}).selectOption('test-company-90');
 await expect(page.getByText('Showing all 65 recorded sites for this company.',{exact:true})).toBeVisible();
 await expect(page.locator('.location-card')).toHaveCount(65);
 await page.getByRole('link',{name:'Inspect selection in graph',exact:true}).click();
 await expect(page.locator('.graph-inspector')).toContainText('test-company-90');
 await expect(page.locator('.react-flow__node[data-id="test-company-90"]')).toBeVisible();
 for(const id of ['test-in','test-out']){
  await expect(page.getByRole('button',{name:'Inspect relationship '+id,exact:true})).toBeVisible();
  await expect(page.locator('.react-flow__edge[data-id="'+id+'"] path.react-flow__edge-path')).toHaveAttribute('style',/stroke: rgb\(184, 86, 13\)/);
 }
 await page.screenshot({path:testInfo.outputPath('focused-neighborhood.png'),fullPage:true});
 await navigateWorkspace(page,'/graph?entity=missing-id');await expect(page.getByText(/Entity unavailable in this source snapshot/)).toBeVisible();
 await navigateWorkspace(page,'/graph?entity=%0A');await expect(page.getByText(/Invalid graph entity ID/)).toBeVisible();
});
test('map instance survives company changes, offline toggles and equivalent geography updates',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await install(page,largeDemo());await navigateWorkspace(page,'/locations');
 await page.getByRole('button',{name:'Load online map tiles'}).click();
 const map=page.locator('.leaflet-container');await expect(map).toBeVisible();
 const identity=await map.evaluate(el=>el._leaflet_id);
 await page.getByRole('combobox',{name:'Company selection',exact:true}).selectOption('test-company-90');
 await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(65);
 expect(await map.evaluate(el=>el._leaflet_id)).toBe(identity);
 await expect(page.locator('.leaflet-overlay-pane path').first()).toHaveAttribute('fill-opacity','0');
 await expect(page.locator('.leaflet-overlay-pane path').first()).toHaveAttribute('stroke-dasharray','6 5');
 await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.waitForTimeout(400);
 const transform=await page.locator('.leaflet-map-pane').getAttribute('style');
 await page.getByLabel('Find corridor',{exact:true}).fill('not recorded');
 expect(await page.locator('.leaflet-map-pane').getAttribute('style')).toBe(transform);
 await page.getByRole('button',{name:'Use offline list'}).click();await expect(map).toBeHidden();
 await page.getByRole('button',{name:'Load online map tiles'}).click();expect(await map.evaluate(el=>el._leaflet_id)).toBe(identity);
 await expect(page.locator('.leaflet-control-zoom')).toHaveCount(1);
 await page.getByRole('combobox',{name:'Company selection',exact:true}).selectOption('demo:delta');
 await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(1);expect(await map.evaluate(el=>el._leaflet_id)).toBe(identity);
 await expect(page.getByRole('region',{name:'Map evidence legend'})).toContainText('Dashed lines and hollow markers');
 await page.screenshot({path:testInfo.outputPath('stable-map.png'),fullPage:true});expect(errors).toEqual([]);
});
test('map geometry uses claim-specific solid, synthetic dashed and unknown dotted styles',async({page})=>{
 const demo=structuredClone(fixture);demo.dataset=structuredClone(mixed);demo.dataset.datasetVersion=fixture.dataset.datasetVersion;
 for(const rows of Object.values(demo.dataset).filter(Array.isArray))for(const r of rows)if(r.datasetVersion)r.datasetVersion=demo.dataset.datasetVersion;
 // A generic source URL is deliberately insufficient for the third route.
 demo.dataset.routes.push({...demo.dataset.routes[0],id:'unknown-route',name:'Unknown route',evidenceIds:[],sourceFields:{url:'https://example.test/generic'}});
 await install(page,demo);await navigateWorkspace(page,'/locations');await page.getByRole('button',{name:'Load online map tiles'}).click();
 const paths=page.locator('.leaflet-overlay-pane path');await expect(paths).toHaveCount(6);
 const styles=await paths.evaluateAll(rows=>rows.map(el=>({dash:el.getAttribute('stroke-dasharray'),fill:el.getAttribute('fill-opacity'),line:el.getAttribute('d').includes('L')})));
 const lines=styles.filter(s=>s.line);
 expect(styles.some(s=>s.dash==='6 5'&&s.fill==='0')).toBe(true);
 expect(styles.some(s=>s.dash===null&&s.fill==='1')).toBe(true);
 expect(styles.some(s=>s.dash==='1 5'&&s.fill==='0.25')).toBe(true);
 expect(lines.some(s=>s.dash==='6 5')).toBe(true);expect(lines.some(s=>s.dash===null)).toBe(true);expect(lines.some(s=>s.dash==='1 5')).toBe(true);
 await expect(page.getByRole('region',{name:'Map evidence legend'})).toContainText('sourced does not mean independently verified');
});

test('large company neighborhood expands and discloses upstream pagination',async({page})=>{
 const demo=largeDemo(),d=demo.dataset;
 d.commercialEdges.push(...Array.from({length:60},(_,i)=>({...d.commercialEdges[0],id:'large-link-'+i,supplierCompanyId:'test-company-'+i,customerCompanyId:'test-company-90',supplyItemIds:[]})));
 d.sourceMetadata={...d.sourceMetadata,pagination:{hasMore:true}};
 await install(page,demo);await navigateWorkspace(page,'/graph?entity=test-company-90');
 await expect(page.getByText(/Expanded neighborhood: all 63 directly relevant entities/)).toBeVisible();
 await expect(page.locator('.react-flow__node')).toHaveCount(63);
 for(const id of ['large-link-0','large-link-59','test-in','test-out'])await expect(page.getByRole('button',{name:'Inspect relationship '+id,exact:true})).toBeVisible();
 await expect(page.getByText(/Source graph is partial or has unresolved relationship endpoints/)).toBeVisible();
});
