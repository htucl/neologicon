# Neologicon

**neologicon.com** — a GitHub-driven dictionary of neologisms: words that should have existed.

Every word is a markdown file in [`words/`](words/). The site is rebuilt as pure static HTML by [`build.mjs`](build.mjs) (zero dependencies) and served by Cloudflare Pages, which redeploys automatically on every push to `main`. New words arrive as pull requests — from people, and from a daily routine that coins a few words each morning — and every pull request must pass the `validate` check (build + content gate) before it can merge.

## Local development

```bash
npm run dev     # build + serve at http://localhost:8787
npm run build   # build only → dist/
npm run check   # content gate on words added since origin/main (real-word, duplicate, usage checks)
```

Requires Node 20+ (`.nvmrc` pins 22, matching Cloudflare's build image). No dependencies to install.

## Adding a word

Create `words/yourword.md`:

```markdown
---
word: yourword
pos: noun            # noun | verb | adjective | adverb | interjection
category: social     # tactile | sounds | social | bodily | perception | movement | environment
author: Your Name
added: 2026-11-13
---

A one-sentence definition of the word.

> "An example sentence using the word."
```

The filename must match the word. `pos` and `category` must be one of the listed values; the build rejects anything else. Add the definition's translations to `translations/hi.json`, `es.json` and `fr.json` if you can (English is shown otherwise). Open a pull request; once merged, the word deploys automatically. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Deploying to Cloudflare Pages

One-time setup:

1. In the [Cloudflare dashboard](https://dash.cloudflare.com): **Workers & Pages → Create → Pages → Connect to Git**, pick the repo, and configure:
   - **Build command:** `node build.mjs`
   - **Build output directory:** `dist`
2. After the first deploy, go to the project's **Custom domains** tab and add `neologicon.com` (and `www.neologicon.com`). If the domain's DNS is on Cloudflare, this is one click; otherwise follow the CNAME instructions shown.

From then on, every push to `main` (including merged PRs) rebuilds and deploys the site. PRs from branches in this repo also get preview deployments at unique URLs.

## How content is protected

- `build.mjs` validates every entry: allowed fields only, `pos`/`category` from the fixed lists, ISO date not in the future, length and character limits, exactly one definition paragraph; all output is HTML-escaped.
- [`scripts/check-words.mjs`](scripts/check-words.mjs) gates *new* words: not a dictionary word (or a respelling of one), not within one letter of an existing word, no duplicate concept or copied example, example uses the word with the tagged part of speech, no circular definition.
- `main` only accepts pull requests whose `validate` check passed. Branches named `routine/*` (and pull requests from outside contributors) may only add word files and edit translations.
- The daily routine pushes `routine/YYYY-MM-DD`; [`routine-pr.yml`](.github/workflows/routine-pr.yml) opens its pull request with auto-merge, so a batch lands only if the gate passes. Close the PR to reject a batch.

## Structure

```
words/           one markdown file per word (the entire database)
translations/    hi.json, es.json, fr.json — translated definitions keyed by word slug
site/            stylesheet + client JS (search, word-of-the-day, random)
scripts/         check-words.mjs — content gate run by CI and the routine
build.mjs        static site generator (Node, no dependencies)
serve.mjs        local dev server
dist/            build output (gitignored)
```

## Roadmap ideas

- Voting via Cloudflare Workers + KV (Urban Dictionary-style upvotes)
- Multiple competing definitions per word
- RSS feed of new words
