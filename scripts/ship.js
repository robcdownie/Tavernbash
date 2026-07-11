/* One-command ship: test, bump, commit. Exists because the loop ran
   51 times by hand in one session and PowerShell reports git's CRLF
   stderr as failure. This script owns its exit code honestly.
   Run: node scripts/ship.js <major|minor|patch> "commit subject"
        [more message lines as extra args] */
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const [kind,...msg]=process.argv.slice(2);
if(!['major','minor','patch'].includes(kind)||!msg.length){
  console.error('usage: node scripts/ship.js <major|minor|patch> "commit subject" [body lines]');
  process.exit(2);
}

/* git runs shell-free so multi-word commit messages survive Windows
   arg joining; npm needs a shell for npm.cmd, so it goes as one string */
function run(cmd,args,opts){
  const r=spawnSync(cmd,args,Object.assign({cwd:root,encoding:'utf8'},opts));
  return r;
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

/* 3. commit; git writes CRLF warnings to stderr on success, ignore them */
run('git',['add','-A']);
const full=pkg.version+' '+msg.join('\n\n')+'\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>';
const c=run('git',['commit','-m',full]);
if(c.status!==0){console.error('commit failed\n'+(c.stderr||'')+(c.stdout||''));process.exit(1);}
console.log((c.stdout||'').split('\n')[0]);
console.log('shipped '+pkg.version);
