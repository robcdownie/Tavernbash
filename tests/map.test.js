import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {genMap, districtPaths, isCombat, treasureWareIds, MAP_VERSION, CONTENT_EPOCH, contentTablesFor} from '../src/map.js';
import {DISTRICTS, MONSTERS, PERSONAS, ITEMS, ENCH} from '../src/data.js';

/* a broad seed spread so the structural rules are proven, not sampled */
const SEEDS=[];
for(let i=0;i<300;i++)SEEDS.push(((i*2654435761)^0x9e3779b9)>>>0);

function allNodes(map){
  const out=[];
  for(const d of map.districts){for(const col of d.columns)for(const n of col)out.push(n);out.push(d.boss);}
  return out;
}
function mainDistricts(map){return map.districts.filter(d=>d.id!==4);}

test('genMap is deterministic: same seed yields identical maps',()=>{
  for(const s of SEEDS.slice(0,20)){
    assert.deepEqual(genMap(s),genMap(s),'seed '+s+' not reproducible');
  }
});

test('the map ledger pins every Quick layout byte except the version stamp',()=>{
  /* v12 regenerated the ledger on purpose: the 0.97.0 synergy-count payoff
     wares are non-unique and tier-2, so they enter treasureWareIds for the
     District II+ gates, shifting rollTreasure's picks for these fixed seeds.
     0.101.0 (CONTENT_EPOCH 2) splits the ledger: the SAME six epoch-1 hashes
     now pin the frozen epoch-1 regeneration (an active epoch-1 run must get
     its exact old map back, byte for byte), and a new epoch-2 ledger pins the
     accepted live maps after the rejected Quick power rollback. The generator
     structure is unchanged, so
     MAP_VERSION stays 12. */
  assert.equal(MAP_VERSION,12);
  assert.equal(CONTENT_EPOCH,2);
  const epoch1=new Map([
    [0,'3c404a5124ef02f713aee10887e9266d60b4e13f870bb848f1af4400edc16fb1'],
    [1,'e89a436d5fac7ebc5d0d982bc9fc3e87449d85583b2e16d9cf7a8fd327b5cd22'],
    [7,'ec545ee7a05bee6406dea5d79b1253f95a5d6b53b5270d94fc435ac0ee19e120'],
    [1234567,'83cc5078d588cada6c5621b373c68ad6fb3efa35b7b28f3be9f7176a49e07c26'],
    [2654435769,'b3b4a76303ba51cb080badc2f4a36b215cb071278e7aaa9e9133287f504cd120'],
    [4294967295,'5c6d3b2bd483917a277d9ae86e3caf0b62b4537f7e0ade73bbd8564cfb903219']
  ]);
  const epoch2=new Map([
    [0,'3c404a5124ef02f713aee10887e9266d60b4e13f870bb848f1af4400edc16fb1'],
    [1,'e89a436d5fac7ebc5d0d982bc9fc3e87449d85583b2e16d9cf7a8fd327b5cd22'],
    [7,'ec545ee7a05bee6406dea5d79b1253f95a5d6b53b5270d94fc435ac0ee19e120'],
    [1234567,'83cc5078d588cada6c5621b373c68ad6fb3efa35b7b28f3be9f7176a49e07c26'],
    [2654435769,'b3b4a76303ba51cb080badc2f4a36b215cb071278e7aaa9e9133287f504cd120'],
    [4294967295,'5c6d3b2bd483917a277d9ae86e3caf0b62b4537f7e0ade73bbd8564cfb903219']
  ]);
  const hash=map=>{delete map.version;return createHash('sha256').update(JSON.stringify(map)).digest('hex');};
  for(const [seed,want] of epoch1){
    assert.equal(hash(genMap(seed,'quick',0,contentTablesFor(1))),want,'epoch-1 Quick regeneration drifted for seed '+seed);
  }
  for(const [seed,want] of epoch2){
    assert.equal(hash(genMap(seed,'quick')),want,'epoch-2 Quick map drifted for seed '+seed);
  }
});

test('Quick power rollback is neutral in both epochs',()=>{
  for(const s of SEEDS.slice(0,40)){
    const live=genMap(s,'quick');
    for(const d of live.districts){
      assert.equal(Object.hasOwn(d,'power'),false,'Quick district '+d.id+' gained power');
      for(const n of allNodes({districts:[d]})){
        assert.equal(Object.hasOwn(n,'power'),false,n.id+' should not carry power');
      }
    }
    const old=genMap(s,'quick',0,contentTablesFor(1));
    for(const d of old.districts){
      assert.equal(Object.hasOwn(d,'power'),false,'epoch-1 Quick district '+d.id+' gained power');
      for(const n of allNodes({districts:[d]}))assert.equal(Object.hasOwn(n,'power'),false,'epoch-1 Quick node '+n.id+' gained power');
    }
  }
});

test('Long builds seven districts and forty selected nodes on the approved bands',()=>{
  for(const s of SEEDS){
    const map=genMap(s,'long');
    assert.equal(map.mode,'long');
    assert.deepEqual(map.districts.map(d=>d.sourceId),[1,2,3,1,2,3,4]);
    assert.equal(map.districts.reduce((n,d)=>n+d.columns.length+1,0),40);
    assert.deepEqual(map.districts.map(d=>d.slip),[3,5,7,8,9,10,0]);
    assert.deepEqual(map.districts.map(d=>d.lossChip),[2,4,6,6,7,8,10]);
    assert.deepEqual(map.districts.map(d=>d.boss.threat),[3,6,9,12,15,18,21]);
    assert.deepEqual(map.districts.slice(3,6).map(d=>d.name),[
      'Back Alleys After Midnight','The Souk After Midnight','Palace Quarter After Midnight'
    ]);
    for(let i=0;i<map.districts.length;i++){
      const d=map.districts[i],lo=i*3+1,hi=i*3+3;
      for(const n of allNodes({districts:[d]}))assert.ok(n.threat>=lo&&n.threat<=hi,n.id+' threat outside '+lo+' to '+hi);
    }
  }
});

test('Long forces every late combat gilded and carries its district power only on combats',()=>{
  for(const s of SEEDS){
    const map=genMap(s,'long');
    assert.ok(map.districts.slice(3).every(d=>d.power>1),'late districts declare non-neutral power');
    for(const d of map.districts.slice(3))for(const n of allNodes({districts:[d]})){
      if(isCombat(n)){
        assert.equal(n.gilded,true,n.id+' was not gilded');
        assert.equal(n.power,d.power,n.id+' lost district power');
      }else assert.equal(Object.hasOwn(n,'power'),false,n.id+' should not carry combat power');
    }
  }
});

test('Long places one shrine in each act and no more than one silver Treasure per act',()=>{
  for(const s of SEEDS){
    const map=genMap(s,'long');
    assert.equal(map.shrineDistricts.length,2);
    assert.ok(map.shrineDistricts[0]===2||map.shrineDistricts[0]===3);
    assert.ok(map.shrineDistricts[1]===5||map.shrineDistricts[1]===6);
    const shrines=[];
    for(const n of allNodes(map))if(n.type==='shrine')shrines.push(n.district);
    assert.deepEqual(shrines.sort(),map.shrineDistricts.slice().sort());
    for(const act of [[1,2,3],[4,5,6]]){
      let silver=0;
      for(const n of allNodes(map))if(act.includes(n.district)&&n.type==='treasure'){
        for(const o of n.reward.options)if(o.kind==='silver')silver++;
      }
      assert.ok(silver<=1,'seed '+s+' act '+act[0]+' offered '+silver+' silver upgrades');
    }
  }
});

test('every seed generates without throwing and has four districts',()=>{
  for(const s of SEEDS){
    const map=genMap(s);
    assert.equal(map.districts.length,4,'seed '+s);
    assert.deepEqual(map.districts.map(d=>d.id),[1,2,3,4]);
  }
});

test('a full run visits exactly 22 selected nodes',()=>{
  for(const s of SEEDS){
    const map=genMap(s);
    /* one node per grid column plus each boss: 5+1 for D1-3, 3+1 for D4 */
    let visited=0;
    for(const d of map.districts){visited+=d.columns.length+1;}
    assert.equal(visited,22,'seed '+s+' visited '+visited);
  }
});

test('District I to III: five columns of three lanes; Dragon Gate is a short gauntlet',()=>{
  for(const s of SEEDS){
    const map=genMap(s);
    for(const d of mainDistricts(map)){
      assert.equal(d.columns.length,5,'district '+d.id+' columns');
      for(const col of d.columns)assert.equal(col.length,3,'district '+d.id+' lane count');
    }
    const d4=map.districts[3];
    assert.equal(d4.columns.length,3);          /* elite choice, prep, then a guaranteed market */
    assert.equal(d4.columns[0].length,2);        /* two elites offered */
    assert.ok(d4.columns[0].every(n=>n.type==='elite'));
    assert.equal(d4.columns[2].length,1);        /* one guaranteed market before the Vizier */
    assert.equal(d4.columns[2][0].type,'market');
  }
});

test('column 1 of every main district is all Monster Doors',()=>{
  for(const s of SEEDS){
    for(const d of mainDistricts(genMap(s))){
      assert.ok(d.columns[0].every(n=>n.type==='monster'),'district '+d.id);
    }
  }
});

test('elites never appear before column 3 and at most one per district',()=>{
  for(const s of SEEDS){
    for(const d of mainDistricts(genMap(s))){
      let elites=0;
      d.columns.forEach((col,ci)=>col.forEach(n=>{
        if(n.type==='elite'){elites++;assert.ok(ci>=2,'elite too early in district '+d.id+' col '+(ci+1));}
      }));
      assert.ok(elites<=1,'district '+d.id+' has '+elites+' elites');
    }
  }
});

test('exactly one Quqnus Shrine per run, in District II or III',()=>{
  for(const s of SEEDS){
    const map=genMap(s);
    let total=0,where=0;
    for(const d of map.districts)for(const col of d.columns)for(const n of col)if(n.type==='shrine'){total++;where=d.id;}
    assert.equal(total,1,'seed '+s+' shrine count');
    assert.ok(where===2||where===3,'seed '+s+' shrine in district '+where);
    assert.equal(where,map.shrineDistrict);
  }
});

test('every path holds fewer than three combats in a row (the boss counts)',()=>{
  for(const s of SEEDS){
    for(const d of mainDistricts(genMap(s))){
      for(const p of districtPaths(d)){
        for(let i=0;i+3<=p.length;i++){
          assert.ok(!(isCombat(p[i])&&isCombat(p[i+1])&&isCombat(p[i+2])),
            'district '+d.id+' path has three combats in a row');
        }
      }
    }
  }
});

test('event cadence: no choice event twice running, none more than twice per path',()=>{
  const EVENTS=new Set(['treasure','negotiation','rest','shrine']);
  for(const s of SEEDS){
    for(const mode of ['quick','long']){
      const map=genMap(s,mode);
      for(const d of map.districts){
        if(d.id===4&&mode==='quick')continue;              /* the Gate gauntlet is fixed */
        if(d.columns.length!==5)continue;                  /* Long's Gate reprise too */
        for(const p of districtPaths(d)){
          const counts={};
          for(let i=0;i<p.length;i++){
            const t=p[i].type;
            if(!EVENTS.has(t))continue;
            assert.ok(!(i+1<p.length&&p[i+1].type===t),
              'seed '+s+' '+mode+' district '+d.id+' repeats '+t+' twice running');
            counts[t]=(counts[t]||0)+1;
            assert.ok(counts[t]<=2,'seed '+s+' '+mode+' district '+d.id+' has '+t+' more than twice on a path');
          }
        }
      }
    }
  }
});

test('no dead ends, and the braid steps only to the same or an adjacent lane',()=>{
  for(const s of SEEDS){
    const map=genMap(s);
    for(const d of map.districts){
      const lastCol=d.columns[d.columns.length-1];
      for(const col of d.columns){
        for(const n of col){
          assert.ok(n.next.length>=1,'dead end at '+n.id);
          /* the adjacent-lane braid is a main-district rule; the Dragon Gate
             is a deliberate full-choice gauntlet where each elite reaches
             every preparation node */
          if(d.id!==4){
            for(const nx of n.next){
              const t=map.nodes[nx];
              if(t.type!=='boss')assert.ok(Math.abs(t.lane-n.lane)<=1,'lane jump '+n.id+'->'+nx);
            }
          }
        }
      }
      /* last column feeds the boss */
      for(const n of lastCol)assert.ok(n.next.includes(d.boss.id),'no boss edge from '+n.id);
    }
  }
});

test('a Market is reachable from every district entrance',()=>{
  for(const s of SEEDS){
    for(const d of mainDistricts(genMap(s))){
      const m={};for(const col of d.columns)for(const n of col)m[n.id]=n;m[d.boss.id]=d.boss;
      for(const start of d.columns[0]){
        const seen=new Set(),stack=[start];let market=false;
        while(stack.length){const n=stack.pop();if(seen.has(n.id))continue;seen.add(n.id);if(n.type==='market')market=true;for(const nx of n.next)stack.push(m[nx]);}
        assert.ok(market,'district '+d.id+' start '+start.id+' cannot reach a Market');
      }
    }
  }
});

test('boss preparation: every column 4 node can reach a Market or Rest in column 5',()=>{
  for(const s of SEEDS){
    for(const d of mainDistricts(genMap(s))){
      for(const n of d.columns[3]){
        const ok=n.next.some(nx=>{const t=d.columns[4].find(x=>x.id===nx);return t&&(t.type==='market'||t.type==='rest');});
        assert.ok(ok,'district '+d.id+' column 4 node '+n.id+' has no Market/Rest prep');
      }
    }
  }
});

test('bosses are the doc-fixed monsters and never gilded',()=>{
  const bosses={1:'matron',2:'collector',3:'ifrit',4:'vizier'};
  for(const s of SEEDS){
    for(const d of genMap(s).districts){
      assert.equal(d.boss.monId,bosses[d.id],'district '+d.id+' boss');
      assert.equal(d.boss.gilded,false);
      assert.equal(d.boss.type,'boss');
    }
  }
});

test('the self-scaling mirror is in D2 and the fixed Nasnas check is in D3',()=>{
  assert.ok(DISTRICTS[1].normals.includes('qareen'));
  assert.ok(!DISTRICTS[1].normals.includes('nasnas'));
  assert.ok(DISTRICTS[2].normals.includes('nasnas'));
  assert.ok(!DISTRICTS[2].normals.includes('qareen'));
});

test('Ifrit carries the strengthened D3 boss health',()=>{
  assert.equal(MONSTERS.ifrit.hp,500);
});

test('Azhdaha heads open on the softened Gate cadence',()=>{
  assert.deepEqual(MONSTERS.azhdaha.board.map(head=>head.cd),[12,12,12]);
});

test('no monster id repeats within a run, and every monster is legal for its role',()=>{
  const normals=new Set(),elites=new Set();
  for(const D of DISTRICTS){D.normals.forEach(m=>normals.add(m));D.elites.forEach(m=>elites.add(m));}
  for(const s of SEEDS){
    const map=genMap(s);
    const seen=new Set();
    for(const n of allNodes(map)){
      if(!n.monId)continue;
      if(n.type==='monster')assert.ok(normals.has(n.monId),'illegal normal '+n.monId);
      if(n.type==='elite')assert.ok(elites.has(n.monId),'illegal elite '+n.monId);
      assert.ok(MONSTERS[n.monId],'unknown monster '+n.monId);
      assert.ok(!seen.has(n.monId),'seed '+s+' repeats monster '+n.monId);
      seen.add(n.monId);
    }
  }
});

test('threat rises with district and matches the doc for bosses',()=>{
  const bossThreat={1:3,2:6,3:9,4:12};
  for(const s of SEEDS){
    for(const d of genMap(s).districts){
      assert.equal(d.boss.threat,bossThreat[d.id]);
      const D=DISTRICTS[d.id-1];
      for(const col of d.columns)for(const n of col){
        assert.ok(n.threat>=D.threatEarly&&n.threat<=D.threatLate,'threat out of band at '+n.id);
      }
    }
  }
});

test('every Treasure previews three options; every Negotiation names a persona',()=>{
  for(const s of SEEDS){
    for(const n of allNodes(genMap(s))){
      if(n.type==='treasure'){
        assert.ok(n.reward&&Array.isArray(n.reward.options)&&n.reward.options.length===3,'bad treasure '+n.id);
        for(const o of n.reward.options){
          assert.ok(['gold','ware','enchant','silver'].includes(o.kind),'bad reward kind');
          /* face-up: the ware/enchant options carry a concrete, valid id at gen time */
          if(o.kind==='ware'){
            assert.ok(o.id&&ITEMS[o.id]&&!ITEMS[o.id].inc&&(!ITEMS[o.id].unique||ITEMS[o.id].acquisition==='treasure'),
              'ware option not face-up at '+n.id);
            if(n.district===1)assert.equal(ITEMS[o.id].tier,1,'district I treasure ware over-tier at '+n.id);
          }
          if(o.kind==='enchant')assert.ok(o.ench&&ENCH[o.ench],'enchant option not face-up at '+n.id);
        }
      }
      if(n.type==='negotiation'){
        assert.ok(Number.isInteger(n.persona)&&PERSONAS[n.persona],'bad persona at '+n.id);
      }
    }
  }
});

test('every R8 unique ware has a nonzero face-up Treasure acquisition path',()=>{
  const dragonGatePool=new Set(treasureWareIds(4));
  for(const [id,item] of Object.entries(ITEMS)){
    if(item.acquisition==='treasure')assert.ok(dragonGatePool.has(id),id+' is missing from Dragon Gate Treasure stock');
  }
});

test('the rare silver treasure upgrade appears at most once per run',()=>{
  for(const s of SEEDS){
    let silver=0;
    for(const n of allNodes(genMap(s)))if(n.type==='treasure')for(const o of n.reward.options)if(o.kind==='silver')silver++;
    assert.ok(silver<=1,'seed '+s+' offered silver '+silver+' times');
  }
});

test('gilded doors land near the 12% design rate across many seeds',()=>{
  let doors=0,gilded=0;
  for(const s of SEEDS){
    for(const n of allNodes(genMap(s))){
      if(n.type==='monster'||n.type==='elite'){doors++;if(n.gilded)gilded++;}
    }
  }
  const rate=gilded/doors;
  assert.ok(rate>0.07&&rate<0.17,'gilded rate '+rate.toFixed(3)+' strayed from 12%');
});
