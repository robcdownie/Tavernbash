import {test as base, expect} from '@playwright/test';

/* Test-infrastructure only. index.html pulls Rakkas and Hanken Grotesk from
   the Google Fonts CDN with a render-blocking <link rel="stylesheet">
   (index.html:15 to 17). On a host that cannot reach that CDN, the request
   does not fail fast, it hangs: the browser holds the load event, page.goto
   never resolves, and every spec here starts with page.goto('/'), so the
   whole suite times out. The dev server is healthy the entire time, which is
   why the stall reads as environmental and is easy to misdiagnose.

   So: probe the CDN once per worker, and only when it is unreachable do we
   abort the font requests so the page falls back to local fonts and loads.
   On a networked host (Robbie's machine, GitHub Actions) nothing changes and
   the tests keep exercising the real webfonts.

   Set BB_FONT_CDN=block to force the offline path (used to prove the suite
   survives a dead CDN) or BB_FONT_CDN=allow to skip the probe entirely. */

const FONT_GLOBS = ['**://fonts.googleapis.com/**', '**://fonts.gstatic.com/**'];
const PROBE_URL = 'https://fonts.googleapis.com/css2?family=Rakkas&display=swap';

let probe = null;
function fontCdnReachable() {
  if (!probe) {
    probe = (async () => {
      const forced = (process.env.BB_FONT_CDN || '').toLowerCase();
      if (forced === 'block') return false;
      if (forced === 'allow') return true;
      try {
        const res = await fetch(PROBE_URL, {signal: AbortSignal.timeout(4000)});
        return res.ok;
      } catch {
        return false;
      }
    })();
  }
  return probe;
}

/* override the built-in page fixture; no spec here builds its own context */
export const test = base.extend({
  page: async ({page}, use) => {
    if (!(await fontCdnReachable())) {
      for (const glob of FONT_GLOBS) await page.route(glob, route => route.abort());
    }
    await use(page);
  }
});

export {expect};
