// GTA VI Trophy Guide — tracker: checklist saved in localStorage, export/import,
// filters by kind and grade, search, a spoiler setting that hides story trophies
// until they are earned, and a roadmap. The app is fully offline: it fetches only
// its own data/trophies.json, and nothing else over the network.
//
// Deep links (used for the screenshots and for sharing a view):
//   ?kind=story|missable|collectibles|activities|online  — start on a filter
//   ?grade=platinum|gold|silver|bronze                   — start on a grade
//   ?spoiler=on                                           — start with spoilers hidden
//   ?earned=2,3,28                                        — mark trophies earned (by id)
//   ?open=28                                              — open one trophy's guide
//   ?view=roadmap                                         — scroll to the roadmap

const KEY = 'gta6-trophy-checklist';
const SPOILER_KEY = 'gta6-trophy-spoiler';

const cardsEl = document.getElementById('cards');
const emptyEl = document.getElementById('empty');
const noteEl = document.getElementById('filter-note');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const spoilerEl = document.getElementById('spoiler');
const earnedOnlyEl = document.getElementById('earned-only');
const chipsEl = document.getElementById('kind-chips');

const params = new URLSearchParams(location.search);
const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

// Earned set, by trophy id. A ?earned= list in the URL sets it (and saves it,
// so a shared link shows the same checklist); otherwise it comes from storage.
let earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]'));
const urlEarned = params.get('earned');
if (urlEarned) {
  earned = new Set(urlEarned.split(',').map((s) => Number(s)).filter((n) => Number.isInteger(n)));
  save();
}

let kind = params.get('kind') || 'all';
let spoiler = params.get('spoiler') === 'on' || localStorage.getItem(SPOILER_KEY) === 'on';
spoilerEl.checked = spoiler;
if (params.get('grade')) gradeEl.value = params.get('grade');
if (params.get('search')) searchEl.value = params.get('search');

const KIND_LABELS = {
  all: 'All 55',
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  online: 'Online',
};

function save() {
  localStorage.setItem(KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function saveSpoiler() {
  localStorage.setItem(SPOILER_KEY, spoiler ? 'on' : 'off');
}

function gradeBadge(grade) {
  const span = document.createElement('span');
  span.className = 'grade grade-' + grade;
  span.textContent = grade;
  return span;
}

function sourceLinks(sources) {
  const wrap = document.createElement('p');
  wrap.className = 'sources';
  wrap.append('Sources: ');
  sources.forEach((s, i) => {
    if (i) wrap.append(', ');
    const a = document.createElement('a');
    a.href = s.url;
    a.rel = 'noopener';
    a.textContent = s.name;
    wrap.append(a);
  });
  return wrap;
}

// A story trophy is masked while the spoiler setting is on and it is unearned:
// the reader sees only which chapter it belongs to, never its name or what it asks.
function isMasked(t) {
  return spoiler && t.kind === 'story' && !earned.has(t.id);
}

function card(t) {
  const article = document.createElement('article');
  article.className = 'card grade-border-' + t.grade + (earned.has(t.id) ? ' earned' : '');
  article.id = 'trophy-' + t.id;

  const head = document.createElement('div');
  head.className = 'card-head';

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.className = 'earn-box';
  box.checked = earned.has(t.id);
  box.setAttribute('aria-label', 'Mark ' + (isMasked(t) ? 'this story trophy' : t.name) + ' as earned');
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.id);
    else earned.delete(t.id);
    save();
    render();
  });
  head.append(box);

  const title = document.createElement('div');
  title.className = 'card-title';
  const name = document.createElement('h3');
  if (isMasked(t)) {
    name.textContent = 'Hidden story trophy' + (t.chapter ? ' — Chapter ' + t.chapter : '');
    name.className = 'masked';
  } else {
    name.textContent = t.name;
  }
  title.append(name);
  const desc = document.createElement('p');
  desc.className = 'desc';
  desc.textContent = isMasked(t)
    ? 'Name and description hidden until earned — turn the spoiler setting off to see it.'
    : t.description;
  if (isMasked(t)) desc.className += ' masked';
  title.append(desc);
  head.append(title);
  head.append(gradeBadge(t.grade));
  article.append(head);

  const flags = document.createElement('p');
  flags.className = 'flags';
  if (t.missable) {
    const m = document.createElement('span');
    m.className = 'flag flag-missable';
    m.textContent = '⚠ Possibly missable — see the guide';
    flags.append(m);
  }
  if (t.hidden && !isMasked(t)) {
    const h = document.createElement('span');
    h.className = 'flag flag-hidden';
    h.textContent = 'Hidden on PSN until earned';
    flags.append(h);
  }
  if (t.kind === 'story' && t.chapter) {
    const c = document.createElement('span');
    c.className = 'flag flag-chapter';
    c.textContent = 'Chapter ' + t.chapter;
    flags.append(c);
  }
  if (flags.childNodes.length) article.append(flags);

  const guide = document.createElement('div');
  guide.className = 'guide';
  const openId = params.get('open');
  const details = document.createElement('details');
  details.open = openId ? Number(openId) === t.id : t.missable;
  const summary = document.createElement('summary');
  summary.textContent = isMasked(t) ? 'Guide (hidden with the trophy)' : 'How to get it';
  details.append(summary);
  if (!isMasked(t)) {
    const p = document.createElement('p');
    p.textContent = t.guide;
    details.append(p);
    details.append(sourceLinks(t.sources));
  } else {
    const p = document.createElement('p');
    p.textContent = 'Earn this trophy, or turn the spoiler setting off, to read its guide.';
    details.append(p);
  }
  guide.append(details);
  article.append(guide);

  return article;
}

function matches(t) {
  if (kind === 'online') return false;
  if (kind !== 'all' && t.kind !== kind) return false;
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (earnedOnlyEl.checked && !earned.has(t.id)) return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q) {
    const hay = (t.name + ' ' + t.description + ' ' + t.guide).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function render() {
  cardsEl.replaceChildren();
  let shown = 0;
  for (const t of trophies) {
    if (!matches(t)) continue;
    cardsEl.append(card(t));
    shown++;
  }
  emptyEl.hidden = shown > 0;
  const total = trophies.length;
  const n = earned.size;
  const pct = Math.round((n / total) * 100);
  document.getElementById('progress-count').textContent = n + ' of ' + total + ' earned';
  document.getElementById('progress-pct').textContent = pct + '%';
  document.getElementById('progress-fill').style.width = pct + '%';
  const byGrade = (g) => trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
  document.getElementById('progress-grades').textContent =
    byGrade('platinum') + ' platinum · ' + byGrade('gold') + ' gold · ' +
    byGrade('silver') + ' silver · ' + byGrade('bronze') + ' bronze';
  if (kind === 'online') {
    noteEl.textContent = 'No online trophies: all 55 are single-player and offline (PowerPyx, Push Square). Nothing to filter here — pick another kind.';
  } else if (shown === 0) {
    noteEl.textContent = 'Nothing matches — clear the search or pick another filter.';
  } else {
    noteEl.textContent = 'Showing ' + shown + ' of 55 trophies' +
      (spoiler ? ' · story spoilers hidden until earned' : '') + '.';
  }
  chipsEl.querySelectorAll('.chip').forEach((c) => {
    c.classList.toggle('active', c.dataset.kind === kind);
  });
}

chipsEl.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-kind]');
  if (!btn) return;
  kind = btn.dataset.kind;
  render();
});
gradeEl.addEventListener('change', render);
searchEl.addEventListener('input', render);
earnedOnlyEl.addEventListener('change', render);
spoilerEl.addEventListener('change', () => {
  spoiler = spoilerEl.checked;
  saveSpoiler();
  render();
});

document.getElementById('export').addEventListener('click', () => {
  const payload = { game: 'Grand Theft Auto VI', platform: 'PlayStation 5', earned: [...earned].sort((a, b) => a - b), exported: new Date().toISOString() };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned;
    const valid = new Set(trophies.map((t) => t.id));
    earned = new Set(ids.filter((id) => valid.has(Number(id))).map(Number));
    save();
    render();
  } catch {
    noteEl.textContent = 'That file could not be read as a progress export — check it is the JSON this guide exported.';
  }
  e.target.value = '';
});
document.getElementById('reset').addEventListener('click', () => {
  earned = new Set();
  save();
  render();
});
document.getElementById('missable-jump').addEventListener('click', () => {
  kind = 'missable';
  render();
  document.getElementById('list').scrollIntoView();
});

render();

// A ?view=roadmap link lands on the roadmap; ?open= lands on that trophy.
if (params.get('view') === 'roadmap') {
  document.getElementById('roadmap').scrollIntoView();
} else if (params.get('open')) {
  const el = document.getElementById('trophy-' + params.get('open'));
  if (el) el.scrollIntoView({ block: 'center' });
}
