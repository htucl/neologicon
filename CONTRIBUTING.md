# Contributing a word

Neologicon grows one pull request at a time. Anyone can coin a word.

## The bar for inclusion

A good neologism should feel **obvious in retrospect** — as though it fills a gap in English that genuinely existed:

1. **It must not already be an English word** (check a dictionary first).
2. **It names something real but unnamed** — a specific feeling, sound, sensation, or moment people recognize instantly.
3. **It sounds like English** — pronounceable, spellable, plausible.
4. **Keep it kind** — no slurs, no words targeting people or groups, nothing hateful.

Strong examples already in the dictionary: *vrinch* (a full-body shudder), *splunge* (the sound of stepping in something wet and unknown), *mirl* (staring without seeing), *sprent* (the smell of rain on hot pavement).

## How to submit

1. Fork the repo (or use GitHub's "create new file" button).
2. Add `words/yourword.md` — the filename must match the word, lowercase:

```markdown
---
word: yourword
pos: noun            # noun | verb | adjective | adverb | interjection
category: social     # tactile | sounds | social | bodily | perception | movement | environment
author: Your Name
added: 2026-08-06
pronunciation: yor-WORD   # optional
---

A one-sentence definition of the word.

> "An example sentence using the word."
```

3. Open a pull request. Run `npm run build` locally if you want to check it compiles (the build fails loudly on malformed entries).
4. Once merged, the site redeploys automatically and your word is live.

## Editing an existing word

Every word page has a "Suggest an edit on GitHub" link that opens the file in the GitHub editor — improve the definition or example and submit the change as a PR.

## Categories

| slug | covers |
|---|---|
| `tactile` | physical sensations & touch |
| `sounds` | onomatopoeia & noises |
| `social` | emotional & social moments |
| `bodily` | bodily states & sensations |
| `perception` | visual & perceptual |
| `movement` | physical action |
| `environment` | sensory phenomena in the world |

A new category is fine too — just use a new slug and it will appear automatically.
