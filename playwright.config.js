import {defineConfig} from '@playwright/test';

/* Layout regression suite. Runs separately from the fast unit tests
   (npm test); drive it with `npm run test:layout`. It reuses a dev server
   on 5199 if one is already up, else starts one. Chromium does not
   reproduce every iOS Safari safe-area quirk, so device Safari stays the
   final acceptance; these guards catch overflow, overlap, touch-target,
   and pinned-footer regressions before they reach a device. */
export default defineConfig({
  testDir: 'e2e',
  timeout: 30000,
  fullyParallel: false,
  reporter: 'list',
  use: {baseURL: 'http://localhost:5199'},
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
    timeout: 60000
  },
  projects: [
    {name: 'landscape', use: {viewport: {width: 844, height: 390}}},
    {name: 'portrait', use: {viewport: {width: 390, height: 844}}}
  ]
});
