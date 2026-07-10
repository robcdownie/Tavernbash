"use strict";
/* Sprite access point. Phase 2 extends this to try painted PNGs first and
   fall back to the inline SVG symbol per id. For now it renders the symbol. */
export function ic(id,cls,style){return '<svg'+(cls?' class="'+cls+'"':'')+(style?' style="'+style+'"':'')+' aria-hidden="true"><use href="#'+id+'"/></svg>';}
