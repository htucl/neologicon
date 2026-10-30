// Neologicon client: search, word of the day, random redirect.
(() => {
  let words = null;
  const loadWords = async () => {
    if (!words) words = await (await fetch('/words.json')).json();
    return words;
  };

  // --- random page ---
  if (document.body.classList.contains('random-page')) {
    loadWords().then((list) => {
      const pick = list[Math.floor(Math.random() * list.length)];
      location.replace(`/word/${pick.slug}/`);
    });
    return;
  }

  // --- word of the day (recomputed client-side so it rotates daily without a deploy) ---
  const wotdBox = document.getElementById('wotd');
  if (wotdBox) {
    loadWords().then((list) => {
      const w = list[Math.floor(Date.now() / 86400000) % list.length];
      const link = wotdBox.querySelector('.card-word a');
      if (link && link.getAttribute('href') !== `/word/${w.slug}/`) {
        link.textContent = w.word;
        link.setAttribute('href', `/word/${w.slug}/`);
        wotdBox.querySelector('.card-word .pos').textContent =
          { noun: 'n.', verb: 'v.', adjective: 'adj.', adverb: 'adv.' }[w.pos] || w.pos;
        wotdBox.querySelector('.card-def').textContent = w.definition;
        const ex = wotdBox.querySelector('.card-ex');
        if (ex) ex.textContent = w.example ? `"${w.example}"` : '';
      }
    });
  }

  // --- search ---
  const input = document.getElementById('search');
  const results = document.getElementById('search-results');
  if (!input || !results) return;

  input.addEventListener('focus', loadWords, { once: true });

  let active = -1;

  const render = (hits, query) => {
    if (!query) { results.hidden = true; results.innerHTML = ''; return; }
    active = -1;
    results.hidden = false;
    results.innerHTML = hits.length
      ? hits.slice(0, 12).map((w) =>
          `<a href="/word/${w.slug}/"><strong>${w.word}</strong> <span>· ${w.definition}</span></a>`).join('')
      : `<p class="no-hit">No match for "${query.replace(/[<>&"]/g, '')}" — <a href="${document.querySelector('.contribute .button')?.href || '/about/'}">coin it?</a></p>`;
  };

  input.addEventListener('input', async () => {
    const q = input.value.trim().toLowerCase();
    if (!q) return render([], '');
    const list = await loadWords();
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
    const links = [...results.querySelectorAll('a[href^="/word/"]')];
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
