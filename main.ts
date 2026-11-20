// GTA VI Trophy Guide — hand-in program.
//
// This program takes the guide in app/ and the renders in screenshots/,
// checks them the way the competition's gate will, and hands them in:
// it copies both directories to the output directory and writes
// dossier.json there with the kit's own library
// (vendor/makefun-frontend.ts — that file is the kit's, leave it alone).
// The dossier must be byte for byte what the library writes, so this
// program never edits it — it only calls the library and saves the result.
//
// Node 22, standard library only, no build step, no dependencies.
// Run it with an output directory of your own while testing:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// or pass the directory with --out. The grader runs it with /output.
// --help prints the usage. --verbose narrates each check as it runs.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// ------------------------------------------------------------------ settings

// The official list, as PlayStation publishes it: 55 trophies in all.
const EXPECTED_TROPHIES = 55;
// How the 55 split by grade: one platinum, two gold, six silver, the
// rest bronze. The gate checks the names; the split is checked here so
// a data slip (a trophy graded twice, one left out) fails loudly.
const EXPECTED_GRADES: Record<string, number> = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
// How many of the 55 PlayStation hides until they are earned.
const EXPECTED_HIDDEN = 28;
// The one trophy the guide writers call possibly missable.
const MISSABLE_NAME = 'Positive Mental Attitude';
// Screenshots: three or four, each a PNG or JPEG of at most 256 KiB.
const MIN_SHOTS = 3;
const MAX_SHOTS = 4;
const MAX_SHOT_BYTES = 262144;
// The gate's own caps for the dossier (RULES.txt, "The gate"): the text
// is capped at 160 KiB, the app at 993 files and 48 MiB. Passing them
// makes this program fail exactly where the scorer would.
// The dossier itself may be at most 1.5 MiB (dossier_matches).
const DOSSIER_MAX_BYTES = 1572864;
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: MAX_SHOTS, max_bytes: MAX_SHOT_BYTES },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

const root = fileURLToPath(new URL('.', import.meta.url));

// ------------------------------------------------------------------ arguments

const args = process.argv.slice(2);
let verbose = false;
let outDir: string | undefined;

for (let i = 0; i < args.length; i++) {
  const a = args[i]!;
  if (a === '--help' || a === '-h') {
    console.log('Usage: node main.ts [--out <dir>] [--verbose] [--help]');
    console.log('');
    console.log('Checks the GTA VI trophy guide in app/ and the renders in');
    console.log('screenshots/, copies both to the output directory and');
    console.log('writes dossier.json there.');
    console.log('');
    console.log('  --out <dir>   where to hand the entry in (default: the');
    console.log('                MAKEFUN_OUTPUT_DIR variable, else /output)');
    console.log('  --verbose     narrate each check as it runs');
    console.log('  --help        print this and exit');
    process.exit(0);
  } else if (a === '--verbose' || a === '-v') {
    verbose = true;
  } else if (a === '--out') {
    outDir = args[++i];
    if (outDir === undefined) die('--out needs a directory after it.');
  } else if (a.startsWith('--out=')) {
    outDir = a.slice('--out='.length);
  } else {
    die('unknown argument: ' + a + ' (see --help).');
  }
}

const out = outDir ?? process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function say(message: string): void {
  if (verbose) console.log('main.ts: ' + message);
}

function die(message: string): never {
  console.error('main.ts: ' + message);
  process.exit(1);
}

// ------------------------------------------------------------------ trophies

// The data file holds the 55 trophies: a JSON object with a "trophies"
// array, or that array alone. Every trophy needs its official name, its
// official description, a guide in the maker's own words and at least one
// cited source. The grades must split as PlayStation lists them, and the
// one missable trophy must be the one the guide writers flag.
interface Trophy {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  grade?: unknown;
  guide?: unknown;
  sources?: unknown;
  hidden?: unknown;
  missable?: unknown;
}

const trophiesPath = join(root, 'app', 'data', 'trophies.json');
if (!existsSync(trophiesPath)) die('app/data/trophies.json is missing.');
let parsed: unknown;
try {
  parsed = JSON.parse(readFileSync(trophiesPath, 'utf-8'));
} catch (err) {
  die('app/data/trophies.json does not parse: ' + (err as Error).message);
}
const trophies: Trophy[] = Array.isArray(parsed) ? parsed : (parsed as { trophies?: Trophy[] }).trophies ?? [];
if (trophies.length !== EXPECTED_TROPHIES) {
  die(`trophies.json must hold ${EXPECTED_TROPHIES} trophies, found ${trophies.length}.`);
}

const seenIds = new Set<unknown>();
const seenNames = new Set<string>();
const gradeCounts: Record<string, number> = {};
let hiddenCount = 0;
const missableNames: string[] = [];

for (const t of trophies) {
  const name = typeof t.name === 'string' ? t.name.trim() : '';
  if (name === '') die('a trophy has no name.');
  if (seenNames.has(name)) die(`trophy "${name}" appears twice.`);
  seenNames.add(name);
  if (t.id !== undefined) {
    if (seenIds.has(t.id)) die(`trophy "${name}" repeats id ${String(t.id)}.`);
    seenIds.add(t.id);
  }
  if (typeof t.description !== 'string' || t.description.trim() === '') {
    die(`trophy "${name}" has no official description.`);
  }
  if (typeof t.guide !== 'string' || t.guide.trim() === '') {
    die(`trophy "${name}" has no guide.`);
  }
  if (!Array.isArray(t.sources) || t.sources.length === 0) {
    die(`trophy "${name}" cites no source.`);
  }
  const grade = typeof t.grade === 'string' ? t.grade.toLowerCase() : '';
  gradeCounts[grade] = (gradeCounts[grade] ?? 0) + 1;
  if (t.hidden === true) hiddenCount++;
  if (t.missable === true) missableNames.push(name);
}

for (const [grade, want] of Object.entries(EXPECTED_GRADES)) {
  const got = gradeCounts[grade] ?? 0;
  if (got !== want) die(`grade ${grade}: want ${want} trophies, found ${got}.`);
}
if (hiddenCount !== EXPECTED_HIDDEN) {
  die(`hidden trophies: want ${EXPECTED_HIDDEN}, found ${hiddenCount}.`);
}
if (missableNames.length !== 1 || missableNames[0] !== MISSABLE_NAME) {
  die(`missable trophies: want only "${MISSABLE_NAME}", found ${missableNames.join(', ') || 'none'}.`);
}
say(`${trophies.length} trophies: grades ${Object.entries(gradeCounts).map(([g, n]) => `${n} ${g}`).join(', ')}, ${hiddenCount} hidden, missable "${MISSABLE_NAME}".`);

// ------------------------------------------------------------------ offline

// The guide must work with the network off: nothing in app/ may load a
// file from anywhere but app/ itself. A plain <a href> to a source is
// fine — the reader follows it, the app never fetches it — but a
// resource load (a script, image or stylesheet source, a CSS @import or
// url(), a fetch() or an import() of a URL) is not. Each pattern is
// reported by name so a failure says exactly what it found.
const NETWORK_PATTERNS: Array<[string, RegExp]> = [
  ['script/image source', /\bsrc\s*=\s*["']https?:/i],
  ['stylesheet link', /<link[^>]*\bhref\s*=\s*["']https?:/i],
  ['CSS @import', /@import\s+["']https?:/i],
  ['CSS url()', /url\(\s*["']?https?:/i],
  ['fetch()', /fetch\(\s*["']https?:/i],
  ['import()', /import\(\s*["']https?:/i],
  ['bare import from a URL', /\bfrom\s+["']https?:/i],
  ['protocol-relative reference', /["']\/\//],
];

const indexPath = join(root, 'app', 'index.html');
if (!existsSync(indexPath)) die('app/index.html is missing.');

const appFiles: string[] = [];
(function collect(dir: string): void {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) collect(p);
    else appFiles.push(p);
  }
})(join(root, 'app'));

for (const p of appFiles) {
  if (!['.html', '.js', '.css', '.json'].includes(extname(p))) continue;
  const text = readFileSync(p, 'utf-8');
  for (const [label, pattern] of NETWORK_PATTERNS) {
    if (pattern.test(text)) {
      die(`${relative(root, p)} reaches for the network (${label}) — the guide must work offline.`);
    }
  }
}
say(`no network references in ${appFiles.length} app files.`);

// ------------------------------------------------------------------ screenshots

// Three or four real renders of the app in a browser, each a PNG or
// JPEG of at most 256 KiB. The first by name is the cover.
const shotsDir = join(root, 'screenshots');
if (!existsSync(shotsDir)) die('screenshots/ is missing.');
const shots = readdirSync(shotsDir)
  .filter((f) => ['.png', '.jpg', '.jpeg'].includes(extname(f).toLowerCase()))
  .sort();
if (shots.length < MIN_SHOTS || shots.length > MAX_SHOTS) {
  die(`screenshots/ must hold ${MIN_SHOTS} or ${MAX_SHOTS} images, found ${shots.length}.`);
}
for (const f of shots) {
  const size = statSync(join(shotsDir, f)).size;
  if (size > MAX_SHOT_BYTES) {
    die(`screenshots/${f} is ${size} bytes, over the ${MAX_SHOT_BYTES} byte cap.`);
  }
}
say(`${shots.length} screenshots (${shots.join(', ')}), each under 256 KiB.`);

// ------------------------------------------------------------------ hand in

// Copy app/ and screenshots/ to the output directory, then write the
// dossier with the kit's library. The library reads what was copied,
// so the dossier matches the entry exactly as handed in.
function copyTree(from: string, to: string): void {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const src = join(from, entry);
    const dst = join(to, entry);
    if (statSync(src).isDirectory()) copyTree(src, dst);
    else copyFileSync(src, dst);
  }
}

mkdirSync(out, { recursive: true });
copyTree(join(root, 'app'), join(out, 'app'));
copyTree(shotsDir, join(out, 'screenshots'));

const dossierPath = join(out, 'dossier.json');
writeFileSync(dossierPath, buildDossier(out, DOSSIER_CAPS));
const dossierBytes = statSync(dossierPath).size;
if (dossierBytes > DOSSIER_MAX_BYTES) {
  die(`dossier.json is ${dossierBytes} bytes, over the ${DOSSIER_MAX_BYTES} byte cap.`);
}
console.log(`main.ts: ${trophies.length} trophies with guides, ${shots.length} screenshots, no network references.`);
console.log(`main.ts: wrote ${dossierPath} (${dossierBytes} bytes).`);
