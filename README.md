# fakhri-ramdani-portfolio

Single-page web CV for **Fakhri Ramdani** (`Fakhri Ramdani — Software Engineer`).

Static site: Next.js App Router with `output: 'export'`, self-hosted Inter, and
a zero-JavaScript client runtime. The build is served by nginx.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router), `output: 'export'` static export |
| Styling | Plain CSS with design tokens from `design/tokens.json` (no runtime CSS) |
| Fonts | Self-hosted Inter woff2 (400/500/600) in `public/fonts/` |
| Client JS | **0 KB** — the unused Next.js runtime is pruned post-build (ADR-0004) |
| Content | Single source: `src/content/cv.data.ts` (build-time validated) |
| Hosting | nginx serving the versioned `out/` behind a `current` symlink |

## Scripts

```bash
npm run dev          # dev server (http://localhost:3000)
npm run build        # validate → next build → prune client runtime
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm test             # unit tests (node:test via tsx)
npm run validate     # content schema + PRD ID guard + asset hash/dim
npm run smoke        # post-build static output + budgets + secret/CSP checks
node scripts/render-smoke.js   # headless Chrome render + 0-JS check
```

`npm run build` runs `scripts/prune-runtime.js` after `next build`: because the
page has no interactivity (BR-017), the unused Next.js React runtime is stripped
from the export, leaving HTML + CSS only. The pruner skips itself and fails the
budget gate if a `"use client"` component is ever added (see ADR-0004).

## Environment

| Var | When | Notes |
|---|---|---|
| `SITE_URL` | production build | Absolute `https` origin, no path. Drives canonical, `og:url`, sitemap `<loc>`. The build fails with `E_META: SITE_URL is required for production build` when `CI=true` and it is unset. Local dev falls back to `http://localhost:3000`. |

## Docker

```bash
# Build (SITE_URL is a build-time arg — it is baked into the HTML head)
docker build --build-arg SITE_URL=https://example.com -t my-portfolio .

# Run (nginx on port 80)
docker run -p 8080:80 my-portfolio
# or
SITE_URL=https://example.com docker compose up --build
```

The image is a two-stage build: Node builds the static export, then nginx serves
it with `config/nginx/my-portfolio.conf`.

## Docs

- `docs/tech/TECH-SPEC.md` — technical spec and task breakdown.
- `docs/tech/adr/` — architecture decision records (static export, styling,
  content validation, client-runtime pruning).
- `docs/product/` — PRD, rules, stories.
- `design/` — design spec and tokens.
