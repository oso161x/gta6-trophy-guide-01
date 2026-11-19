// GTA VI Trophy Guide — the entry program (Node 22, standard library only).
//
// What it hands in: this directory's app/ (the offline static guide — index.html,
// app.js, style.css and data/trophies.json with the 55 trophies and their guides)
// and screenshots/ (3 or 4 real renders of the app in a browser), copied to
// /output, plus /output/dossier.json written by the vendored make.fun library
// (vendor/makefun-frontend.ts — leave it exactly as it is; the scorer requires
// dossier.json to be byte for byte what its own copy writes).
//
// Before copying, it checks the entry the way the gate will:
//   - app/index.html exists and app/data/trophies.json parses with all 55
//     official trophies, each with a non-blank name and guide;
//   - screenshots/ holds 3 or 4 PNG or JPEG files, each at most 256 KiB;
//   - no file in app/ reaches for the network (a quick scan for http/https
//     references in the HTML, JS and CSS — the guide must work offline).
// A failed check prints what is wrong and exits non-zero instead of handing
// in a broken entry.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const MAX_SCREENSHOT_BYTES = 262144;
const TROPHY_COUNT = 55;

function fail(message: string): never {
  console.error('main.ts: ' + message);
  process.exit(1);
}

// 1. The trophy data must be complete: 55 trophies, each with a name and a guide.
const dataPath = join(here, 'app', 'data', 'trophies.json');
if (!existsSync(dataPath)) fail('app/data/trophies.json is missing.');
const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
const list = Array.isArray(data) ? data : data.trophies;
if (!Array.isArray(list) || list.length !== TROPHY_COUNT) {
  fail('trophies.json must hold ' + TROPHY_COUNT + ' trophies, found ' + (Array.isArray(list) ? list.length : 'none') + '.');
}
for (const t of list) {
  if (typeof t.name !== 'string' || !t.name.trim()) fail('a trophy has no name.');
  if (typeof t.guide !== 'string' || !t.guide.trim()) fail('trophy "' + t.name + '" has no guide.');
  if (!Array.isArray(t.sources) || t.sources.length === 0) fail('trophy "' + t.name + '" cites no source.');
}

// 2. The app must open: index.html is there, and nothing in app/ fetches the network.
if (!existsSync(join(here, 'app', 'index.html'))) fail('app/index.html is missing.');
const appFiles: string[] = [];
(function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else appFiles.push(p);
  }
})(join(here, 'app'));
for (const p of appFiles) {
  if (!['.html', '.js', '.css', '.json'].includes(extname(p))) continue;
  const text = readFileSync(p, 'utf-8');
  if (/(?:src|href)\s*=\s*["']https?:|@import\s+["']https?:|url\(\s*["']?https?:|fetch\(\s*["']https?:|import\(\s*["']https?:/.test(text)) {
    fail(p.replace(here, '') + ' reaches for the network — the guide must work offline.');
  }
}

// 3. Screenshots: 3 or 4 real renders, each a PNG or JPEG of at most 256 KiB.
const shotsDir = join(here, 'screenshots');
if (!existsSync(shotsDir)) fail('screenshots/ is missing.');
const shots = readdirSync(shotsDir).filter((f) => ['.png', '.jpg', '.jpeg'].includes(extname(f).toLowerCase()));
if (shots.length < 3 || shots.length > 4) fail('screenshots/ must hold 3 or 4 images, found ' + shots.length + '.');
for (const f of shots) {
  const size = statSync(join(shotsDir, f)).size;
  if (size > MAX_SCREENSHOT_BYTES) fail('screenshots/' + f + ' is ' + size + ' bytes, over the 256 KiB cap.');
}
console.log('main.ts: ' + list.length + ' trophies with guides, ' + shots.length + ' screenshots, no network references.');

// 4. Hand it in: copy app/ and screenshots/, then write the dossier.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
console.log('main.ts: wrote ' + join(out, 'dossier.json'));
