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

## Deploy to GitHub Pages

1. In `docusaurus.config.ts`, set `organizationName` and `projectName` to your
   GitHub username and repo name. The site will be served at
   `https://<organizationName>.github.io/<projectName>/`.
2. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and
   deploys automatically.
3. In the repo's **Settings → Pages**, set **Source: GitHub Actions**.
