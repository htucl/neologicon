// Neologicon static site builder — zero dependencies.
// Reads words/*.md (+ translations/<locale>.json), writes a complete multilingual site to dist/.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = {
  title: 'Neologicon',
  url: process.env.SITE_URL || 'https://neologicon.com',
  repo: process.env.REPO_URL || 'https://github.com/htucl/neologicon',
};

const CATEGORIES = ['tactile', 'sounds', 'social', 'bodily', 'perception', 'movement', 'environment', 'smell-taste', 'modern-life'];

// ---------- locales ----------

const LOCALES = {
  en: {
    htmlLang: 'en', prefix: '', label: 'EN',
    cat: { tactile: ['Tactile', 'Physical sensations & touch'], sounds: ['Sounds', 'Onomatopoeia & noises'], social: ['Social', 'Emotional & social moments'], bodily: ['Bodily', 'Bodily states & sensations'], perception: ['Perception', 'Visual & perceptual'], movement: ['Movement', 'Physical action'], environment: ['Environment', 'Sensory phenomena in the world'], 'smell-taste': ['Smell & taste', 'Scents, flavours & the nose'], 'modern-life': ['Modern life', 'Phones, screens & the things we own'] },
    s: {
      tagline: 'Words that should have existed.',
      metaHome: 'A community dictionary of {n} neologisms — invented words for feelings, sounds, and moments English forgot to name.',
      heroTitle: 'Words that <em>should</em> have existed.',
      heroSub: 'A dictionary of neologisms — new words for the feelings, sounds, and tiny moments English never got around to naming. Community-edited, one pull request at a time.',
      searchPh: 'Search {n} words…', navBrowse: 'browse', navRandom: 'random', navAbout: 'about',
      wotd: 'word of the day', browseCat: 'browse by category', recent: 'recently added', coin: 'coin a word',
      coinText: 'Invented a word the language needs? Neologicon is a public GitHub repository — every word is a markdown file, and every new word is a pull request.',
      coinButton: 'Submit a word', seeAll: 'See all {n} words →', allTitle: 'All {n} words', allMeta: 'Every word in the Neologicon, A to Z.',
      nWords: '{n} words', coinedBy: 'coined by', added: 'added', category: 'category',
      suggestEdit: 'Suggest an edit on GitHub ↗', catCrumb: 'category',
      e404Title: 'Not a word. <em>Yet.</em>', e404Sub: "This page doesn't exist — but maybe the word should.", e404Coin: 'Coin it?', e404Back: '← Back to the dictionary',
      randomTitle: 'Rolling the dice…', randomNoscript: 'JavaScript is off — try the full list instead.',
      footerCount: '{n} words and counting', footerAdd: 'add yours on GitHub',
      noMatch: 'No match', coinIt: 'coin it?', aboutTitle: 'About',
    },
  },
  hi: {
    htmlLang: 'hi', prefix: '/hi', label: 'हिंदी',
    cat: { tactile: ['स्पर्श', 'शारीरिक एहसास और छुअन'], sounds: ['ध्वनियाँ', 'आवाज़ें और ध्वनि-अनुकरण'], social: ['सामाजिक', 'भावनात्मक और सामाजिक पल'], bodily: ['शारीरिक', 'शरीर की अवस्थाएँ'], perception: ['बोध', 'दृश्य और अनुभूति'], movement: ['गति', 'शारीरिक क्रिया'], environment: ['परिवेश', 'आसपास की संवेदी घटनाएँ'], 'smell-taste': ['गंध और स्वाद', 'ख़ुशबू, स्वाद और नाक'], 'modern-life': ['आधुनिक जीवन', 'फ़ोन, स्क्रीन और हमारी चीज़ें'] },
    s: {
      tagline: 'शब्द जो होने चाहिए थे।',
      metaHome: '{n} नवशब्दों का सामुदायिक शब्दकोश — उन एहसासों, आवाज़ों और पलों के लिए गढ़े गए शब्द जिन्हें अंग्रेज़ी नाम देना भूल गई।',
      heroTitle: 'ऐसे शब्द जो <em>होने ही</em> चाहिए थे।',
      heroSub: 'नवशब्दों का शब्दकोश — उन एहसासों, आवाज़ों और छोटे पलों के लिए नए शब्द जिन्हें अंग्रेज़ी कभी नाम नहीं दे पाई। समुदाय-संपादित, एक pull request प्रति शब्द।',
      searchPh: '{n} शब्द खोजें…', navBrowse: 'ब्राउज़', navRandom: 'रैंडम', navAbout: 'परिचय',
      wotd: 'आज का शब्द', browseCat: 'श्रेणी अनुसार देखें', recent: 'हाल में जोड़े गए', coin: 'शब्द गढ़ें',
      coinText: 'कोई ऐसा शब्द गढ़ा है जिसकी भाषा को ज़रूरत है? Neologicon एक सार्वजनिक GitHub repository है — हर शब्द एक markdown फ़ाइल है, और हर नया शब्द एक pull request।',
      coinButton: 'शब्द भेजें', seeAll: 'सभी {n} शब्द देखें →', allTitle: 'सभी {n} शब्द', allMeta: 'Neologicon का हर शब्द, A से Z तक।',
      nWords: '{n} शब्द', coinedBy: 'गढ़ा', added: 'जोड़ा गया', category: 'श्रेणी',
      suggestEdit: 'GitHub पर संपादन सुझाएँ ↗', catCrumb: 'श्रेणी',
      e404Title: 'यह शब्द नहीं है। <em>अभी तक।</em>', e404Sub: 'यह पृष्ठ मौजूद नहीं है — पर शायद यह शब्द होना चाहिए।', e404Coin: 'गढ़ें?', e404Back: '← शब्दकोश पर लौटें',
      randomTitle: 'पासा फेंक रहे हैं…', randomNoscript: 'JavaScript बंद है — पूरी सूची आज़माएँ।',
      footerCount: '{n} शब्द और बढ़ते हुए', footerAdd: 'GitHub पर अपना शब्द जोड़ें',
      noMatch: 'कोई मेल नहीं', coinIt: 'गढ़ें?', aboutTitle: 'परिचय',
    },
  },
  es: {
    htmlLang: 'es', prefix: '/es', label: 'ES',
    cat: { tactile: ['Táctil', 'Sensaciones físicas y tacto'], sounds: ['Sonidos', 'Onomatopeyas y ruidos'], social: ['Social', 'Momentos emocionales y sociales'], bodily: ['Corporal', 'Estados del cuerpo'], perception: ['Percepción', 'Visual y perceptivo'], movement: ['Movimiento', 'Acción física'], environment: ['Entorno', 'Fenómenos sensoriales del mundo'], 'smell-taste': ['Olfato y gusto', 'Olores, sabores y la nariz'], 'modern-life': ['Vida moderna', 'Teléfonos, pantallas y nuestras cosas'] },
    s: {
      tagline: 'Palabras que deberían haber existido.',
      metaHome: 'Un diccionario comunitario de {n} neologismos: palabras inventadas para sensaciones, sonidos y momentos que el inglés olvidó nombrar.',
      heroTitle: 'Palabras que <em>deberían</em> haber existido.',
      heroSub: 'Un diccionario de neologismos: palabras nuevas para las sensaciones, los sonidos y los pequeños momentos que el inglés nunca llegó a nombrar. Editado por la comunidad, un pull request a la vez.',
      searchPh: 'Buscar entre {n} palabras…', navBrowse: 'explorar', navRandom: 'azar', navAbout: 'acerca de',
      wotd: 'palabra del día', browseCat: 'explorar por categoría', recent: 'añadidas recientemente', coin: 'acuña una palabra',
      coinText: '¿Has inventado una palabra que el idioma necesita? Neologicon es un repositorio público de GitHub: cada palabra es un archivo markdown y cada palabra nueva es un pull request.',
      coinButton: 'Enviar una palabra', seeAll: 'Ver las {n} palabras →', allTitle: 'Las {n} palabras', allMeta: 'Todas las palabras del Neologicon, de la A a la Z.',
      nWords: '{n} palabras', coinedBy: 'acuñada por', added: 'añadida', category: 'categoría',
      suggestEdit: 'Sugerir una edición en GitHub ↗', catCrumb: 'categoría',
      e404Title: 'No es una palabra. <em>Todavía.</em>', e404Sub: 'Esta página no existe, pero quizá la palabra debería.', e404Coin: '¿La acuñas?', e404Back: '← Volver al diccionario',
      randomTitle: 'Lanzando los dados…', randomNoscript: 'JavaScript está desactivado: prueba la lista completa.',
      footerCount: '{n} palabras y contando', footerAdd: 'añade la tuya en GitHub',
      noMatch: 'Sin resultados', coinIt: '¿la acuñas?', aboutTitle: 'Acerca de',
    },
  },
  fr: {
    htmlLang: 'fr', prefix: '/fr', label: 'FR',
    cat: { tactile: ['Tactile', 'Sensations physiques et toucher'], sounds: ['Sons', 'Onomatopées et bruits'], social: ['Social', 'Moments émotionnels et sociaux'], bodily: ['Corporel', 'États du corps'], perception: ['Perception', 'Visuel et perceptif'], movement: ['Mouvement', 'Action physique'], environment: ['Environnement', 'Phénomènes sensoriels du monde'], 'smell-taste': ['Odorat et goût', 'Odeurs, saveurs et le nez'], 'modern-life': ['Vie moderne', 'Téléphones, écrans et nos objets'] },
    s: {
      tagline: 'Des mots qui auraient dû exister.',
      metaHome: 'Un dictionnaire communautaire de {n} néologismes : des mots inventés pour les sensations, les sons et les instants que l’anglais a oublié de nommer.',
      heroTitle: 'Des mots qui <em>auraient dû</em> exister.',
      heroSub: 'Un dictionnaire de néologismes : des mots nouveaux pour les sensations, les sons et les petits instants que l’anglais n’a jamais pris le temps de nommer. Édité par la communauté, une pull request à la fois.',
      searchPh: 'Rechercher parmi {n} mots…', navBrowse: 'parcourir', navRandom: 'hasard', navAbout: 'à propos',
      wotd: 'mot du jour', browseCat: 'parcourir par catégorie', recent: 'ajoutés récemment', coin: 'forgez un mot',
      coinText: 'Vous avez inventé un mot dont la langue a besoin ? Neologicon est un dépôt GitHub public : chaque mot est un fichier markdown, et chaque nouveau mot est une pull request.',
      coinButton: 'Proposer un mot', seeAll: 'Voir les {n} mots →', allTitle: 'Les {n} mots', allMeta: 'Tous les mots du Neologicon, de A à Z.',
      nWords: '{n} mots', coinedBy: 'forgé par', added: 'ajouté', category: 'catégorie',
      suggestEdit: 'Proposer une modification sur GitHub ↗', catCrumb: 'catégorie',
      e404Title: 'Pas un mot. <em>Pas encore.</em>', e404Sub: 'Cette page n’existe pas — mais le mot, lui, le devrait peut-être.', e404Coin: 'On le forge ?', e404Back: '← Retour au dictionnaire',
      randomTitle: 'On lance les dés…', randomNoscript: 'JavaScript est désactivé : essayez la liste complète.',
      footerCount: '{n} mots et ça continue', footerAdd: 'ajoutez le vôtre sur GitHub',
      noMatch: 'Aucun résultat', coinIt: 'on le forge ?', aboutTitle: 'À propos',
    },
  },
};

const fmt = (s, n) => s.replace('{n}', n);

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(ROOT, 'dist');

// ---------- parse ----------

const POS = ['noun', 'verb', 'adjective', 'adverb', 'interjection'];
const META_KEYS = ['word', 'pos', 'category', 'author', 'added', 'pronunciation'];
const LIMITS = { word: 40, author: 80, pronunciation: 80, definition: 400, example: 300, translation: 600 };
// C0 controls (except \n handled earlier) and Unicode bidi overrides/isolates
const BAD_CHARS = /[\u0000-\u0008\u000b-\u001f\u007f‪-‮⁦-⁩]/;
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

function checkText(filename, field, value, max) {
  if (BAD_CHARS.test(value)) throw new Error(`${filename}: "${field}" contains control or bidi characters`);
  if (value.length > max) throw new Error(`${filename}: "${field}" is ${value.length} chars (max ${max})`);
}

function parseEntry(filename) {
  const raw = readFileSync(join(ROOT, 'words', filename), 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${filename}: missing frontmatter`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    if (!line.trim()) continue;
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) throw new Error(`${filename}: malformed frontmatter line "${line}"`);
    if (!META_KEYS.includes(kv[1])) throw new Error(`${filename}: unknown field "${kv[1]}" (allowed: ${META_KEYS.join(', ')})`);
    meta[kv[1]] = kv[2].trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  const slug = filename.replace(/\.md$/, '');
  for (const k of ['word', 'pos', 'category', 'author', 'added']) {
    if (!meta[k]) throw new Error(`${filename}: missing "${k}" field`);
  }
  if (!/^[A-Za-z][A-Za-z' -]*$/.test(meta.word)) throw new Error(`${filename}: word may only contain letters, spaces, hyphens and apostrophes`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) throw new Error(`${filename}: filename must be lowercase letters/digits with single hyphens`);
  if (meta.word.toLowerCase().replace(/[^a-z0-9]+/g, '-') !== slug) {
    throw new Error(`${filename}: filename must match word ("${meta.word}")`);
  }
  if (!POS.includes(meta.pos)) throw new Error(`${filename}: pos must be one of ${POS.join('|')} (got "${meta.pos}")`);
  if (!CATEGORIES.includes(meta.category)) throw new Error(`${filename}: category must be one of ${CATEGORIES.join('|')} (got "${meta.category}")`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.added) || Number.isNaN(Date.parse(meta.added))) throw new Error(`${filename}: added must be a date YYYY-MM-DD`);
  if (meta.added > tomorrow) throw new Error(`${filename}: added (${meta.added}) is in the future`);
  const body = m[2].trim().split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const paras = body.filter((b) => !b.startsWith('>'));
  const quotes = body.filter((b) => b.startsWith('>'));
  if (paras.length !== 1) throw new Error(`${filename}: body must be exactly one definition paragraph (found ${paras.length})`);
  if (quotes.length > 1) throw new Error(`${filename}: at most one example blockquote`);
  const definition = paras[0].replace(/\s*\n\s*/g, ' ');
  const example = quotes.length
    ? quotes[0].split('\n').map((l) => l.replace(/^>\s?/, '')).join(' ').trim().replace(/^[“”"]|[“”"]$/g, '')
    : '';
  const entry = {
    slug,
    word: meta.word,
    pos: meta.pos,
    category: meta.category,
    author: meta.author,
    added: meta.added,
    pronunciation: meta.pronunciation || '',
    definition,
    example,
  };
  for (const k of ['word', 'author', 'pronunciation', 'definition', 'example']) checkText(filename, k, entry[k], LIMITS[k]);
  return entry;
}

const words = readdirSync(join(ROOT, 'words'))
  .filter((f) => f.endsWith('.md'))
  .map(parseEntry)
  .sort((a, b) => a.word.localeCompare(b.word, 'en'));

if (words.length === 0) throw new Error('No word entries found in words/');

// translations: { locale: { slug: definition } }
const slugs = new Set(words.map((w) => w.slug));
const TR = {};
for (const loc of Object.keys(LOCALES)) {
  if (loc === 'en') continue;
  const file = join(ROOT, 'translations', `${loc}.json`);
  if (!existsSync(file)) { TR[loc] = {}; continue; }
  let map;
  try { map = JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { throw new Error(`translations/${loc}.json: invalid JSON — ${e.message}`); }
  if (!map || typeof map !== 'object' || Array.isArray(map)) throw new Error(`translations/${loc}.json: must be an object of slug → definition`);
  for (const [slug, text] of Object.entries(map)) {
    if (!slugs.has(slug)) throw new Error(`translations/${loc}.json: key "${slug}" has no matching words/${slug}.md`);
    if (typeof text !== 'string' || !text.trim()) throw new Error(`translations/${loc}.json: "${slug}" must be a non-empty string`);
    checkText(`translations/${loc}.json`, slug, text, LIMITS.translation);
  }
  TR[loc] = map;
}
const defIn = (w, loc) => (loc === 'en' ? w.definition : TR[loc]?.[w.slug] || w.definition);

const byCategory = {};
for (const w of words) (byCategory[w.category] ??= []).push(w);

const catInfo = (slug, L) =>
  L.cat[slug] || [slug.charAt(0).toUpperCase() + slug.slice(1), ''];

// ---------- html helpers ----------

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// path WITHOUT locale prefix; returns full page html
function layout(L, { title, description, path, content, bodyClass = '', noindex = false, extraHead = '' }) {
  const s = L.s;
  const here = `${L.prefix}${path}`;
  const fullTitle = path === '/' ? `${SITE.title} — ${s.tagline}` : `${title} — ${SITE.title}`;
  const alternates = Object.values(LOCALES)
    .map((o) => `<link rel="alternate" hreflang="${o.htmlLang}" href="${SITE.url}${o.prefix}${path}">`)
    .join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${SITE.url}${path}">`;
  const switcher = Object.values(LOCALES)
    .map((o) => `<a href="${o.prefix}${path}"${o.htmlLang === L.htmlLang ? ' class="active"' : ''} lang="${o.htmlLang}">${o.label}</a>`)
    .join('');
  return `<!DOCTYPE html>
<html lang="${L.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${SITE.url}${here}">`}
${noindex ? '' : alternates}
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE.url}${here}">
<meta name="theme-color" content="#f7f2e7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#171310" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=IBM+Plex+Mono:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
${extraHead}
</head>
<body class="${bodyClass}" data-prefix="${L.prefix}" data-nomatch="${esc(s.noMatch)}" data-coinit="${esc(s.coinIt)}" data-coinhref="${SITE.repo}/new/main/words">
<header class="topbar">
  <a class="wordmark" href="${L.prefix}/">neologicon<span class="dot">.</span></a>
  <nav class="nav">
    <a href="${L.prefix}/all/">${s.navBrowse}</a>
    <a href="${L.prefix}/random/">${s.navRandom}</a>
    <a href="${L.prefix}/about/">${s.navAbout}</a>
    <a href="${SITE.repo}" rel="noopener">github</a>
  </nav>
  <nav class="lang-switch" aria-label="Language">${switcher}</nav>
</header>
<main>
${content}
</main>
<footer class="footer">
  <p class="footer-tagline">${s.tagline}</p>
  <p>${fmt(s.footerCount, words.length)} · <a href="${SITE.repo}" rel="noopener">${s.footerAdd}</a></p>
</footer>
<script src="/app.js" defer></script>
</body>
</html>`;
}

const posAbbrev = { noun: 'n.', verb: 'v.', adjective: 'adj.', adverb: 'adv.', interjection: 'interj.' };

function wordCard(w, L, { big = false } = {}) {
  return `<article class="card${big ? ' card-big' : ''}">
  <h3 class="card-word"><a href="${L.prefix}/word/${w.slug}/">${esc(w.word)}</a> <span class="pos">${esc(posAbbrev[w.pos])}</span></h3>
  <p class="card-def">${esc(defIn(w, L.htmlLang))}</p>
  ${w.example ? `<blockquote class="card-ex" lang="en">"${esc(w.example)}"</blockquote>` : ''}
</article>`;
}

// ---------- build ----------

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

function page(fullPath, html) {
  const dir = join(DIST, fullPath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}

const wotdIndex = Math.floor(Date.now() / 86400000) % words.length;
const recent = [...words]
  .sort((a, b) => b.added.localeCompare(a.added, 'en') || a.word.localeCompare(b.word, 'en'))
  .slice(0, 6);

for (const L of Object.values(LOCALES)) {
  const loc = L.htmlLang;
  const s = L.s;

  // --- home ---
  page(`${L.prefix}/`, layout(L, {
    title: SITE.title,
    description: fmt(s.metaHome, words.length),
    path: '/',
    content: `
<section class="hero">
  <h1 class="hero-title">${s.heroTitle}</h1>
  <p class="hero-sub">${s.heroSub}</p>
  <div class="search-wrap">
    <input id="search" class="search" type="search" placeholder="${esc(fmt(s.searchPh, words.length))}" autocomplete="off" aria-label="${esc(fmt(s.searchPh, words.length))}">
    <div id="search-results" class="search-results" hidden></div>
  </div>
</section>

<section class="section">
  <h2 class="section-label">${s.wotd}</h2>
  <div id="wotd">${wordCard(words[wotdIndex], L, { big: true })}</div>
</section>

<section class="section">
  <h2 class="section-label">${s.browseCat}</h2>
  <div class="cat-grid">
    ${Object.keys(byCategory).sort().map((slug) => {
      const [name] = catInfo(slug, L);
      return `<a class="cat-tile" href="${L.prefix}/category/${slug}/"><strong>${esc(name)}</strong><span>${fmt(s.nWords, byCategory[slug].length)}</span></a>`;
    }).join('\n    ')}
  </div>
</section>

<section class="section">
  <h2 class="section-label">${s.recent}</h2>
  <div class="card-grid">
    ${recent.map((w) => wordCard(w, L)).join('\n')}
  </div>
  <p class="more-link"><a href="${L.prefix}/all/">${fmt(s.seeAll, words.length)}</a></p>
</section>

<section class="section contribute">
  <h2 class="section-label">${s.coin}</h2>
  <p>${s.coinText}</p>
  <p><a class="button" href="${SITE.repo}/new/main/words" rel="noopener">${s.coinButton}</a></p>
</section>`,
  }));

  // --- all words (A–Z) ---
  const byLetter = {};
  for (const w of words) (byLetter[w.word[0].toUpperCase()] ??= []).push(w);

  page(`${L.prefix}/all/`, layout(L, {
    title: fmt(s.allTitle, words.length),
    description: s.allMeta,
    path: '/all/',
    content: `
<section class="section">
  <h1 class="page-title">${fmt(s.allTitle, words.length)}</h1>
  <nav class="letter-nav">${Object.keys(byLetter).sort().map((l) => `<a href="#${l}">${l}</a>`).join(' ')}</nav>
  ${Object.keys(byLetter).sort().map((l) => `
  <h2 class="letter" id="${l}">${l}</h2>
  <ul class="word-list">
    ${byLetter[l].map((w) => `<li><a href="${L.prefix}/word/${w.slug}/">${esc(w.word)}</a> <span class="pos">${esc(posAbbrev[w.pos])}</span> — ${esc(defIn(w, loc))}</li>`).join('\n    ')}
  </ul>`).join('\n')}
</section>`,
  }));

  // --- category pages ---
  for (const [slug, list] of Object.entries(byCategory)) {
    const [name, desc] = catInfo(slug, L);
    page(`${L.prefix}/category/${slug}/`, layout(L, {
      title: name,
      description: `${desc || name} — ${fmt(s.nWords, list.length)}.`,
      path: `/category/${slug}/`,
      content: `
<section class="section">
  <p class="crumb"><a href="${L.prefix}/">neologicon</a> / ${s.catCrumb}</p>
  <h1 class="page-title">${esc(name)}</h1>
  ${desc ? `<p class="page-sub">${esc(desc)}</p>` : ''}
  <div class="card-grid">
    ${list.map((w) => wordCard(w, L)).join('\n')}
  </div>
</section>`,
    }));
  }

  // --- word pages ---
  words.forEach((w, i) => {
    const prev = words[(i - 1 + words.length) % words.length];
    const next = words[(i + 1) % words.length];
    const [catName] = catInfo(w.category, L);
    const def = defIn(w, loc);
    const hasTranslation = loc !== 'en' && TR[loc]?.[w.slug];
    const jsonld = loc === 'en'
      ? `\n<script type="application/ld+json">${JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'DefinedTerm',
          name: w.word,
          description: w.definition,
          url: `${SITE.url}/word/${w.slug}/`,
          inDefinedTermSet: { '@type': 'DefinedTermSet', name: SITE.title, url: SITE.url },
        }).replace(/</g, '\\u003c')}</script>`
      : '';
    page(`${L.prefix}/word/${w.slug}/`, layout(L, {
      title: w.word,
      description: `${w.word} (${w.pos}): ${def}`,
      path: `/word/${w.slug}/`,
      bodyClass: 'entry-page',
      content: `
<article class="entry">
  <p class="crumb"><a href="${L.prefix}/">neologicon</a> / <a href="${L.prefix}/category/${w.category}/">${esc(catName.toLowerCase())}</a></p>
  <h1 class="entry-word" lang="en">${esc(w.word)}</h1>
  <p class="entry-meta"><span class="pos">${esc(posAbbrev[w.pos])}</span>${w.pronunciation ? ` · <span class="pron">/${esc(w.pronunciation)}/</span>` : ''}</p>
  <p class="entry-def">${esc(def)}</p>
  ${hasTranslation ? `<p class="entry-def-original" lang="en">${esc(w.definition)}</p>` : ''}
  ${w.example ? `<blockquote class="entry-ex" lang="en">"${esc(w.example)}"</blockquote>` : ''}
  <dl class="entry-facts">
    <div><dt>${s.coinedBy}</dt><dd>${esc(w.author)}</dd></div>
    ${w.added ? `<div><dt>${s.added}</dt><dd>${esc(w.added)}</dd></div>` : ''}
    <div><dt>${s.category}</dt><dd><a href="${L.prefix}/category/${w.category}/">${esc(catName)}</a></dd></div>
  </dl>
  <p class="entry-edit"><a href="${SITE.repo}/edit/main/words/${w.slug}.md" rel="noopener">${s.suggestEdit}</a></p>
  <nav class="pager">
    <a href="${L.prefix}/word/${prev.slug}/">← ${esc(prev.word)}</a>
    <a href="${L.prefix}/word/${next.slug}/">${esc(next.word)} →</a>
  </nav>
</article>${jsonld}`,
    }));
  });

  // --- random ---
  page(`${L.prefix}/random/`, layout(L, {
    title: s.randomTitle,
    description: s.randomTitle,
    path: '/random/',
    bodyClass: 'random-page',
    noindex: true,
    content: `
<section class="section">
  <h1 class="page-title">${s.randomTitle}</h1>
  <noscript><p>${s.randomNoscript} <a href="${L.prefix}/all/">→</a></p></noscript>
</section>`,
  }));

  // --- about ---
  const aboutBody = loc === 'en' ? `
  <p><strong>Neologicon</strong> is a dictionary of neologisms: invented words for the feelings, sounds, and tiny moments English forgot to name. The criterion for inclusion is simple — a word should feel obvious in retrospect, as though it fills a gap that genuinely existed.</p>
  <h2>How it works</h2>
  <p>The whole dictionary lives in a <a href="${SITE.repo}" rel="noopener">public GitHub repository</a>. Every word is a small markdown file. The site rebuilds and redeploys automatically whenever the repository changes.</p>
  <h2>Add a word</h2>
  <ol>
    <li><a href="${SITE.repo}/new/main/words" rel="noopener">Create a new file</a> in the <code>words/</code> folder named <code>yourword.md</code>.</li>
    <li>Use this template:</li>
  </ol>
  <pre><code>---
word: yourword
pos: noun
category: social
author: Your Name
added: ${new Date().toISOString().slice(0, 10)}
---

A one-sentence definition of the word.

&gt; "An example sentence using the word."</code></pre>
  <ol start="3">
    <li>Open a pull request. Once it's merged, the word is live.</li>
  </ol>
  <p>Ground rules: the word must not already exist in English, the definition should name something real but unnamed, and keep it kind. See <a href="${SITE.repo}/blob/main/CONTRIBUTING.md" rel="noopener">CONTRIBUTING.md</a> for details.</p>` : {
    hi: `
  <p><strong>Neologicon</strong> नवशब्दों का शब्दकोश है: उन एहसासों, आवाज़ों और छोटे पलों के लिए गढ़े गए शब्द जिन्हें अंग्रेज़ी नाम देना भूल गई। शामिल होने की कसौटी सरल है — शब्द ऐसा लगे मानो वह हमेशा से होना चाहिए था।</p>
  <h2>यह कैसे काम करता है</h2>
  <p>पूरा शब्दकोश एक <a href="${SITE.repo}" rel="noopener">सार्वजनिक GitHub repository</a> में रहता है। हर शब्द एक छोटी markdown फ़ाइल है। Repository बदलते ही साइट अपने-आप दोबारा बनकर प्रकाशित हो जाती है।</p>
  <h2>शब्द जोड़ें</h2>
  <p><code>words/</code> फ़ोल्डर में <a href="${SITE.repo}/new/main/words" rel="noopener">नई फ़ाइल बनाएँ</a> (अंग्रेज़ी टेम्पलेट <a href="${SITE.repo}/blob/main/CONTRIBUTING.md" rel="noopener">CONTRIBUTING.md</a> में है) और pull request खोलें। Merge होते ही शब्द लाइव हो जाता है। परिभाषाओं के अनुवाद <code>translations/</code> में रहते हैं।</p>
  <p>बुनियादी नियम: शब्द अंग्रेज़ी में पहले से न हो, परिभाषा किसी असली पर बेनाम अनुभव को नाम दे, और भाव सदाशय रहे।</p>`,
    es: `
  <p><strong>Neologicon</strong> es un diccionario de neologismos: palabras inventadas para las sensaciones, los sonidos y los pequeños momentos que el inglés olvidó nombrar. El criterio de inclusión es simple: la palabra debe parecer obvia en retrospectiva, como si llenara un hueco que realmente existía.</p>
  <h2>Cómo funciona</h2>
  <p>Todo el diccionario vive en un <a href="${SITE.repo}" rel="noopener">repositorio público de GitHub</a>. Cada palabra es un pequeño archivo markdown. El sitio se reconstruye y despliega automáticamente con cada cambio.</p>
  <h2>Añade una palabra</h2>
  <p><a href="${SITE.repo}/new/main/words" rel="noopener">Crea un archivo nuevo</a> en la carpeta <code>words/</code> (la plantilla en inglés está en <a href="${SITE.repo}/blob/main/CONTRIBUTING.md" rel="noopener">CONTRIBUTING.md</a>) y abre un pull request. Al fusionarse, la palabra queda publicada. Las traducciones de las definiciones viven en <code>translations/</code>.</p>
  <p>Reglas básicas: la palabra no debe existir ya en inglés, la definición debe nombrar algo real pero sin nombre, y siempre con amabilidad.</p>`,
    fr: `
  <p><strong>Neologicon</strong> est un dictionnaire de néologismes : des mots inventés pour les sensations, les sons et les petits instants que l’anglais a oublié de nommer. Le critère d’admission est simple : le mot doit sembler évident a posteriori, comme s’il comblait un vide qui existait vraiment.</p>
  <h2>Comment ça marche</h2>
  <p>Tout le dictionnaire vit dans un <a href="${SITE.repo}" rel="noopener">dépôt GitHub public</a>. Chaque mot est un petit fichier markdown. Le site se reconstruit et se redéploie automatiquement à chaque changement.</p>
  <h2>Ajouter un mot</h2>
  <p><a href="${SITE.repo}/new/main/words" rel="noopener">Créez un nouveau fichier</a> dans le dossier <code>words/</code> (le gabarit en anglais se trouve dans <a href="${SITE.repo}/blob/main/CONTRIBUTING.md" rel="noopener">CONTRIBUTING.md</a>) puis ouvrez une pull request. Une fois fusionné, le mot est en ligne. Les traductions des définitions vivent dans <code>translations/</code>.</p>
  <p>Règles de base : le mot ne doit pas déjà exister en anglais, la définition doit nommer quelque chose de réel mais d’innommé, et l’esprit reste bienveillant.</p>`,
  }[loc];

  page(`${L.prefix}/about/`, layout(L, {
    title: s.aboutTitle,
    description: s.tagline,
    path: '/about/',
    content: `
<section class="section prose">
  <h1 class="page-title">${s.aboutTitle}</h1>${aboutBody}
</section>`,
  }));

  // --- per-locale search data ---
  const data = JSON.stringify(
    words.map((w) => ({ slug: w.slug, word: w.word, pos: w.pos, category: w.category, definition: defIn(w, loc), example: w.example })),
  );
  if (loc === 'en') writeFileSync(join(DIST, 'words.json'), data);
  else writeFileSync(join(DIST, loc, 'words.json'), data);
}

// --- 404 (root, English — Cloudflare Pages serves the root 404.html) ---
const sEn = LOCALES.en.s;
writeFileSync(join(DIST, '404.html'), layout(LOCALES.en, {
  title: 'Not a word (yet)',
  description: 'Page not found.',
  path: '/404',
  noindex: true,
  content: `
<section class="section">
  <h1 class="page-title">${sEn.e404Title}</h1>
  <p class="page-sub">${sEn.e404Sub} <a href="${SITE.repo}/new/main/words" rel="noopener">${sEn.e404Coin}</a></p>
  <p class="more-link"><a href="/">${sEn.e404Back}</a></p>
</section>`,
}));

// --- shared assets ---
writeFileSync(join(DIST, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#d9481f"/><text x="32" y="46" font-family="Georgia,serif" font-style="italic" font-size="42" fill="#f7f2e7" text-anchor="middle">n</text></svg>`);

writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);

const pathsOneLocale = ['/', '/all/', '/about/', ...Object.keys(byCategory).map((c) => `/category/${c}/`), ...words.map((w) => `/word/${w.slug}/`)];
const urls = Object.values(LOCALES).flatMap((L) => pathsOneLocale.map((p) => `${L.prefix}${p}`));
writeFileSync(join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE.url}${u}</loc></url>`).join('\n')}\n</urlset>\n`);

writeFileSync(join(DIST, '_headers'), `/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Cross-Origin-Opener-Policy: same-origin
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'

# keep the *.pages.dev mirror and preview deployments out of search results
https://:project.pages.dev/*
  X-Robots-Tag: noindex
`);

copyFileSync(join(ROOT, 'site', 'styles.css'), join(DIST, 'styles.css'));
copyFileSync(join(ROOT, 'site', 'app.js'), join(DIST, 'app.js'));

const missing = Object.entries(TR).flatMap(([loc, map]) => words.filter((w) => !map[w.slug]).map((w) => `${loc}:${w.slug}`));
console.log(`built ${words.length} words × ${Object.keys(LOCALES).length} locales → dist/ (${urls.length + 1} pages)`);
if (missing.length) console.log(`note: ${missing.length} missing translations (fall back to English): ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '…' : ''}`);
