# UniVersus Sidekick

A fast, searchable web reference for the **UniVersus CCG** rules, built with
[Docusaurus](https://docusaurus.io/) and deployed to GitHub Pages.

- **Glossary** (`/glossary`) — an interactive, filterable card list of ~200 rules
  terms with instant search, keyword/letter filters, and clickable cross-references.
- **Guides** — placeholder pages for *How to Play* and *Solo AI Turn Flow* (content TBD).
- Dark mode, mobile layout, and full-text site search included.

## Develop

```bash
npm install
npm run start      # dev server with hot reload at http://localhost:3000
npm run build      # production build into ./build
npm run serve      # serve the production build locally
```

## The glossary data

The glossary is generated from `Reference/UVS_Rules_Reference_v1.2.7.pdf` into
`src/data/glossary.json`. That JSON is committed, so the site builds without the PDF.
To regenerate it (e.g. after a rules update), place the PDF in `Reference/` and run:

```bash
npm run extract    # runs scripts/extract-glossary.mjs (needs `pdftotext` on PATH)
```

`pdftotext` comes from Poppler (`brew install poppler` on macOS).

The parser uses the PDF's own index (pp. 2–4) as the authoritative term list and
`pdftotext -bbox-layout` word coordinates to split the two-column body into
per-term entries with definitions, examples, notes, bullets, and cross-references.

> Source PDFs are git-ignored (copyrighted game material) and are not published.

## Hosting (GitHub Pages)

**Live at:** https://webthingee.github.io/universus-sidekick/

The site is already deployed. Every push to `main` rebuilds and republishes it
automatically via `.github/workflows/deploy.yml` (watch progress in the repo's
**Actions** tab). Typical loop:

```bash
git add -A
git commit -m "…"
git push        # → live in ~1 minute
```

Config lives in `docusaurus.config.ts` (`organizationName: 'webthingee'`,
`projectName: 'universus-sidekick'`, which sets `baseUrl: '/universus-sidekick/'`).

### Setting this up on a fresh repo

1. Set `organizationName` / `projectName` in `docusaurus.config.ts` (URL is
   `https://<organizationName>.github.io/<projectName>/`).
2. `gh repo create <name> --public --source=. --push`
3. Enable Pages with **Source: GitHub Actions** — either in **Settings → Pages**,
   or `gh api -X POST repos/<org>/<name>/pages -f build_type=workflow`.
4. Push to `main`; the workflow builds and deploys.
