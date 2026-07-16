/* The cumulative Lantern ladder readout: L0 through L10, both routes.
   Gates from design-lantern-0.89.md revision 2 plus the Codex rulings:
   - stairstep: no sim-visible level (L1, L3, L4, L7, L8, L10) drops more than
     ~12 points below its predecessor
   - L7 and L8 gold: median earned gold rises by no more than 2 over L0
   - L8: at least one gilded door per district entrance stays useful, all
     three gilded stays at or below 10 percent
   Run: node scripts/lantern-ladder.js [runs]  (default 1200) */
import {simRun} from './route-sim.js';
import {genMap} from '../src/map.js';
import {isGateDistrict} from '../src/route.js';

const runs=+(process.argv[2]||1200);
const CFG={startResolve:null,bossLossAdj:0,treasureCash:6,negoCash:6,rewardGoldAdj:0,reprisePower:1,reprisePowers:null,lantern:0};

function median(xs){const s=xs.slice().sort((a,b)=>a-b);return s.length?s[Math.floor(s.length/2)]:0;}
function pct(n,d){return d?(100*n/d).toFixed(1):'0.0';}

/* map-level L8 shape checks, no fights needed */
function entranceGilding(lv,mode,n){
  let any=0,all=0,entrances=0;
  for(let i=0;i<n;i++){
    const map=genMap(((i*2654435761)^0x9e3779b9)>>>0,mode,lv);
    for(const d of map.districts){
      /* forceGilded reprises are all-gilded by design at every level; the L8
         entrance metric measures only the seeded-chance districts */
      if(isGateDistrict(d)||d.columns.length!==5||d.forceGilded)continue;
      const col=d.columns[0].filter(x=>x.type==='monster');
      if(col.length!==3)continue;
      entrances++;
      const g=col.filter(x=>x.gilded).length;
      if(g>0)any++;if(g===3)all++;
    }
  }
  return {any:pct(any,entrances),all:pct(all,entrances),n:entrances};
}

for(const mode of ['quick','long']){
  console.log('\n=== '+mode.toUpperCase()+' ladder, '+runs+' seeds per level ===');
  console.log('lv  clear%   medGold  minResolve(med)  guards');
  let prevClear=null,l0Gold=null;
  for(let lv=0;lv<=10;lv++){
    const cfg=Object.assign({},CFG,{lantern:lv});
    let wins=0,guards=0,golds=[],minRes=[];
    for(let i=0;i<runs;i++){
      const m=simRun(((i*2654435761)^0x9e3779b9)>>>0,cfg,mode);
      if(m.result==='won')wins++;
      guards+=m.guardTrips;golds.push(m.goldEarned);minRes.push(m.minResolve);
    }
    const clear=100*wins/runs,medGold=median(golds);
    const step=prevClear!=null?(clear-prevClear).toFixed(1):'';
    if(lv===0)l0Gold=medGold;
    const flags=[];
    if(prevClear!=null&&(prevClear-clear)>12&&[1,3,4,7,8,10].includes(lv))flags.push('STEP>12');
    if((lv===7||lv===8)&&(medGold-l0Gold)>2)flags.push('GOLD+'+(medGold-l0Gold));
    console.log(String(lv).padStart(2)+'  '+clear.toFixed(1).padStart(5)+'   '+String(medGold).padStart(6)
      +'   '+String(median(minRes)).padStart(6)+'          '+guards+(step?'   step '+step:'')+(flags.length?'   '+flags.join(' '):''));
    prevClear=clear;
  }
  const eg0=entranceGilding(0,mode,300),eg8=entranceGilding(8,mode,300);
  console.log('L8 entrances with any gilded door: '+eg0.any+'% -> '+eg8.any+'%   all three gilded: '+eg0.all+'% -> '+eg8.all+'% (n='+eg8.n+')');
}
