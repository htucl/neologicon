// Neologicon client: search, word of the day, random redirect. Locale-aware via body data attributes.
(() => {
  const ds = document.body.dataset;
  const prefix = ds.prefix || '';

  // one in-flight/settled promise shared by WOTD, focus and typing; reset on failure so a retry is possible
  let wordsPromise = null;
  const loadWords = () => {
    wordsPromise ??= fetch(`${prefix}/words.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`words.json ${r.status}`))))
      .catch((e) => { wordsPromise = null; throw e; });
    return wordsPromise;
  };

  // --- random page ---
  if (document.body.classList.contains('random-page')) {
    loadWords().then((list) => {
      const pick = list[Math.floor(Math.random() * list.length)];
      location.replace(`${prefix}/word/${encodeURIComponent(pick.slug)}/`);
    }).catch(() => { /* the noscript/fallback link stays visible */ });
    return;
  }

  // --- word of the day (recomputed client-side so it rotates daily without a deploy) ---
  const wotdBox = document.getElementById('wotd');
  if (wotdBox) {
    loadWords().then((list) => {
      const w = list[Math.floor(Date.now() / 86400000) % list.length];
      const link = wotdBox.querySelector('.card-word a');
      if (link && link.getAttribute('href') !== `${prefix}/word/${w.slug}/`) {
        link.textContent = w.word;
        link.setAttribute('href', `${prefix}/word/${w.slug}/`);
        wotdBox.querySelector('.card-word .pos').textContent =
          { noun: 'n.', verb: 'v.', adjective: 'adj.', adverb: 'adv.', interjection: 'interj.' }[w.pos] || w.pos;
        wotdBox.querySelector('.card-def').textContent = w.definition;
        const ex = wotdBox.querySelector('.card-ex');
        if (ex) ex.textContent = w.example ? `"${w.example}"` : '';
      }
    }).catch(() => { /* keep the server-rendered pick */ });
  }

  // --- search ---
  const input = document.getElementById('search');
  const results = document.getElementById('search-results');
  if (!input || !results) return;

  input.addEventListener('focus', loadWords, { once: true });

  let active = -1;

  // Results are built as DOM nodes, never HTML strings: words.json carries contributor- and translator-written text.
  const el = (tag, props = {}, children = []) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  };
  const render = (hits, query) => {
    if (!query) { results.hidden = true; results.replaceChildren(); return; }
    active = -1;
    results.hidden = false;
    if (hits.length) {
      results.replaceChildren(...hits.slice(0, 12).map((w) =>
        el('a', { href: `${prefix}/word/${encodeURIComponent(w.slug)}/` }, [
          el('strong', { textContent: w.word }), ' ',
          el('span', { textContent: `· ${w.definition}` }),
        ])));
    } else {
      results.replaceChildren(el('p', { className: 'no-hit' }, [
        `${ds.nomatch || 'No match'} — `,
        el('a', { href: ds.coinhref || `${prefix}/about/`, textContent: ds.coinit || 'coin it?' }),
      ]));
    }
  };

  input.addEventListener('input', async () => {
    const q = input.value.trim().toLowerCase();
    if (!q) return render([], '');
    let list;
    try { list = await loadWords(); } catch { return; }
    if (input.value.trim().toLowerCase() !== q) return; // a newer keystroke owns the results now
    const hits = list
      .map((w) => {
        let score = 0;
        if (w.word.toLowerCase().startsWith(q)) score = 3;
        else if (w.word.toLowerCase().includes(q)) score = 2;
        else if (w.definition.toLowerCase().includes(q) || w.example.toLowerCase().includes(q)) score = 1;
        return { w, score };
      })
      .filter((h) => h.score > 0)
      .sort((a, b) => b.score - a.score || a.w.word.localeCompare(b.w.word))
      .map((h) => h.w);
    render(hits, q);
  });

  input.addEventListener('keydown', (e) => {
    const links = [...results.querySelectorAll('a[href*="/word/"]')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!links.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
      links.forEach((l, i) => l.classList.toggle('active', i === active));
      links[active].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && active >= 0 && links[active]) {
      location.href = links[active].href;
    } else if (e.key === 'Escape') {
      render([], '');
      input.blur();
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) { results.hidden = true; }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
    }
  });
})();
