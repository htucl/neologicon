# Neologicon

**neologicon.com** — a GitHub-driven dictionary of neologisms: words that should have existed.

Every word is a markdown file in [`words/`](words/). The site is rebuilt as pure static HTML by [`build.mjs`](build.mjs) (zero dependencies) and served by Cloudflare Pages, which redeploys automatically on every push. New words arrive as pull requests.

## Local development

```bash
npm run dev     # build + serve at http://localhost:8787
npm run build   # build only → dist/
```

Requires Node 18+. No dependencies to install.

## Adding a word

Create `words/yourword.md`:

```markdown
---
word: yourword
pos: noun            # noun | verb | adjective | adverb | interjection
category: social     # tactile | sounds | social | bodily | perception | movement | environment
author: Your Name
added: 2026-08-06
---

A one-sentence definition of the word.

> "An example sentence using the word."
```

The filename must match the word. Open a pull request; once merged, the word deploys automatically. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Deploying to Cloudflare Pages

One-time setup:

1. Push this repository to GitHub.
2. In `build.mjs`, set `SITE.repo` to your GitHub repo URL (used for "edit on GitHub" links).
3. In the [Cloudflare dashboard](https://dash.cloudflare.com): **Workers & Pages → Create → Pages → Connect to Git**, pick the repo, and configure:
   - **Build command:** `node build.mjs`
   - **Build output directory:** `dist`
4. After the first deploy, go to the project's **Custom domains** tab and add `neologicon.com` (and `www.neologicon.com`). If the domain's DNS is on Cloudflare, this is one click; otherwise follow the CNAME instructions shown.

From then on, every push to `main` (including merged PRs) rebuilds and deploys the site. PRs also get free preview deployments at unique URLs.

Alternatively, deploy directly from your machine without connecting Git:

```bash
npx wrangler pages deploy dist --project-name neologicon
```

## Structure

```
words/           one markdown file per word (the entire database)
site/            stylesheet + client JS (search, word-of-the-day, random)
build.mjs        static site generator (Node, no dependencies)
serve.mjs        local dev server
dist/            build output (gitignored)
```

## Roadmap ideas

- Voting via Cloudflare Workers + KV (Urban Dictionary-style upvotes)
- Multiple competing definitions per word
- RSS feed of new words
