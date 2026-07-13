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
    /* bare `npm run dev` is `vite`, which defaults to 5173; pin it to the port
       the tests expect and fail fast (strictPort) instead of drifting if 5199
       is momentarily held, so the suite never silently waits on the wrong port */
    command: 'npm run dev -- --port 5199 --strictPort',
    url: 'http://localhost:5199',
    /* do NOT reuse an existing server: a stale dev server (HMR-retained old
       modules) once silently passed the suite against deleted code. Start fresh
       every run and fail loudly (strictPort) if 5199 is held. */
    reuseExistingServer: false,
    timeout: 60000
  },
  projects: [
    {name: 'landscape', use: {viewport: {width: 844, height: 390}}},
    {name: 'portrait', use: {viewport: {width: 390, height: 844}}}
  ]
});
