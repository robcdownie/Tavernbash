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
