import { test,expect } from '@playwright/test';
test('reference workflow, paths, fixed comparison, exports and responsive navigation',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/welcome');await page.getByRole('link',{name:'Open anonymous demo'}).click();
  await page.getByRole('button',{name:'Run synthetic analysis'}).click();
  await expect(page.getByRole('heading',{name:'Analysis results',exact:true})).toBeVisible();
  await expect(page.getByText('₹13,34,340.00',{exact:true})).toBeVisible();
  await expect(page.getByRole('cell',{name:'No recorded affected path',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('results.png'),fullPage:true});
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON'}).click();
  const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/\.json$/);
  await download.saveAs(testInfo.outputPath('result.json'));
  await page.getByRole('link',{name:'Compare this snapshot'}).click();
  await page.getByRole('button',{name:'Compare transfer',exact:true}).click();
  await expect(page.getByText('₹10,82,340.00',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Apply allocation to draft'}).click();
  await page.goto('/graph');await expect(page.getByRole('heading',{name:'Exposure graph',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Delta Components',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Delta Components',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Delta Components → Aster Motors',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.getByText('Selected: demo:delta → demo:aster.',{exact:false})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('graph.png'),fullPage:true});
  await page.goto('/locations');await expect(page.getByRole('heading',{name:'Location list and offline fallback'})).toBeVisible();
  await page.goto('/auth');await expect(page.getByRole('heading',{name:'Authentication',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Continue to demo',exact:true})).toBeVisible();
  if(testInfo.project.name==='mobile'){await page.getByRole('button',{name:'Menu',exact:true}).click();await expect(page.getByRole('navigation')).toBeVisible();}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('auth.png'),fullPage:true});
  expect(errors).toEqual([]);
});

test('CSV review, invalid imports and route-only scenario',async({page})=>{
  await page.goto('/portfolio');
  await page.getByLabel('Choose CSV').setInputFiles({name:'holdings.csv',mimeType:'text/csv',buffer:Buffer.from('name,amount,currency\nAster Motors,4000000,INR\nMystery Company,1000000,INR')});
  await page.getByRole('button',{name:'Commit reviewed import'}).click();
  await expect(page.getByRole('alert')).toContainText('Match each record');
  await page.getByLabel('Match Mystery Company').selectOption('exclude');
  await page.getByRole('button',{name:'Commit reviewed import'}).click();
  await expect(page.getByText('Imported 2 holdings; 0 duplicate rows merged.')).toBeVisible();
  await page.getByRole('button',{name:'Run synthetic analysis'}).click();
  await expect(page.getByText('₹10,08,000.00',{exact:true}).first()).toBeVisible();
  await page.goto('/portfolio');await page.getByRole('button',{name:'Load reference demo'}).click();
  await page.goto('/scenarios');await page.getByLabel('Shock mapping').selectOption('demo:route-event');
  await page.getByRole('button',{name:'Run synthetic analysis'}).click();
  await expect(page.getByRole('cell',{name:'8.064 / 100',exact:true}).first()).toBeVisible();
  await page.goto('/portfolio');await page.getByRole('button',{name:'Clear draft holdings'}).click();
  await expect(page.getByRole('button',{name:'Run synthetic analysis'})).toBeDisabled();
});

test('denied local storage keeps a usable in-memory demo',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('denied');}}));
  await page.goto('/overview');await page.getByRole('button',{name:'Run synthetic analysis'}).click();
  await expect(page.getByRole('heading',{name:'Analysis results',exact:true})).toBeVisible();
  await expect(page.getByText('Local storage unavailable; history lasts for this session only.')).toBeVisible();
});

test('invalid amount blocks analysis and a corrected amount restores it',async({page})=>{
  await page.goto('/portfolio');const amount=page.getByLabel('Amount for Aster Motors');
  await amount.fill('-1');await amount.press('Tab');
  await expect(page.getByRole('button',{name:'Run synthetic analysis'})).toBeDisabled();
  await amount.fill('4000000');await amount.press('Tab');
  await expect(page.getByRole('button',{name:'Run synthetic analysis'})).toBeEnabled();
});

test('reports restore and delete; linked locations and all routes',async({page},testInfo)=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/overview');
 const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/analysis')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Run synthetic analysis'}).click();
 expect((await response).ok()).toBe(true);
 await expect(page.getByRole('heading',{name:'Analysis results',exact:true})).toBeVisible();
 const resultUrl=page.url();
 await page.getByRole('button',{name:'Save report',exact:true}).click();
 await expect(page.getByText('Snapshot saved in local browser history.',{exact:true})).toBeVisible();
 await page.goto('/reports');await page.reload();
 await expect(page.getByRole('button',{name:'Delete report',exact:false})).toHaveCount(1);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV'}).click();
 const download=await downloadPromise;const stream=await download.createReadStream();let csv='';for await(const chunk of stream)csv+=chunk;
 expect(csv).toContain('Evergreen Services');expect(csv).toContain('1000000');
 await page.locator('main a').filter({hasText:/^20\d\d-/}).click();
 expect(page.url()).toBe(resultUrl);
 await expect(page.locator('main')).toContainText('13,34,340.00');
 await page.goto('/reports');await page.getByRole('button',{name:'Delete report',exact:false}).click();await page.getByRole('button',{name:'Confirm delete'}).click();await page.reload();
 await expect(page.getByText('No saved local snapshots.',{exact:false})).toBeVisible();
 await page.goto('/locations');await page.getByLabel('Company selection').selectOption('demo:evergreen');
 await expect(page.getByText('No recorded facility for this company.',{exact:false})).toBeVisible();
 await page.getByLabel('Company selection').selectOption('demo:delta');
 await page.getByRole('button',{name:'Select facility'}).click();
 await expect(page).toHaveURL(/entity=demo%3Afacility/);
 await page.getByRole('link',{name:'Inspect selection in graph'}).click();
 await expect(page.locator('main pre')).toContainText('demo:facility');
 for(const route of ['welcome','overview','portfolio','locations','scenarios','compare','evidence','reports','auth']){
  await page.goto('/'+route);await expect(page.locator('main h1')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route).toBe(true);
  await page.screenshot({path:testInfo.outputPath(route+'.png'),fullPage:true});
 }
 await page.goto('/scenarios');await page.getByRole('button',{name:'What-if event',exact:true}).click();
 await expect(page.getByLabel('Shock mapping').locator('option')).toHaveCount(2);
 expect(errors).toEqual([]);
});
