import {test as base,expect} from '@playwright/test';
export {expect};
// Exercise the real SDK login path with network-only mocks; no production bypass.
export const test=base.extend({samplePortfolio:[true,{option:true}],page:async({page,samplePortfolio},use)=>{
 if(samplePortfolio)page.on('dialog',d=>d.accept());
 await page.route('**/api/v1/private/portfolios',r=>r.fulfill({json:{schemaVersion:'1.0.0',portfolios:[]}}));
 await page.route('**/api/v1/private/runs',r=>r.fulfill({json:{schemaVersion:'1.0.0',runs:[]}}));
 await page.route('**/auth/v1/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith('/token')&&url.searchParams.get('grant_type')==='password'){
   const now=Math.floor(Date.now()/1000),enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
   const user={id:'11111111-1111-4111-8111-111111111111',email:'workspace@example.test',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}};
   return route.fulfill({json:{access_token:`${enc({alg:'HS256'})}.${enc({sub:user.id,exp:now+3600})}.mock`,refresh_token:'mock-refresh',expires_in:3600,token_type:'bearer',user}});
  }
  if(url.pathname.endsWith('/logout'))return route.fulfill({status:204});
  return route.fulfill({status:400,json:{msg:'Unexpected mocked auth request'}});
 });
 await loginWorkspace(page,samplePortfolio);
 await use(page);
}});

export async function loginWorkspace(page,samplePortfolio=true){
 await page.goto('/auth');await page.getByLabel('Email',{exact:true}).fill('workspace@example.test');await page.getByLabel('Password',{exact:true}).fill('Mock-password-123!');await page.locator('main form').getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/overview$/);
 if(samplePortfolio){await navigateWorkspace(page,'/portfolio');await page.getByRole('button',{name:'Load sample portfolio',exact:true}).click();await navigateWorkspace(page,'/overview');}
}

// SPA navigation retains the in-memory draft; page.goto/reload intentionally starts empty.
export async function navigateWorkspace(page,path){
 await page.evaluate(destination=>{history.pushState(null,'',destination);window.dispatchEvent(new PopStateEvent('popstate'));},path);
}
