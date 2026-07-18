/* One-command ship: test, bump, commit. Exists because the loop ran
   51 times by hand in one session and PowerShell reports git's CRLF
   stderr as failure. This script owns its exit code honestly.

   Launch L1 0.99.1: staging is now explicit. The old git add -A let a stray
   untracked file ride into a release. This stages only an approved file set and
   refuses any unexpected path. The approved set is the active reservation's
   files list in coordination/state.json (matched by the current branch); when
   there is no such reservation it stages tracked changes and refuses any
   unexpected untracked file. The staging planner is pure and tested in
   tests/coordination.test.js.

   Run: node scripts/ship.js <major|minor|patch> "commit subject"
        [more message lines as extra args] */
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parsePorcelain,planStaging} from './coordination.js';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const [kind,...msg]=process.argv.slice(2);
if(!['major','minor','patch'].includes(kind)||!msg.length){
  console.error('usage: node scripts/ship.js <major|minor|patch> "commit subject" [body lines]');
  process.exit(2);
}

/* git runs shell-free so multi-word commit messages survive Windows
   arg joining; npm needs a shell for npm.cmd, so it goes as one string */
function git(args){
  return spawnSync('git',args,{cwd:root,encoding:'utf8'});
}

/* 1. tests must pass */
const t=spawnSync('npm test',{cwd:root,encoding:'utf8',shell:true});
const summary=(t.stdout||'').split('\n').filter(l=>/^. (pass|fail) /.test(l.replace(/[^\x20-\x7e]/g,' ').trim())||/pass \d|fail \d/.test(l)).join(' ');
if(t.status!==0){
  console.error('tests failed, nothing shipped\n'+(t.stdout||'').split('\n').filter(l=>l.includes('not ok')||l.includes('fail')).slice(0,20).join('\n'));
  process.exit(1);
}
console.log('tests green '+summary.trim());

/* 2. bump the version */
const pkgPath=join(root,'package.json');
const pkg=JSON.parse(readFileSync(pkgPath,'utf8'));
const v=pkg.version.split('.').map(Number);
if(kind==='major'){v[0]++;v[1]=0;v[2]=0;}else if(kind==='minor'){v[1]++;v[2]=0;}else{v[2]++;}
pkg.version=v.join('.');
writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+'\n');
console.log('version '+pkg.version);

/* 3. explicit staging: resolve the approved set from the active reservation,
   refuse anything unexpected, then stage by path (never git add -A). */
const entries=parsePorcelain((git(['status','--porcelain']).stdout)||'');
let approved=[], strict=false;
const statePath=join(root,'coordination','state.json');
if(existsSync(statePath)){
  try{
    const state=JSON.parse(readFileSync(statePath,'utf8'));
    const branch=((git(['rev-parse','--abbrev-ref','HEAD']).stdout)||'').trim();
    const res=(state.reservations||[]).find(r=>r.branch===branch);
    if(res&&Array.isArray(res.files)){approved=res.files;strict=true;}
  }catch(e){/* fall back to the safe default staging below */}
}
const plan=planStaging(entries,approved,{strict});
if(plan.refuse.length){
  console.error('ship refused: files outside the approved set (stage them explicitly or update the reservation)\n  '+plan.refuse.join('\n  '));
  process.exit(1);
}
if(!plan.stage.length){console.error('nothing to stage, nothing shipped');process.exit(1);}
for(const p of plan.stage){
  const a=git(['add','--',p]);
  if(a.status!==0){console.error('stage failed for '+p+'\n'+(a.stderr||''));process.exit(1);}
}

/* 4. commit; git writes CRLF warnings to stderr on success, ignore them */
const full=pkg.version+' '+msg.join('\n\n')+'\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>';
const c=git(['commit','-m',full]);
if(c.status!==0){console.error('commit failed\n'+(c.stderr||'')+(c.stdout||''));process.exit(1);}
console.log((c.stdout||'').split('\n')[0]);
console.log('shipped '+pkg.version);
