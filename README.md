# Folio

A free, open-source personal news and magazine reader. No account, ads, paid subscription, or API key required.

**Live:** https://zainhomeautomation.github.io/Folio/

## Features

- Three-step onboarding: 21 interests, subtopics, regions, recommended sources and custom RSS/Atom feeds.
- Real publisher content from 24 sources, refreshed hourly by GitHub Actions. The app checks for a newer deployed edition every 15 minutes and on Refresh.
- Editorial home, Explore, Categories, source management, saved articles, magazines, history and settings.
- Single-page article reading on small screens, two-column spreads on wide screens, swipes, keyboard/page controls, text-size adjustment and optional continuous scrolling. Pagination responds to resizing, rotation and folding.
- Full NASA articles when supplied in the feed. Other publishers receive conservative, attributed previews and original links. No article-page scraping or paywall bypass.
- Original NASA Spinoff 2025 PDF with PDF.js page rendering, page turns, spreads and bookmarks. Imported PDFs stay in IndexedDB on your device (50 MB per file).
- Light/dark/system themes; installable PWA; offline cached edition, saved text and imported PDFs.
- Local library and JSON export/import for device transfer. No automatic cloud synchronization.
- Summarize uses supported browsers' on-device Summarizer API. Otherwise extracted key passages are explicitly labeled as not an AI summary.

## Local setup

Use Node 24 LTS and npm. Ingestion uses Node's native TypeScript support.

```sh
npm ci
npm run feeds
npm run magazines
npm run dev
```

Open the printed `/Folio/` URL.

```sh
npm run build
npm run preview
npx playwright install chromium webkit
npm test
```

Tests cover Chromium desktop, WebKit iPhone/iPad, onboarding, saved stories, history, themes, search, regions, source selection, pagination, live resizing, scrolling, summaries, the real PDF reader, manifest, service worker and offline saved reading.

## Deployment

Only the personal repository **Zainhomeautomation/Folio** is used. `.github/workflows/deploy.yml` validates, refreshes and publishes on pushes, manual runs and an hourly schedule. GitHub Pages needs no third-party hosting credentials and works with public repositories on GitHub Free. See [GitHub documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Build permission is `contents: read`; the deployment job uses `pages: write` and `id-token: write`. Scheduled runs can be delayed, and GitHub may disable schedules after 60 days without repository activity. Push an update or re-enable/run the workflow manually. Failed feeds retain bundled cached content and report their status. Article dates remain visible. Refresh retrieves the latest deployed edition; it does not trigger a cloud build.

The `/Folio/` deployment base is set in `vite.config.ts`, `index.html`, `public/manifest.webmanifest` and `scripts/write-sw.mjs`; update these together for another path.

## Custom feeds

Add a public HTTPS RSS/Atom URL in My Sources. Direct browser access requires publisher CORS permission. You can opt into the free [rss2json](https://rss2json.com/docs) converter; the feed URL is then shared with that third party, and service quotas/availability apply. Never add private or credential-bearing URLs. An RSS/Atom file import also works without the converter. Custom sources refresh at startup or after source/converter changes and are stored locally.

## Architecture

React, TypeScript, Vite, Lucide icons, DOMPurify, fast-xml-parser and lazy-loaded PDF.js.

- `src/catalog.ts`: shared source/category definitions and types.
- `scripts/refresh-feeds.mjs`: bounded concurrent feed ingestion, timeouts, timestamps, original images, source health.
- `src/Reader.tsx`: CSS multi-column pagination measured by ResizeObserver; sanitized publisher HTML.
- `src/PdfReader.tsx`: original PDF pages rendered on canvas.
- `src/storage.ts`: versioned browser storage with visible storage failures.
- `scripts/write-sw.mjs`: versioned app-shell cache and network-first edition refresh; excludes large online PDFs.

The main bundle is about 120 KB gzipped. PDF code/worker are loaded only when opening a magazine. No analytics or server database. Google Fonts and publisher image CDNs receive normal network metadata; images send no referrer. Browser storage is not an encrypted cloud backup. Clearing browser data removes the local library.

## Content rights

MIT covers Folio code only. Publisher content retains its rights and original attribution. Public feeds supply previews and original links. NASA content is used factually for informational reading, without implying endorsement; original PDF pages and credits are preserved. See [NASA media guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/).

[NASA Spinoff 2025 original PDF](https://ntts-prod.s3.amazonaws.com/t2p/prod/spinoff/NASA.Spinoff_2025_508.pdf) is 54 MB. Its binary is excluded from Git and downloaded at build time. Folio does not upload or redistribute user-imported PDFs. Import only publications you have permission to read.

## MVP limits

No registration or cloud sync. Feed depth, images and freshness depend on publishers; original sites may have access restrictions. Uncached external images and online PDFs require connectivity. Custom feed conversion and on-device AI are optional and browser/service dependent. Foldable support uses responsive viewport size; physical iPhone Duo hardware has not been tested. Automated WebKit emulation is not proof of behavior on every physical device.

## License

MIT © 2026 Zainhomeautomation. See LICENSE.
