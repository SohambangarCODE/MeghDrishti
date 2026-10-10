import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { BrowserSimulationService } from '../src/services/mock/BrowserSimulationService.js';
import {navigateWorkspace} from './authenticated-test.js';

// Requires a Vite build with the two public Supabase variables configured.
// Every auth request is intercepted, including unexpected SDK requests.
const email = 'auth-test@example.test';
const password = 'Mock-password-123!';
const user = {
  id: '11111111-1111-4111-8111-111111111111',
  aud: 'authenticated', role: 'authenticated', email,
  email_confirmed_at: '2026-01-01T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: {},
};

async function mockAuth(page, { failLogin = false, nextUser = null, beforeExchange = null, beforeSignup = null } = {}) {
  await page.route('**/api/v1/private/portfolios',r=>r.fulfill({json:{schemaVersion:'1.0.0',portfolios:[]}}));
  const calls = { signup: 0, login: 0, logout: 0, unexpected: [] };
  await page.route('**/auth/v1/**', async route => {
    const request = route.request(), url = new URL(request.url());
    const reply = (status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (request.method() === 'POST' && url.pathname.endsWith('/signup')) {
      calls.signup++;
      expect(request.postDataJSON()).toMatchObject({ email, password });
      if(beforeSignup)await beforeSignup();
      return reply(200, { ...user, email_confirmed_at: null, identities: [] });
    }
    if (request.method() === 'POST' && url.pathname.endsWith('/token') && ['password','pkce'].includes(url.searchParams.get('grant_type'))) {
      if(url.searchParams.get('grant_type')==='pkce'&&beforeExchange)await beforeExchange();
      calls.login++;
      const loginUser=nextUser&&calls.login>1?nextUser:user;
      if(url.searchParams.get('grant_type')==='password')expect(request.postDataJSON()).toMatchObject({ email:loginUser.email, password });
      if (failLogin) return reply(400, { code: 'invalid_credentials', msg: 'Invalid login credentials' });
      const now = Math.floor(Date.now() / 1000);
      const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
      const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, aud: 'authenticated', exp: now + 3600, iat: now })}.mock-signature`;
      return reply(200, { access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: 'mock-refresh-token', user:loginUser });
    }
    if (request.method() === 'POST' && url.pathname.endsWith('/logout')) {
      calls.logout++;
      return route.fulfill({ status: 204 });
    }
    if(request.method()==='POST'&&url.pathname.endsWith('/recover'))return reply(200,{});
    if(request.method()==='PUT'&&url.pathname.endsWith('/user'))return reply(200,user);
    calls.unexpected.push(`${request.method()} ${url.pathname}`);
    return reply(400, { msg: 'Unexpected mocked auth request' });
  });
  return calls;
}

async function openForm(page) {
  await page.goto('/auth');
  await expect(page.getByRole('heading', { name: 'Authentication', exact: true })).toBeVisible();
  await expect(page.locator('main form').getByRole('button', { name: 'Sign in', exact: true }),
    'Configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then restart Vite').toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
}

test('mocked login persists across reload and sign out clears the session', async ({ page }) => {
  const calls = await mockAuth(page);
  await openForm(page);
  await page.locator('main form').getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText(`Signed in as ${email}`, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(`Signed in as ${email}`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.goto('/auth');
  await expect(page.locator('main form').getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(`Signed in as ${email}`, { exact: true })).toHaveCount(0);
  await expect(page.locator('main form').getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  expect(calls).toEqual({ signup: 0, login: 1, logout: 1, unexpected: [] });
});

test('mocked login failure displays an error and remains signed out', async ({ page }) => {
  const calls = await mockAuth(page, { failLogin: true });
  await openForm(page);
  await page.locator('main form').getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid login credentials');
  await expect(page.locator('main form').getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(0);
  expect(calls).toEqual({ signup: 0, login: 1, logout: 0, unexpected: [] });
});

test('mocked signup requests email confirmation without signing in', async ({ page }) => {
  const calls = await mockAuth(page);
  await openForm(page);
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await page.locator('main form').getByRole('button', { name: 'Sign up', exact: true }).click();
  await expect(page.getByText('Sign-up request accepted. Check your email to confirm your account.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(0);
  expect(calls).toEqual({ signup: 1, login: 0, logout: 0, unexpected: [] });
});

for (const ending of ['logout', 'expiry']) test(`private report enters workspace without persistence and clears on ${ending}`, async ({ page }) => {
  await mockAuth(page);
  const fixture=JSON.parse(readFileSync(new URL('../src/fixtures/reference.json',import.meta.url),'utf8'));
  fixture.dataset.companies[0].name='Private-only company marker';
  const run={...await new BrowserSimulationService().analyze({...fixture,requestId:'private-test'}),ownerId:user.id,id:'private-only-report-marker',storage:'private Supabase snapshot'};
  await page.route('**/api/v1/private/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    const body=path.endsWith('/portfolios')?{portfolios:[]}:path.endsWith('/runs')?{runs:[{id:run.id,portfolio_id:run.portfolioId,created_at:run.completedAt}]}:{run};
    await route.fulfill({json:{schemaVersion:'1.0.0',...body}});
  });
  await openForm(page);
  await page.locator('main form').getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByText(`Signed in as ${email}`,{exact:true})).toBeVisible();
  await page.goto('/reports');
  await page.getByRole('button',{name:'Open private report '+run.id,exact:true}).click();
  await expect(page.getByRole('heading',{name:'Analysis results',exact:true})).toBeVisible();
  await navigateWorkspace(page,'/overview');
  await expect(page.getByText('Private report active in memory only.',{exact:false})).toBeVisible();
  await page.getByRole('link',{name:'Inspect graph',exact:true}).click();
  await expect(page.getByText('Private report active in memory only.',{exact:false})).toBeVisible();
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain(run.id);
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('Private-only company marker');
  if(ending==='logout'){
    await page.getByRole('button',{name:'Sign out',exact:true}).click();
    await page.goto('/overview');
  }else await page.evaluate(()=>window.dispatchEvent(new Event('meghdrishti:session-expired')));
  await expect(page.getByText('Private report active in memory only.',{exact:false})).toHaveCount(0);
  await expect(page.getByText('Private-only company marker',{exact:false})).toHaveCount(0);
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain(run.id);
});



test('navigation preserves safe destinations and requires login',async({page})=>{
 await mockAuth(page);
 await page.route('**/api/v1/private/**',r=>r.fulfill({json:{schemaVersion:'1.0.0',portfolios:[],runs:[]}}));
 await page.goto('/welcome');
 await expect(page.getByRole('link',{name:'Open anonymous demo',exact:true})).toHaveCount(0);
 await page.goto('/overview');await expect(page).toHaveURL(/auth\?next=%2Foverview$/);
 await page.goto('/welcome');await page.getByRole('link',{name:'Get Started',exact:true}).click();
 await expect(page).toHaveURL(/auth$/);
 await page.goto('/cloud');await expect(page).toHaveURL(/auth\?next=%2Fcloud$/);
 await expect(page.getByRole('heading',{name:'Private cloud workspace'})).toHaveCount(0);
 await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);
 await page.locator('main form').getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page).toHaveURL(/reports$/);
 await page.goto('/auth?next=https://evil.example');await expect(page).toHaveURL(/overview$/);
 await page.goto('/welcome');await page.getByRole('link',{name:'Get Started',exact:true}).click();await expect(page).toHaveURL(/overview$/);
});

test('auth works without dataset and recovery stays on password form',async({page})=>{
 const calls=await mockAuth(page);
 await page.route('**/api/v1/demo?**',r=>r.fulfill({status:503,json:{error:{message:'Dataset unavailable'}}}));
 await openForm(page);
 await page.getByRole('button',{name:'Reset password',exact:true}).click();
 await page.locator('main form').getByRole('button',{name:'Reset password',exact:true}).click();
 await expect(page.getByText('If the account exists, check its email for a recovery link.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByLabel('Password',{exact:true}).fill(password);
 await page.locator('main form').getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/overview$/);
 await page.goto('/auth/reset');await expect(page.getByRole('heading',{name:'Set new password'})).toBeVisible();
 await page.getByLabel('New password',{exact:true}).fill('New-mock-password!');await page.getByRole('button',{name:'Update password',exact:true}).click();
 await expect(page.getByText('Password updated.',{exact:true})).toBeVisible();await expect(page).toHaveURL(/auth\/reset$/);
 expect(calls.unexpected).toEqual([]);
});

test('confirmation callback requires a session and redirects an established session',async({page})=>{
 await mockAuth(page);await page.goto('/auth/callback?error=access_denied');
 await expect(page.getByText('Confirmation could not be completed.',{exact:false})).toBeVisible();
 await openForm(page);await page.locator('main form').getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page).toHaveURL(/overview$/);await page.goto('/auth/callback');await expect(page).toHaveURL(/overview$/);
});

test('late private response cannot restore data after logout and same-account login',async({page})=>{
 await mockAuth(page);let release;const gate=new Promise(r=>release=r);let requested;const started=new Promise(r=>requested=r);
 await page.route('**/api/v1/private/**',async r=>{if(new URL(r.request().url()).pathname.endsWith('/portfolios')){requested();await gate;}await r.fulfill({json:{schemaVersion:'1.0.0',portfolios:[],runs:[]}});});
 await openForm(page);await page.locator('main form').getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/overview$/);
 await page.goto('/cloud');await started;
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/auth/);release();
 await expect(page.getByRole('heading',{name:'Private cloud workspace'})).toHaveCount(0);
 await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.locator('main form').getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page).toHaveURL(/reports$/);await expect(page.getByText('Private report active in memory only.',{exact:false})).toHaveCount(0);
});


test('PKCE confirmation exchanges the code once before overview',async({page})=>{
 const calls=await mockAuth(page);await openForm(page);
 await page.getByRole('button',{name:'Sign up',exact:true}).click();await page.locator('main form').getByRole('button',{name:'Sign up',exact:true}).click();
 await expect(page.getByText('Sign-up request accepted.',{exact:false})).toBeVisible();
 await page.goto('/auth/callback?code=mock-confirmation-code');await expect(page).toHaveURL(/overview$/);
 await expect(page.getByText(`Signed in as ${email}`,{exact:true})).toBeVisible();expect(calls.login).toBe(1);expect(calls.unexpected).toEqual([]);
});


test('switching accounts resets private workspace ownership',async({page})=>{
 const second={...user,id:'22222222-2222-4222-8222-222222222222',email:'second@example.test'};
 await mockAuth(page,{nextUser:second});
 await page.route('**/api/v1/private/**',r=>r.fulfill({json:{schemaVersion:'1.0.0',portfolios:[],runs:[]}}));
 await openForm(page);await page.locator('main form').getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/overview$/);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.goto('/auth');
 await page.getByLabel('Email',{exact:true}).fill(second.email);await page.getByLabel('Password',{exact:true}).fill(password);await page.locator('main form').getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByText(`Signed in as ${second.email}`,{exact:true})).toBeVisible();await expect(page.getByText(`Signed in as ${email}`,{exact:true})).toHaveCount(0);
 await page.getByRole('link',{name:'My portfolios',exact:true}).click();await expect(page.getByText('No saved portfolios yet.',{exact:false})).toBeVisible();
});


test('every workspace URL requires login and public recovery stays accessible',async({page})=>{
 await mockAuth(page);
 for(const destination of ['/overview','/portfolio','/graph','/locations','/scenarios','/results/123','/compare','/evidence','/reports','/cloud','/graph?entity=demo%3Aaster&run=report-123','/locations?entity=demo-route-01']){
  await page.goto(destination);
  await expect.poll(()=>{const url=new URL(page.url());return {path:url.pathname,next:url.searchParams.get('next')};}).toEqual({path:'/auth',next:destination});
  await expect(page.locator('nav[aria-label="Workspace"]')).toHaveCount(0);
  await expect(page.locator('main form')).toBeVisible();
 }
 await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.locator('main form').getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page).toHaveURL(/locations\?entity=demo-route-01$/);
 await page.reload();await expect(page.getByRole('heading',{name:'Operational locations',exact:true})).toBeVisible();await expect(page).toHaveURL(/locations\?entity=demo-route-01$/);
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/auth/);
 await page.goto('/results/123');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.locator('main form').getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page).toHaveURL(/results\/123$/);await expect(page.getByRole('heading',{name:'Result snapshot unavailable'})).toBeVisible();
 await page.getByRole('button',{name:'Sign out',exact:true}).click();
 for(const path of ['/welcome','/auth','/auth/callback','/auth/reset']){await page.goto(path);await expect(page).toHaveURL(new RegExp(path+'$'));}
});


test('protected route waits for session initialization without exposing the workspace',async({page})=>{
 let release,notify;const gate=new Promise(r=>release=r),started=new Promise(r=>notify=r);
 // Finish dataset loading while signup is pending. Auth must keep its component
 // identity, form state and success notice when the workspace shell becomes ready.
 let releaseDataset;const datasetGate=new Promise(r=>releaseDataset=r);
 await page.route('**/api/v1/demo?**',async r=>{await datasetGate;await r.continue();});
 const calls=await mockAuth(page,{beforeExchange:async()=>{notify();await gate;},beforeSignup:async()=>{
  releaseDataset();await expect(page.getByRole('combobox',{name:'Dataset',exact:true})).toBeEnabled();
 }});
 await openForm(page);await page.getByRole('button',{name:'Sign up',exact:true}).click();await page.locator('main form').getByRole('button',{name:'Sign up',exact:true}).click();await expect(page.getByText('Sign-up request accepted.',{exact:false})).toBeVisible();
 expect(calls.signup).toBe(1);expect(calls.unexpected).toEqual([]);
 await expect(page.getByLabel('Email',{exact:true})).toHaveValue(email);
 await page.goto('/portfolio?code=mock-confirmation-code');await started;
 await expect(page.getByText('Restoring session...', {exact:true})).toBeVisible();
 await expect(page.locator('nav[aria-label="Workspace"]')).toHaveCount(0);await expect(page).toHaveURL(/portfolio\?code=/);
 await expect(page.getByRole('heading',{name:'Portfolio',exact:true})).toHaveCount(0);
 release();await expect(page.getByRole('heading',{name:'Portfolio',exact:true})).toBeVisible();await expect(page).toHaveURL(/portfolio/);
});
