#!/usr/bin/env node
// Content gate for word entries. build.mjs checks *shape*; this checks *quality*:
// real-word collisions, near-duplicate spellings and concepts, copied examples,
// part-of-speech vs example, circular definitions, and (for routine branches) that
// nothing outside words/ and translations/ changed.
//
//   node scripts/check-words.mjs --base origin/main        words added since <base> (CI, routine)
//   node scripts/check-words.mjs words/foo.md [...]         specific files
//   node scripts/check-words.mjs --all                      advisory report on every word (never fails)
//   --adds-only   also fail if the diff modifies/deletes existing words or touches other paths
//
// Dictionary: $WORDLIST, else the first of /usr/share/dict/{words,american-english,british-english}.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
const ALL = flag('--all');
const ADDS_ONLY = flag('--adds-only');

const SIM_FAIL = 0.5, SIM_WARN = 0.3;     // TF-IDF cosine over definition+example
const DEF_DUP = 0.6;                      // Jaccard over definition tokens alone
const EX_DUP = 0.5;                      // Jaccard over example tokens

// ---------- entries ----------
const parse = (file) => {
  const raw = readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing frontmatter`);
  const meta = Object.fromEntries(m[1].split('\n').map((l) => l.match(/^([a-z_]+):\s*(.*)$/)).filter(Boolean).map((k) => [k[1], k[2].trim().replace(/^(["'])(.*)\1$/, '$2')]));
  const body = m[2].trim().split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const definition = (body.find((b) => !b.startsWith('>')) || '').replace(/\s*\n\s*/g, ' ');
  const q = body.find((b) => b.startsWith('>'));
  const example = q ? q.split('\n').map((l) => l.replace(/^>\s?/, '')).join(' ').trim().replace(/^[“”"]|[“”"]$/g, '') : '';
  return { slug: basename(file, '.md'), file, ...meta, definition, example };
};
const all = readdirSync(join(ROOT, 'words')).filter((f) => f.endsWith('.md')).map((f) => parse(join(ROOT, 'words', f)));
const bySlug = new Map(all.map((w) => [w.slug, w]));

// ---------- which entries to check ----------
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
let targets, diff = [];
if (ALL) targets = all;
else if (opt('--base') !== undefined || ADDS_ONLY) {
  let base = opt('--base') || 'origin/main';
  if (/^0+$/.test(base)) base = 'origin/main';
  try { git('rev-parse', '--verify', `${base}^{commit}`); } catch { base = 'origin/main'; }
  const mb = git('merge-base', base, 'HEAD');
  diff = git('diff', '--name-status', '-M', mb, 'HEAD').split('\n').filter(Boolean).map((l) => { const [st, ...p] = l.split('\t'); return { st: st[0], path: p[p.length - 1], from: p[0] }; });
  const added = diff.filter((d) => d.st === 'A' && /^words\/.+\.md$/.test(d.path)).map((d) => basename(d.path, '.md'));
  targets = added.map((s) => bySlug.get(s)).filter(Boolean);
  console.log(`base ${base} (${mb.slice(0, 7)}): ${added.length} new word(s)${diff.length ? `, ${diff.length} changed path(s)` : ''}`);
} else {
  targets = args.filter((a) => !a.startsWith('--')).map((f) => bySlug.get(basename(f, '.md')) || parse(f));
}

const problems = [];
const fail = (w, msg) => problems.push({ level: 'FAIL', w, msg });
const warn = (w, msg) => problems.push({ level: 'WARN', w, msg });

// ---------- repository hygiene (routine branches, outside contributors) ----------
if (ADDS_ONLY) {
  for (const d of diff) {
    if (/^words\//.test(d.path)) { if (d.st !== 'A') fail(d.path, `existing word ${d.st === 'D' ? 'deleted' : 'modified'} — this branch may only add words`); }
    else if (!/^translations\/(hi|es|fr)\.json$/.test(d.path)) fail(d.path, 'only words/*.md and translations/*.json may change on this branch');
  }
}

// ---------- dictionary ----------
const dictFile = process.env.WORDLIST || ['/usr/share/dict/words', '/usr/share/dict/american-english', '/usr/share/dict/british-english'].find(existsSync);
const dict = new Set();
if (dictFile) { for (const l of readFileSync(dictFile, 'utf8').split('\n')) if (/^[a-z]+$/.test(l)) dict.add(l); }
else console.log('warning: no dictionary found — set $WORDLIST; real-word check skipped');
const inDict = (s) => dict.size && dict.has(s);
// phonetic respellings that make a "new" word a real one in disguise
const strongVariants = (w) => {
  const out = new Set();
  const subs = [[/k/g, 'c'], [/c(?=[^eiy]|$)/g, 'k'], [/^kn/, 'n'], [/ck/g, 'k'], [/ph/g, 'f'], [/f/g, 'ph'], [/^wr/, 'r'], [/^gn/, 'n']];
  for (const [re, to] of subs) { const v = w.replace(re, to); if (v !== w) out.add(v); }
  for (const v of [...out]) for (const [re, to] of subs) { const x = v.replace(re, to); if (x !== v) out.add(x); }
  return out;
};
const weakVariants = (w) => {
  const out = new Set();
  const v1 = w.replace(/([a-z])\1/g, '$1'); if (v1 !== w) out.add(v1);
  for (const [re, to] of [[/y/g, 'i'], [/i/g, 'y'], [/le$/, 'el'], [/el$/, 'le'], [/er$/, 'our'], [/ow$/, 'o']]) { const v = w.replace(re, to); if (v !== w) out.add(v); }
  return out;
};

// ---------- text similarity ----------
const STOP = new Set('a an the of to in on at for with by from as is are was were be been being it its this that these those and or but not no so if then than too very you your yours i me my we our us they them their he she his her him who whom which what when where while into onto out up down over under again just only also ever never some any all one two something someone somebody anything everything nothing about after before between through during without within because once until yet still like do does did done doing have has had having can could will would should may might must get gets got getting make makes made go goes went own same other such each every both few more most much many little less'.split(' '));
const stem = (t) => t.replace(/(ingly|edly|ing|ed|ly|es|s)$/, (m, _o, str) => (str.length - m.length >= 3 ? '' : m));
const tokens = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter((t) => t.length > 2 && !STOP.has(t)).map(stem).filter((t) => t.length > 2);
const docs = new Map(all.map((w) => [w.slug, tokens(`${w.definition} ${w.example}`)]));
for (const t of targets) if (!docs.has(t.slug)) docs.set(t.slug, tokens(`${t.definition} ${t.example}`));
const df = new Map();
for (const toks of docs.values()) for (const t of new Set(toks)) df.set(t, (df.get(t) || 0) + 1);
const N = docs.size;
const vec = (toks) => { const m = new Map(); for (const t of toks) m.set(t, (m.get(t) || 0) + 1); let n = 0; for (const [t, c] of m) { const v = c * Math.log(N / (df.get(t) || 1)); m.set(t, v); n += v * v; } n = Math.sqrt(n) || 1; for (const [t, v] of m) m.set(t, v / n); return m; };
const vecs = new Map([...docs].map(([s, toks]) => [s, vec(toks)]));
const cos = (a, b) => { let s = 0; for (const [t, v] of a) if (b.has(t)) s += v * b.get(t); return s; };
const jaccard = (a, b) => { const A = new Set(a), B = new Set(b); let i = 0; for (const x of A) if (B.has(x)) i++; return i / (new Set([...A, ...B]).size || 1); };
const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };

// ---------- per-word checks ----------
for (const w of targets) {
  const word = w.word.toLowerCase();
  const others = all.filter((o) => o.slug !== w.slug);

  // real-word collisions
  if (inDict(word)) fail(w.slug, `"${w.word}" is already an English word (in ${basename(dictFile)})`);
  else {
    const strong = [...strongVariants(word)].filter(inDict);
    if (strong.length) fail(w.slug, `respelling of real word(s): ${strong.join(', ')}`);
    const weak = [...weakVariants(word)].filter(inDict);
    if (weak.length) warn(w.slug, `close to real word(s): ${weak.join(', ')}`);
  }

  // near-duplicate spellings
  const near = others.filter((o) => lev(word, o.word.toLowerCase()) <= 1).map((o) => o.word);
  if (near.length) fail(w.slug, `spelling within one letter of existing: ${near.join(', ')}`);

  // concept overlap
  let best = null;
  for (const o of others) { const s = cos(vecs.get(w.slug), vecs.get(o.slug)); if (!best || s > best.s) best = { o, s }; }
  if (best && best.s >= SIM_FAIL) fail(w.slug, `definition overlaps "${best.o.word}" (${best.s.toFixed(2)}): ${best.o.definition}`);
  else if (best && best.s >= SIM_WARN) warn(w.slug, `similar concept to "${best.o.word}" (${best.s.toFixed(2)})`);

  // same definition in different words
  const dt = tokens(w.definition);
  for (const o of others) { const j = jaccard(dt, tokens(o.definition)); if (j >= DEF_DUP) { fail(w.slug, `definition is a near-copy of "${o.word}"'s (${j.toFixed(2)})`); break; } }

  // copied example
  if (w.example) {
    const et = tokens(w.example);
    for (const o of others) if (o.example && jaccard(et, tokens(o.example)) >= EX_DUP) { fail(w.slug, `example is a near-copy of "${o.word}"'s example`); break; }
  }

  // part of speech vs usage
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const ex = w.example.toLowerCase();
  if (!w.example) fail(w.slug, 'no example sentence');
  else if (!new RegExp(`\\b${esc}(s|es|ed|d|ing|er|ers|y)?\\b`).test(ex)) fail(w.slug, 'example does not use the word');
  else {
    if (w.pos === 'noun' && new RegExp(`\\b${esc}(ed|d|ing)\\b`).test(ex)) fail(w.slug, `tagged noun but example uses it as a verb`);
    if (w.pos === 'noun' && new RegExp(`\\b(i|you|we|they|he|she|it|who)\\s+(?:\\w+\\s+)?${esc}(s|es)?\\b`).test(ex)) warn(w.slug, `tagged noun but example may use it as a verb`);
    if (w.pos === 'verb' && new RegExp(`\\b(a|an|the|of|my|his|her|their|our|your|some|that)\\s+${esc}\\b`).test(ex)) warn(w.slug, `tagged verb but example may use it as a noun`);
    if (w.pos === 'adjective' && new RegExp(`\\b(a|an|the|of|my|his|her|their)\\s+${esc}\\b`).test(ex)) warn(w.slug, `tagged adjective but example may use it as a noun`);
    const uses = ex.match(new RegExp(`\\b${esc}\\w*\\b`, 'g')) || [];
    if (uses.length > 1) warn(w.slug, 'example uses the word more than once');
  }
  if (new RegExp(`\\b${esc}\\w*\\b`).test(w.definition.toLowerCase())) fail(w.slug, 'definition uses the word itself (circular)');
  if (!w.pronunciation) warn(w.slug, 'no pronunciation');
}

// ---------- report ----------
for (const p of problems) console.log(`${p.level} ${p.w}: ${p.msg}`);
const fails = problems.filter((p) => p.level === 'FAIL').length;
const warns = problems.length - fails;
console.log(`checked ${targets.length} word(s): ${fails} fail, ${warns} warn${dictFile ? ` (dictionary: ${dictFile})` : ''}`);
if (fails && !ALL) process.exit(1);
