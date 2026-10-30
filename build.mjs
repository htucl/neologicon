// Neologicon static site builder — zero dependencies.
// Reads words/*.md, writes a complete site to dist/.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = {
  title: 'Neologicon',
  tagline: 'Words that should have existed.',
  url: process.env.SITE_URL || 'https://neologicon.com',
  repo: process.env.REPO_URL || 'https://github.com/htucl/neologicon',
};

const CATEGORIES = {
  tactile: { name: 'Tactile', desc: 'Physical sensations & touch' },
  sounds: { name: 'Sounds', desc: 'Onomatopoeia & noises' },
  social: { name: 'Social', desc: 'Emotional & social moments' },
  bodily: { name: 'Bodily', desc: 'Bodily states & sensations' },
  perception: { name: 'Perception', desc: 'Visual & perceptual' },
  movement: { name: 'Movement', desc: 'Physical action' },
  environment: { name: 'Environment', desc: 'Sensory phenomena in the world' },
};

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(ROOT, 'dist');

// ---------- parse ----------

function parseEntry(filename) {
  const raw = readFileSync(join(ROOT, 'words', filename), 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${filename}: missing frontmatter`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  const slug = filename.replace(/\.md$/, '');
  if (!meta.word) throw new Error(`${filename}: missing "word" field`);
  if (meta.word.toLowerCase().replace(/[^a-z0-9]+/g, '-') !== slug) {
    throw new Error(`${filename}: filename must match word ("${meta.word}")`);
  }
  const body = m[2].trim().split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const definition = body.find((b) => !b.startsWith('>')) || '';
  const exampleBlock = body.find((b) => b.startsWith('>'));
  const example = exampleBlock
    ? exampleBlock.split('\n').map((l) => l.replace(/^>\s?/, '')).join(' ').replace(/^[""]|[""]$/g, '').replace(/^"|"$/g, '')
    : '';
  if (!definition) throw new Error(`${filename}: missing definition body`);
  return {
    slug,
    word: meta.word,
    pos: meta.pos || 'noun',
    category: meta.category || 'uncategorized',
    author: meta.author || 'anonymous',
    added: meta.added || '',
    pronunciation: meta.pronunciation || '',
    definition,
    example,
  };
}

const words = readdirSync(join(ROOT, 'words'))
  .filter((f) => f.endsWith('.md'))
  .map(parseEntry)
  .sort((a, b) => a.word.localeCompare(b.word));

if (words.length === 0) throw new Error('No word entries found in words/');

const byCategory = {};
for (const w of words) (byCategory[w.category] ??= []).push(w);

const catInfo = (slug) =>
  CATEGORIES[slug] || { name: slug.charAt(0).toUpperCase() + slug.slice(1), desc: '' };

// ---------- html helpers ----------

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function layout({ title, description, path, content, bodyClass = '', noindex = false }) {
  const fullTitle = path === '/' ? `${SITE.title} — ${SITE.tagline}` : `${title} — ${SITE.title}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${SITE.url}${path}">`}
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE.url}${path}">
<meta name="theme-color" content="#f7f2e7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#171310" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=IBM+Plex+Mono:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
</head>
<body class="${bodyClass}">
<header class="topbar">
  <a class="wordmark" href="/">neologicon<span class="dot">.</span></a>
  <nav class="nav">
    <a href="/all/">browse</a>
    <a href="/random/">random</a>
    <a href="/about/">about</a>
    <a href="${SITE.repo}" rel="noopener">github</a>
  </nav>
</header>
<main>
${content}
</main>
<footer class="footer">
  <p class="footer-tagline">${esc(SITE.tagline)}</p>
  <p>${words.length} words and counting · <a href="${SITE.repo}" rel="noopener">add yours on GitHub</a></p>
</footer>
<script src="/app.js" defer></script>
</body>
</html>`;
}

const posAbbrev = { noun: 'n.', verb: 'v.', adjective: 'adj.', adverb: 'adv.', interjection: 'interj.' };

function wordCard(w, { big = false } = {}) {
  return `<article class="card${big ? ' card-big' : ''}">
  <h3 class="card-word"><a href="/word/${w.slug}/">${esc(w.word)}</a> <span class="pos">${posAbbrev[w.pos] || w.pos}</span></h3>
  <p class="card-def">${esc(w.definition)}</p>
  ${w.example ? `<blockquote class="card-ex">"${esc(w.example)}"</blockquote>` : ''}
</article>`;
}

// ---------- build ----------

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });

function page(path, html) {
  const dir = join(DIST, path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
}

// word of the day (build-time fallback; app.js recomputes the same formula daily)
const wotdIndex = Math.floor(Date.now() / 86400000) % words.length;
const wotd = words[wotdIndex];

// --- home ---
const recent = [...words]
  .sort((a, b) => (b.added || '').localeCompare(a.added || '') || a.word.localeCompare(b.word))
  .slice(0, 6);

page('/', layout({
  title: SITE.title,
  description: `${SITE.tagline} A community dictionary of ${words.length} neologisms — invented words for feelings, sounds, and moments English forgot to name.`,
  path: '/',
  content: `
<section class="hero">
  <h1 class="hero-title">Words that <em>should</em> have existed.</h1>
  <p class="hero-sub">A dictionary of neologisms — new words for the feelings, sounds, and tiny moments English never got around to naming. Community-edited, one pull request at a time.</p>
  <div class="search-wrap">
    <input id="search" class="search" type="search" placeholder="Search ${words.length} words…" autocomplete="off" aria-label="Search words">
    <div id="search-results" class="search-results" hidden></div>
  </div>
</section>

<section class="section">
  <h2 class="section-label">word of the day</h2>
  <div id="wotd">${wordCard(wotd, { big: true })}</div>
</section>

<section class="section">
  <h2 class="section-label">browse by category</h2>
  <div class="cat-grid">
    ${Object.keys(byCategory).sort().map((slug) => {
      const c = catInfo(slug);
      return `<a class="cat-tile" href="/category/${slug}/"><strong>${esc(c.name)}</strong><span>${byCategory[slug].length} words</span></a>`;
    }).join('\n    ')}
  </div>
</section>

<section class="section">
  <h2 class="section-label">recently added</h2>
  <div class="card-grid">
    ${recent.map((w) => wordCard(w)).join('\n')}
  </div>
  <p class="more-link"><a href="/all/">See all ${words.length} words →</a></p>
</section>

<section class="section contribute">
  <h2 class="section-label">coin a word</h2>
  <p>Invented a word the language needs? Neologicon is a public GitHub repository — every word is a markdown file, and every new word is a pull request.</p>
  <p><a class="button" href="${SITE.repo}/new/main/words" rel="noopener">Submit a word</a></p>
</section>`,
}));

// --- all words (A–Z) ---
const byLetter = {};
for (const w of words) (byLetter[w.word[0].toUpperCase()] ??= []).push(w);

page('/all/', layout({
  title: 'All words',
  description: `Every word in the Neologicon, A to Z. ${words.length} neologisms and counting.`,
  path: '/all/',
  content: `
<section class="section">
  <h1 class="page-title">All ${words.length} words</h1>
  <nav class="letter-nav">${Object.keys(byLetter).sort().map((l) => `<a href="#${l}">${l}</a>`).join(' ')}</nav>
  ${Object.keys(byLetter).sort().map((l) => `
  <h2 class="letter" id="${l}">${l}</h2>
  <ul class="word-list">
    ${byLetter[l].map((w) => `<li><a href="/word/${w.slug}/">${esc(w.word)}</a> <span class="pos">${posAbbrev[w.pos] || w.pos}</span> — ${esc(w.definition)}</li>`).join('\n    ')}
  </ul>`).join('\n')}
</section>`,
}));

// --- category pages ---
for (const [slug, list] of Object.entries(byCategory)) {
  const c = catInfo(slug);
  page(`/category/${slug}/`, layout({
    title: c.name,
    description: `${c.desc || c.name} — ${list.length} words in the Neologicon.`,
    path: `/category/${slug}/`,
    content: `
<section class="section">
  <p class="crumb"><a href="/">neologicon</a> / category</p>
  <h1 class="page-title">${esc(c.name)}</h1>
  ${c.desc ? `<p class="page-sub">${esc(c.desc)}</p>` : ''}
  <div class="card-grid">
    ${list.map((w) => wordCard(w)).join('\n')}
  </div>
</section>`,
  }));
}

// --- word pages ---
words.forEach((w, i) => {
  const prev = words[(i - 1 + words.length) % words.length];
  const next = words[(i + 1) % words.length];
  const c = catInfo(w.category);
  page(`/word/${w.slug}/`, layout({
    title: w.word,
    description: `${w.word} (${w.pos}): ${w.definition}`,
    path: `/word/${w.slug}/`,
    bodyClass: 'entry-page',
    content: `
<article class="entry">
  <p class="crumb"><a href="/">neologicon</a> / <a href="/category/${w.category}/">${esc(c.name.toLowerCase())}</a></p>
  <h1 class="entry-word">${esc(w.word)}</h1>
  <p class="entry-meta"><span class="pos">${posAbbrev[w.pos] || w.pos}</span>${w.pronunciation ? ` · <span class="pron">/${esc(w.pronunciation)}/</span>` : ''}</p>
  <p class="entry-def">${esc(w.definition)}</p>
  ${w.example ? `<blockquote class="entry-ex">"${esc(w.example)}"</blockquote>` : ''}
  <dl class="entry-facts">
    <div><dt>coined by</dt><dd>${esc(w.author)}</dd></div>
    ${w.added ? `<div><dt>added</dt><dd>${esc(w.added)}</dd></div>` : ''}
    <div><dt>category</dt><dd><a href="/category/${w.category}/">${esc(c.name)}</a></dd></div>
  </dl>
  <p class="entry-edit"><a href="${SITE.repo}/edit/main/words/${w.slug}.md" rel="noopener">Suggest an edit on GitHub ↗</a></p>
  <nav class="pager">
    <a href="/word/${prev.slug}/">← ${esc(prev.word)}</a>
    <a href="/word/${next.slug}/">${esc(next.word)} →</a>
  </nav>
</article>
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'DefinedTerm',
  name: w.word,
  description: w.definition,
  url: `${SITE.url}/word/${w.slug}/`,
  inDefinedTermSet: { '@type': 'DefinedTermSet', name: SITE.title, url: SITE.url },
})}</script>`,
  }));
});

// --- random ---
page('/random/', layout({
  title: 'Random word',
  description: 'A random word from the Neologicon.',
  path: '/random/',
  bodyClass: 'random-page',
  content: `
<section class="section">
  <h1 class="page-title">Rolling the dice…</h1>
  <noscript><p>JavaScript is off — try <a href="/all/">the full list</a> instead.</p></noscript>
</section>`,
}));

// --- about ---
page('/about/', layout({
  title: 'About',
  description: 'What Neologicon is and how to add a word.',
  path: '/about/',
  content: `
<section class="section prose">
  <h1 class="page-title">About</h1>
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
  <p>Ground rules: the word must not already exist in English, the definition should name something real but unnamed, and keep it kind. See <a href="${SITE.repo}/blob/main/CONTRIBUTING.md" rel="noopener">CONTRIBUTING.md</a> for details.</p>
</section>`,
}));

// --- 404 ---
writeFileSync(join(DIST, '404.html'), layout({
  title: 'Not a word (yet)',
  description: 'Page not found.',
  path: '/404',
  noindex: true,
  content: `
<section class="section">
  <h1 class="page-title">Not a word. <em>Yet.</em></h1>
  <p class="page-sub">This page doesn't exist — but maybe the word should. <a href="${SITE.repo}/new/main/words" rel="noopener">Coin it?</a></p>
  <p class="more-link"><a href="/">← Back to the dictionary</a></p>
</section>`,
}));

// --- data + assets ---
writeFileSync(join(DIST, 'words.json'), JSON.stringify(
  words.map((w) => ({ slug: w.slug, word: w.word, pos: w.pos, category: w.category, definition: w.definition, example: w.example })),
));

writeFileSync(join(DIST, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#d9481f"/><text x="32" y="46" font-family="Georgia,serif" font-style="italic" font-size="42" fill="#f7f2e7" text-anchor="middle">n</text></svg>`);

writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);

// Security headers (honored by Cloudflare Pages; harmless elsewhere)
writeFileSync(join(DIST, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'
`);

const urls = ['/', '/all/', '/about/', ...Object.keys(byCategory).map((c) => `/category/${c}/`), ...words.map((w) => `/word/${w.slug}/`)];
writeFileSync(join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE.url}${u}</loc></url>`).join('\n')}\n</urlset>\n`);

copyFileSync(join(ROOT, 'site', 'styles.css'), join(DIST, 'styles.css'));
copyFileSync(join(ROOT, 'site', 'app.js'), join(DIST, 'app.js'));

console.log(`built ${words.length} words → dist/ (${urls.length + 1} pages)`);
