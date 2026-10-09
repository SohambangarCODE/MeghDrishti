import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./e2e',timeout:30000,fullyParallel:false,workers:1,
  use:{baseURL:process.env.E2E_BASE_URL||'http://127.0.0.1:5173',channel:'msedge',headless:true,trace:'retain-on-failure'},
  reporter:'list',outputDir:'../artifacts/playwright',
  projects:[{name:'desktop',use:{viewport:{width:1440,height:1000}}},{name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}],
});
