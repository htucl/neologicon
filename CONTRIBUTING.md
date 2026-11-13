# Contributing a word

Neologicon grows one pull request at a time. Anyone can coin a word.

## The bar for inclusion

A good neologism should feel **obvious in retrospect** — as though it fills a gap in English that genuinely existed:

1. **It must not already be an English word**, nor a respelling of one (*klench* for *clench* doesn't count), nor within one letter of a word already here. The `validate` check tests this against a dictionary.
2. **It names something real but unnamed** — a specific feeling, sound, sensation, or moment people recognize instantly — and not something the dictionary already has a word for (search first; the check also flags overlapping definitions).
3. **It sounds like English** — pronounceable, spellable, plausible.
4. **Keep it kind** — no slurs, no words targeting people or groups, nothing hateful.
5. **The example must show the word in use**, in the part of speech you tagged (a noun shouldn't be "I nouned"), and must not just restate the definition.

Strong examples already in the dictionary: *chorp* (the one deafening chair-scrape in a silent room), *dorple* (the mutual side-stepping dance with a stranger), *whymble* (arriving in a room with no memory of why), *grold* (of coffee: discovered mid-sip to be cold).

## How to submit

1. Fork the repo (or use GitHub's "create new file" button).
2. Add `words/yourword.md` — the filename must match the word, lowercase:

```markdown
---
word: yourword
pos: noun            # noun | verb | adjective | adverb | interjection
category: social     # tactile | sounds | social | bodily | perception | movement | environment
author: Your Name
added: 2026-11-13
pronunciation: yor-WORD   # please include one
---

A one-sentence definition of the word.

> "An example sentence using the word."
```

3. If you can, add the definition in Hindi, Spanish and French to `translations/hi.json`, `es.json` and `fr.json` (key = the filename without `.md`). Pages fall back to English otherwise.
4. Open a pull request. The `validate` check runs the build and the content gate; you can run both locally with `npm run build` and `npm run check`.
5. Once merged, the site redeploys automatically and your word is live.

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

These seven are the only valid values; the build rejects any other slug. If you think a category is missing, open an issue — adding one needs names and descriptions in all four languages.
