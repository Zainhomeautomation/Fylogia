import {defineConfig,devices} from '@playwright/test'
export default defineConfig({
 testDir:'./tests',fullyParallel:true,timeout:60000,retries:process.env.CI?1:0,
 reporter:'list',use:{baseURL:process.env.FOLIO_TEST_URL||'http://127.0.0.1:4173/Folio/',trace:'retain-on-failure'},
 projects:[{name:'desktop-chromium',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},{name:'iphone-webkit',use:{...devices['iPhone 13'],defaultBrowserType:'webkit'}},{name:'ipad-webkit',use:{...devices['iPad Pro 11'],defaultBrowserType:'webkit'}}],
 webServer:process.env.FOLIO_TEST_URL?undefined:{command:'npm run preview -- --host 127.0.0.1',url:'http://127.0.0.1:4173/Folio/',reuseExistingServer:!process.env.CI}
})
