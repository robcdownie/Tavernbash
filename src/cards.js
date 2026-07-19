"use strict";
/* Shared ware-card rendering. Pure: given an item def id + rarity, or an item
   instance, it returns markup and touches no game state. Both the market
   detail panel and the stall detail sheet consume wareDetailHTML, so a ware
   reads the same everywhere. This is the first extracted UI component; more
   card/action pieces move here as each screen is reworked. */
import {ic} from './art.js';
import {integOf} from './engine.js';
import {ITEMS,RSTAT,RNAME,ENCH} from './data.js';

/* the small effect chips shown on cards: real, rarity-scaled numbers */
export function effChips(id,rarity){
  const d=ITEMS[id];const rs=RSTAT[rarity||0];const c=[];const f=d.fx||{};
  if(f.dmg)c.push(['dmg','e-blade',Math.round(f.dmg*rs)]);
  if(f.poison)c.push(['poison','e-skull',Math.round(f.poison*rs)]);
  if(f.burn)c.push(['burn','e-flame',Math.round(f.burn*rs)]);
  if(f.shield)c.push(['shield','e-shield',Math.round(f.shield*rs)]);
  if(f.heal)c.push(['heal','e-heart',Math.round(f.heal*rs)]);
  if(f.haste)c.push(['util','e-bolt',(Math.round(f.haste*rs*10)/10)+'s haste']);
  if(d.inc)c.push(['util','e-bolt','+'+Math.round(d.inc*rs)+'g/rd']);
  if(d.incomeByRarity)c.push(['util','e-bolt','+'+d.incomeByRarity[rarity||0]+'g/win']);
  if(d.adjDmg)c.push(['util','e-blade','adj +'+Math.round(d.adjDmg*rs)]);
  if(d.cdMul)c.push(['util','e-clock','12% faster']);
  if(d.bulwark)c.push(['shield','e-shield','Bulwark']);
  return c.map(function(x){return '<span class="eff '+x[0]+'">'+ic(x[1],'mi')+' '+x[2]+'</span>';}).join('');
}

/* the stable detail block: art, rarity + name, full rule, then a chip row of
   the real numbers plus integrity and cadence. Accepts any {id,rarity,ench}. */
export function wareDetailHTML(it,anomaly){
  const d=ITEMS[it.id];const en=it.ench?ENCH[it.ench]:null;const rar=it.rarity||0;
  return '<div class="st"><span class="ico" style="width:64px;height:64px">'+ic('g-'+it.id,'','width:100%;height:100%')+'</span>'
   +'<div><div class="nm">'+RNAME[rar]+' '+(en?'<span style="color:'+en.c+'">'+en.n+'</span> ':'')+d.n+'</div>'
   +'<div class="ds">'+(en?en.d+' ':'')+d.d+'</div>'
   +'<div style="margin-top:5px">'+effChips(it.id,rar)+'<span class="eff util">'+ic('e-shield','mi')+' '+Math.round(integOf(it)*((anomaly&&anomaly.itemIntegrityMul)||1))+'</span>'
   +(d.cd>0?'<span class="eff util">'+ic('e-clock','mi')+' every '+d.cd+'s</span>':'<span class="eff util">passive</span>')+'</div></div></div>';
}
