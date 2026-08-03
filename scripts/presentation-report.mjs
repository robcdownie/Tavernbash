"use strict";

import {copyFile, mkdir, readdir, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {basename, dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export async function measurePresentation(page, selectors = []) {
  return await page.evaluate((requested) => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const pathFor = (element) => {
      if (element.id) return '#' + CSS.escape(element.id);
      const parts = [];
      let node = element;
      while (node && node !== document.body && parts.length < 4) {
        let part = node.tagName.toLowerCase();
        if (node.classList.length) part += '.' + Array.from(node.classList).slice(0, 3).map((name) => CSS.escape(name)).join('.');
        const parent = node.parentElement;
        if (parent) {
          const peers = Array.from(parent.children).filter((child) => child.tagName === node.tagName);
          if (peers.length > 1) part += ':nth-of-type(' + (peers.indexOf(node) + 1) + ')';
        }
        parts.unshift(part);
        node = parent;
      }
      return parts.join(' > ');
    };
    const box = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        selector: pathFor(element),
        x: +rect.x.toFixed(1),
        y: +rect.y.toFixed(1),
        width: +rect.width.toFixed(1),
        height: +rect.height.toFixed(1),
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        text: (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90)
      };
    };
    const all = Array.from(document.querySelectorAll('body *')).filter(visible);
    const overflow = [];
    for (const element of all) {
      const widthDelta = element.scrollWidth - element.clientWidth;
      const heightDelta = element.scrollHeight - element.clientHeight;
      if (widthDelta <= 1 && heightDelta <= 1) continue;
      const item = box(element);
      item.widthDelta = widthDelta;
      item.heightDelta = heightDelta;
      item.kind = /auto|scroll/.test(item.overflowX + ' ' + item.overflowY) ? 'scroll-risk' : 'clip-risk';
      overflow.push(item);
    }
    overflow.sort((a, b) => {
      const riskA = Math.max(a.widthDelta, a.heightDelta);
      const riskB = Math.max(b.widthDelta, b.heightDelta);
      return riskB - riskA || a.selector.localeCompare(b.selector);
    });
    const targets = [];
    for (const element of Array.from(document.querySelectorAll('button,a,[role="button"],.ware,.rmnode')).filter(visible)) {
      const item = box(element);
      if (item.width < 44 || item.height < 44) targets.push(item);
    }
    const named = {};
    for (const selector of requested) {
      const element = document.querySelector(selector);
      named[selector] = element && visible(element) ? box(element) : null;
    }
    const doc = document.documentElement;
    return {
      viewport: {
        width: innerWidth,
        height: innerHeight,
        pageWidth: doc.scrollWidth,
        pageHeight: doc.scrollHeight,
        widthDelta: doc.scrollWidth - innerWidth,
        heightDelta: doc.scrollHeight - innerHeight
      },
      overflow: overflow.slice(0, 80),
      undersizedTargets: targets.slice(0, 80),
      named
    };
  }, selectors);
}

async function filesUnder(path) {
  if (!existsSync(path)) return [];
  const entries = await readdir(path, {withFileTypes: true});
  const out = [];
  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) out.push(...await filesUnder(child));
    else if (entry.isFile()) out.push(child);
  }
  return out;
}

function artifactSuffix(artifact) {
  const rm = artifact.profile === 'reduced' ? '-rm' : '';
  return artifact.label + rm + '.png';
}

async function locateBefore(beforeRoot, artifact) {
  if (!beforeRoot || !existsSync(beforeRoot)) return null;
  const files = await filesUnder(beforeRoot);
  const viewportFiles = files.filter((file) => relative(beforeRoot, file).replaceAll('\\', '/').includes(artifact.viewport + '/'));
  const suffix = artifactSuffix(artifact);
  return viewportFiles.find((file) => basename(file) === suffix) ||
    viewportFiles.find((file) => basename(file).endsWith(suffix)) ||
    null;
}

function esc(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function writePresentationReport({
  out,
  state,
  seed,
  fingerprint,
  artifacts,
  log = [],
  sources = [],
  beforeRoot = null,
  summary = {}
}) {
  const reportDir = join(out, 'review');
  await mkdir(reportDir, {recursive: true});
  const pairs = [];
  for (const artifact of artifacts) {
    const before = await locateBefore(beforeRoot, artifact);
    let copiedBefore = null;
    if (before) {
      const beforeDir = join(reportDir, 'before', artifact.viewport);
      await mkdir(beforeDir, {recursive: true});
      copiedBefore = join(beforeDir, basename(before));
      await copyFile(before, copiedBefore);
    }
    pairs.push({
      ...artifact,
      before: copiedBefore ? relative(out, copiedBefore).replaceAll('\\', '/') : null,
      after: relative(out, artifact.file).replaceAll('\\', '/')
    });
  }
  const report = {
    schema: 1,
    state,
    seed,
    sourceFingerprint: fingerprint,
    summary,
    sources,
    artifacts: pairs,
    log
  };
  await writeFile(join(reportDir, 'review-packet.json'), JSON.stringify(report, null, 1) + '\n');

  const imageLines = pairs.map((pair) => {
    const before = pair.before ? join(out, pair.before) : 'none supplied';
    return '- ' + pair.viewport + ' ' + pair.profile + ': before ' + before + ', after ' + pair.file;
  });
  const markdown = [
    '# Fresh presentation review packet',
    '',
    'Review only. Do not edit files.',
    '',
    'State: ' + state,
    'Seed: ' + seed,
    'Source fingerprint: ' + fingerprint.hash,
    '',
    'Images:',
    '',
    ...imageLines,
    '',
    'Live render files:',
    '',
    ...sources.map((source) => '- ' + join(root, source)),
    '',
    'Return a decisive SHIP or HOLD, ranked P0 through P3 findings, and one exact next one-system visual improvement. Judge hierarchy, composition, legibility, clipping, overflow, hit targets, and orientation parity. Keep real-phone approval separate. Do not ask for or rely on earlier findings.',
    ''
  ].join('\n');
  await writeFile(join(reportDir, 'review-packet.md'), markdown);

  const cards = pairs.map((pair) => {
    const before = pair.before ?
      '<figure><img src="' + esc('../' + pair.before) + '"><figcaption>before</figcaption></figure>' :
      '<figure class="missing"><div>no before image</div><figcaption>before</figcaption></figure>';
    const after = '<figure><img src="' + esc('../' + pair.after) + '"><figcaption>after</figcaption></figure>';
    const risks = (pair.measurements && pair.measurements.overflow || []).slice(0, 12).map((risk) =>
      '<tr><td>' + esc(risk.kind) + '</td><td>' + esc(risk.selector) + '</td><td>' + risk.widthDelta + '</td><td>' + risk.heightDelta + '</td><td>' + esc(risk.text) + '</td></tr>'
    ).join('');
    return '<section><h2>' + esc(pair.viewport + ' ' + pair.profile) + '</h2><div class="pair">' + before + after + '</div>' +
      '<h3>automatic overflow inventory</h3><table><thead><tr><th>kind</th><th>element</th><th>width delta</th><th>height delta</th><th>text</th></tr></thead><tbody>' +
      (risks || '<tr><td colspan="5">none</td></tr>') + '</tbody></table></section>';
  }).join('\n');
  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Presentation review packet</title><style>body{margin:24px;background:#15110c;color:#eadfc9;font:14px/1.45 system-ui,sans-serif}' +
    'h1,h2,h3{color:#ffd98a}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}.pair figure{margin:0}.pair img{width:100%;height:auto;border:1px solid #6f5732}' +
    'figcaption{text-align:center;color:#c8b792}.missing div{min-height:180px;display:grid;place-items:center;border:1px dashed #6f5732;color:#8c7b61}' +
    'table{width:100%;border-collapse:collapse}th,td{padding:6px;border-bottom:1px solid #443622;text-align:left;vertical-align:top}section{margin-top:32px}' +
    '@media(max-width:720px){.pair{grid-template-columns:1fr}}</style></head><body><h1>Presentation review packet</h1>' +
    '<p>state ' + esc(state) + ' &middot; seed ' + seed + ' &middot; source ' + esc(fingerprint.hash.slice(0, 12)) + '</p>' +
    cards + '</body></html>';
  await writeFile(join(reportDir, 'index.html'), html);
  return report;
}
