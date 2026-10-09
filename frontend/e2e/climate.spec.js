import { test,expect,navigateWorkspace } from './authenticated-test.js';

test('climate evidence stays unavailable for synthetic sites and dependency overlays reset',async({page})=>{
 await navigateWorkspace(page,'/locations');
 const weather=page.waitForResponse(r=>r.url().endsWith('/api/v1/weather/screen'));
 await page.getByRole('button',{name:'Refresh weather evidence'}).click();
 expect((await weather).ok()).toBe(true);
 await expect(page.getByText('Verified operating coordinates are required. Supplied demo locations are synthetic;', {exact:false})).toBeVisible();
 await navigateWorkspace(page,'/scenarios');await page.getByRole('button',{name:'Future context',exact:true}).click();
 const projection=page.waitForResponse(r=>r.url().includes('/api/v1/projections?'));
 await page.getByRole('button',{name:'Load projection context'}).click();
 expect((await projection).ok()).toBe(true);
 await expect(page.getByText('No verified provider-geography mapping.',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'What-if event',exact:true}).click();
 await page.getByLabel('Effective dependency weight (0–1)').fill('0');
 const zero=page.waitForResponse(r=>r.url().endsWith('/api/v1/analysis')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Run synthetic analysis'}).click();
 expect((await (await zero).json()).totals.assumedWeightedExposure).toBe(0);
 await expect(page.getByText('₹0.00',{exact:true}).first()).toBeVisible();
 await navigateWorkspace(page,'/scenarios');await page.getByRole('button',{name:'Reset dependency assumptions'}).click();
 await expect(page.getByLabel('Effective dependency weight (0–1)')).toHaveValue('0.6');
 await page.getByRole('button',{name:'Run synthetic analysis'}).click();
 await expect(page.getByText('₹13,34,340.00',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await navigateWorkspace(page,'/cloud');await expect(page).toHaveURL(/auth\?next=%2Fcloud$/);
 await expect(page.locator('main form').getByRole('button',{name:'Sign in',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
