"use strict";
/* Sprite access point. Tries painted PNG art first (via the generated
   manifest) and falls back to the inline SVG symbol for that id. The outer
   <svg> wrapper is kept in both branches so every existing CSS selector,
   size rule, and drop-shadow filter applies unchanged. */
import {ART} from './art-manifest.js';

export function icMarkup(id, cls, style, src) {
  const open = '<svg' + (cls ? ' class="' + cls + '"' : '') + (style ? ' style="' + style + '"' : '') + ' aria-hidden="true">';
  const body = src
    ? '<image href="' + src + '" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/>'
    : '<use href="#' + id + '"/>';
  return open + body + '</svg>';
}

export function ic(id, cls, style) { return icMarkup(id, cls, style, ART[id]); }

/* Applies the large painted pieces at boot when they exist in the manifest:
   bg-market fills the fixed #bgart layer behind the app, board-wood textures
   the stall grid. Card frames wait for real art to tune the 9-slice. With an
   empty manifest this is a no-op and the game looks exactly as before. */
export function applyBigArt(doc) {
  const d = doc || (typeof document !== 'undefined' ? document : null);
  if (!d) return;
  if (ART['bg-market']) {
    const el = d.getElementById('bgart');
    if (el) { el.style.backgroundImage = 'url(' + ART['bg-market'] + ')'; el.style.display = 'block'; }
  }
  if (ART['board-wood']) {
    d.documentElement.style.setProperty('--board-art', 'url(' + ART['board-wood'] + ')');
    d.documentElement.classList.add('art-board');
  }
  const metals = ['bronze', 'silver', 'gold', 'diamond'];
  if (metals.every(function (m) { return ART['frame-' + m]; })) {
    metals.forEach(function (m) {
      d.documentElement.style.setProperty('--frame-' + m, 'url(' + ART['frame-' + m] + ')');
    });
    d.documentElement.classList.add('art-frames');
  }
}
