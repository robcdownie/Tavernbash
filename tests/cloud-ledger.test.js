import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cloudConfig,validCloudEmail,reportToCloudRow,reportFromCloudRow,
  cloudErrorMessage} from '../src/cloud-ledger-core.js';

function report(){
  return {
    schema:'tavern-bash-run/1',reportId:'run:123',version:'0.91.0',mapVersion:11,
    routeMode:'long',lantern:4,result:'long_clear',seed:0xffffffff,
    endedAt:2000,endedAtIso:'2026-07-16T10:00:00.000Z',
    setup:{heroId:'silkblade',omenId:'silent'},
    progress:{resolve:17,bossesBeaten:7},
    timing:{gameplayMs:654321},metrics:{events:[{type:'shop_roll'}]}
  };
}

test('cloud configuration requires both public browser values',()=>{
  assert.deepEqual(cloudConfig({},{}),{url:'',key:'',enabled:false});
  assert.equal(cloudConfig({VITE_SUPABASE_URL:'https://x.supabase.co'},{}).enabled,false);
  assert.deepEqual(cloudConfig({VITE_SUPABASE_URL:'old',VITE_SUPABASE_PUBLISHABLE_KEY:'old-key'},
    {url:'https://new.supabase.co',key:'new-key'}),{
    url:'https://new.supabase.co',key:'new-key',enabled:true
  });
});

test('cloud row keeps indexed balance fields and the complete immutable report',()=>{
  const source=report(),row=reportToCloudRow(source,'user-1');
  assert.equal(row.user_id,'user-1');
  assert.equal(row.report_id,'run:123');
  assert.equal(row.game_version,'0.91.0');
  assert.equal(row.route_mode,'long');
  assert.equal(row.lantern,4);
  assert.equal(row.seed,0xffffffff);
  assert.equal(row.resolve_end,17);
  assert.equal(row.bosses_beaten,7);
  assert.equal(row.report.metrics.events[0].type,'shop_roll');
  source.metrics.events[0].type='changed';
  assert.equal(row.report.metrics.events[0].type,'shop_roll','the network row is detached from live data');
  const restored=reportFromCloudRow(row);
  restored.result='loss';
  assert.equal(row.report.result,'long_clear','the local merge receives its own detached copy');
});

test('cloud email and player-safe error messages reject malformed input',()=>{
  assert.equal(validCloudEmail('player@example.com'),true);
  assert.equal(validCloudEmail('not-an-email'),false);
  assert.equal(cloudErrorMessage({message:'Failed to fetch'}),'Cloud backup is offline. Local history is safe.');
  assert.equal(cloudErrorMessage({message:'x'.repeat(300)}).length,180);
});
