import {test,expect} from '@playwright/test';
test('point weather uses backend and retains explicit separation',async({page})=>{
 await page.goto('/locations');
 await page.getByLabel('Weather latitude').fill('20');
 await page.getByLabel('Weather longitude').fill('78');
 await page.getByRole('button',{name:'Set weather point'}).click();
 const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/weather/point'));
 await page.getByRole('button',{name:'Fetch live point forecast'}).click();
 const body=await (await response).json();
 expect(body.usedInSimulation).toBe(false);expect(body.companyLocationVerified).toBe(false);
 if(body.status==='available'||body.status==='stale'){
  await expect(page.getByRole('table',{name:'Seven-day point forecast (UTC)'})).toBeVisible();
  expect(body.validTimes).toHaveLength(7);
 }else await expect(page.getByText('Forecast for user-selected coordinates only.',{exact:false})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
