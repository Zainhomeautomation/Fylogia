# Fylogia

A free, open-source personal news and magazine reader. No account, ads, paid subscription, or API key required.

**Proposed final brand:** FYLOGIA (Fylogia). Preliminary availability screening on 29 October 2026 found no significant conflict in the checks completed; this is not worldwide trademark clearance. The existing personal repository has been renamed with its history preserved. Publication and domain purchases remain blocked until the owner approves the availability results.

**Publication on hold:** the former GitHub Pages URL was `https://zainhomeautomation.github.io/Folio/`. GitHub does not redirect project-site URLs on repository rename; do not treat the old URL as the renamed app. The publication workflow is disabled, and no Fylogia site has been deployed.

## Features

- Three-step onboarding: 21 interests, subtopics, regions, recommended sources and custom RSS/Atom feeds.
- Real publisher content from 24 sources, refreshed hourly by GitHub Actions. The app checks for a newer deployed edition every 15 minutes and on Refresh.
- Editorial home, Explore, Categories, source management, saved articles, magazines, history and settings.
- Single-page article reading on small screens, two-column spreads on wide screens, swipes, keyboard/page controls, text-size adjustment and optional continuous scrolling. Pagination responds to resizing, rotation and folding.
- Full NASA articles when supplied in the feed. Other publishers receive conservative, attributed previews and original links. No article-page scraping or paywall bypass.
- Original NASA Spinoff 2025 PDF with PDF.js page rendering, page turns, spreads and bookmarks. Imported PDFs stay in IndexedDB on your device (50 MB per file).
- Light/dark/system themes; installable PWA with a cached shell, IndexedDB downloads, and a separate Cache Storage image library. Download individual articles, select several, or use Download Daily Edition (up to 30 stories from the current For You selection). Offline Library shows text/image availability, reading progress, storage use, refresh and delete controls.
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

Open the printed `/Fylogia/` URL.

```sh
npm run build
npm run preview
npx playwright install chromium webkit
npm test
```

Tests cover Chromium desktop, WebKit iPhone/iPad, onboarding, saved stories, history, themes, search, regions, source selection, pagination, live resizing, scrolling, summaries, the real PDF reader, manifest, service worker and offline saved reading.

## Deployment

Only the personal repository **Zainhomeautomation/Fylogia** is used. `.github/workflows/deploy.yml` validates and prepares builds on pushes, manual runs and an hourly schedule. The live Actions workflow is disabled. The prepared workflow also requires the personal repository variable `FYLOGIA_PUBLICATION_APPROVED` to be explicitly set to `true`; only re-enable it and set that variable after the owner approves publication. GitHub Pages needs no third-party hosting credentials and works with public repositories on GitHub Free. See [GitHub documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Build permission is `contents: read`; the deployment job uses `pages: write` and `id-token: write`. Scheduled runs can be delayed, and GitHub may disable schedules after 60 days without repository activity. Push an update or re-enable/run the workflow manually. Failed feeds retain bundled cached content and report their status. Article dates remain visible. Refresh retrieves the latest deployed edition; it does not trigger a cloud build.

The same repository is now `Zainhomeautomation/Fylogia`, preserving all original commits and branches. Existing browser-storage keys (`folio.v1.*`), the PDF database (`folio-magazines`), offline database (`fyllora-offline`), image cache (`fyllora-offline-images-v1`) and download index (`fyllora.offline.ids`) intentionally retain their compatibility names. The Pages mount is prepared as `/Fylogia/`; the manifest ID remains `/Folio/` on that same origin to retain installation identity. Storage remains origin-specific, and old/new service-worker scopes differ; visit the approved new URL online once before offline use. Library exports now use `fylogia-library.json`; previous exports still import. The old cache prefix is recognized during future service-worker upgrades.

The default `/Fylogia/` deployment base matches the renamed repository. Set `FYLOGIA_BASE_PATH=/` for a Sites/root build. Vite processes the index asset URLs and the build script writes the manifest start URL, scope, identity and service-worker paths for the selected base. `FYLOGIA_TEST_URL` can target an already-running build; `FYLOGIA_SCREENSHOTS` selects an absolute screenshot output directory.

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

The main bundle is about 123 KB gzipped. PDF code/worker are loaded only when opening a magazine. No analytics or server database. Google Fonts and publisher image CDNs receive normal network metadata; images send no referrer. Browser storage is not an encrypted cloud backup. Clearing browser data removes the local library.

## Content rights

MIT covers Fylogia code only. Publisher content retains its rights and original attribution. Public feeds supply previews and original links. NASA content is used factually for informational reading, without implying endorsement; original PDF pages and credits are preserved. See [NASA media guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/).

[NASA Spinoff 2025 original PDF](https://ntts-prod.s3.amazonaws.com/t2p/prod/spinoff/NASA.Spinoff_2025_508.pdf) is 54 MB. Its binary is excluded from Git and downloaded at build time. Fylogia does not upload or redistribute user-imported PDFs. Import only publications you have permission to read.

## MVP limits

No registration or cloud sync. Feed depth, images and freshness depend on publishers; original sites may have access restrictions. Uncached external images and online PDFs require connectivity. Custom feed conversion and on-device AI are optional and browser/service dependent. Foldable support uses responsive viewport size; physical iPhone Duo hardware has not been tested. Automated WebKit emulation is not proof of behavior on every physical device.

## License

MIT © 2026 Zainhomeautomation. See LICENSE.

## Explicit offline downloads

Offline copies are stored in the `fyllora-offline` IndexedDB database. The `fyllora-offline-images-v1` Cache Storage cache holds permitted publisher images, including opaque image responses for CDNs that permit embedding without CORS. Public app-shell assets live in separately versioned shell caches. Updating the shell must not delete downloaded image data. IndexedDB stores download/refresh timestamps, image completeness, bookmarks and reading progress; legacy local storage continues to hold the existing library and preferences.

1. Complete onboarding online and allow the service worker to finish its first installation.
2. Choose the download arrow on a story, select multiple stories, or use Download Daily Edition. The daily action downloads a clearly labeled maximum of 30 stories from the current personalized selection.
3. Wait for the completed download count. Open Offline Library to check each copy's text and image status before travelling.
4. Turn off connectivity, close/reopen or reload Fylogia, and open a downloaded story. Pagination, text size, single/two-column layouts, saved state and progress work locally.
5. Remove a download from Offline Library to delete its IndexedDB content and any images not shared with another download. Bookmarks and reading progress remain in the existing personal library.

Downloads contain only already-supplied RSS text: full NASA feed articles where supplied, conservative previews for other publishers. No article page, paywall, login, or PDF restriction is bypassed. Image downloads use a conservative NASA informational-media policy: only official NASA-hosted images on qualifying NASA articles; APOD and feed material marked with copyright are excluded. Original credits remain in the content. Other publisher images are omitted from offline copies when permission has not been established. The UI reports partial or text-only copies rather than claiming those images are available. A failed image does not prevent permitted text from being stored.

When an online edition changes, downloaded text and metadata are refreshed from that feed; images whose permission or URL changed are dropped from the copy. New or missing images require the explicit Refresh download action. An unavailable feed leaves the existing download intact. The app does not crawl original article pages to update offline text.

Storage estimates include all data for the origin, not just downloads. Browsers can pad the reported cost of opaque responses. The app requests persistent storage where supported, checks for low space, handles quota failures without deleting existing copies, and detects missing records/images when their index survives. Safari/iOS may deny persistence or evict site data. There is no way to guarantee an offline launch after the browser deletes the entire origin. Add to Home Screen, leave free space and check Offline Library before Airplane Mode. An export backs up preferences and bookmarks, not offline image binaries or imported PDFs.

### Offline verification

```sh
npm ci
npm run feeds
npm run magazines
npm run build
npx playwright install chromium webkit
npm test
```

The suite includes network-disabled launches, full article and opaque-image reading, horizontal page turns, folded/unfolded viewport changes, bookmarks/progress across reloads, multi-select and daily edition downloads, deletion, reconnection updates, copyright-policy exclusions, quota failures and browser eviction. Tests use current real feed entries. The opaque-image case uses the real publisher photo with CORS deliberately absent in the test response. Tests that simulate quota/eviction do so only in isolated test browser contexts. WebKit emulation is not physical iPhone Airplane Mode certification.

## ChatGPT Sites preparation and supported publication path

Status: production-compatible root build prepared; **not published to Sites**. No hosting provider has been substituted. No renamed application has been deployed. Availability results await owner approval; the proposed branding is prepared in the `fylogia-brand` branch.

Official OpenAI documentation supports preparing compatible existing local projects, saving a version, choosing visitor access and deploying it:

- https://learn.chatgpt.com/docs/sites/creating-a-site
- https://learn.chatgpt.com/docs/sites/publishing-and-sharing

The installed Sites plugin's repository workflow is more specific: `create_site` provisions a Site and its assigned source repository; `site-workflow.mjs` pushes the exact source commit to that repository before packaging; `save_site_version` requires that assigned remote branch's commit; then `update_site_access` and `deploy_site_version` can publish publicly where the account permits. No available tool argument attaches an arbitrary existing GitHub repository or uploads a standalone archive without Site-source provenance. No undocumented GitHub-to-Sites integration, import button, or automatic sync is assumed.

This conflicts with the instruction to keep source exclusively in the existing personal GitHub repository unless Sites can bind that exact repository. Therefore no Site-assigned source copy was created or pushed. An archive alone is **not** a verified one-click Sites import and is not a native Sites publication artifact until a real Site ID and matching source provenance are attached.

### Exact next steps

1. Keep the existing personal repository and commits. In ChatGPT web/desktop, open Sites or use `@Sites` and select this existing local project for compatibility preparation. Do not scaffold a replacement.
2. Resolve the source-storage prerequisite: confirm that Sites can bind the exact personal repository `Zainhomeautomation/Fylogia` and return its real Site ID/source credentials. Current exposed tools do not offer this binding. If the service requires a different source repository, publication cannot proceed under the current exclusive-source instruction; it requires your explicit exception first. Obtain the owner’s approval of the FYLOGIA availability results before public publication.
3. Once that prerequisite is satisfied, use Sites' returned real project ID to create `.openai/hosting.json` with `project_id` and `static: { directory: "dist" }`. Do not invent an ID. The reference `.openai/hosting.template.json` intentionally contains no project ID.
4. Run `FYLOGIA_BASE_PATH=/ npm run build`. Validate using `FYLOGIA_BASE_PATH=/ npm test`. Keep the `/` base for the Sites origin.
5. Use the documented Sites source helper to push the exact validated source to the service-confirmed source branch and package it. Supply credentials only through the helper's hidden stdin, never command arguments or committed files. Do not redirect to a company account.
6. Pass the verified commit SHA and unchanged deployment archive to `save_site_version`. Read the Site's access state; if public access is supported, use `update_site_access` with `access_mode: "public"`, then `deploy_site_version` for the saved version. Poll its deployment ID to a terminal success result.
7. Test the actual public HTTPS origin with no signed-in session, inspect the service-worker scope and root asset paths, download a real permitted article, disable network access and repeat the offline reading checks. Only then report a public Sites URL as working.

No DNS purchase or domain registration is needed. Local storage is origin-specific: the old GitHub Pages library does not automatically transfer to a new Sites origin. Import the JSON library backup and re-download offline assets there. Sites feed freshness also needs a supported redeployment/scheduling mechanism; the current GitHub Actions refresh does not automatically update a Sites deployment, and no cross-service sync is claimed.

## FYLOGIA availability screening — 29 October 2026

- `fylogia.com`: Verisign registry RDAP returned HTTP 404; no registered domain record found. [Registry query](https://rdap.verisign.com/com/v1/domain/fylogia.com).
- `fylogia.app`: Google Registry RDAP returned HTTP 404 with “fylogia.app not found”. [Registry query](https://pubapi.registry.google/rdap/domain/fylogia.app). Both appear unregistered; registrability, premium/reserved status and price remain unverified until a registrar checks. Nothing was purchased or reserved.
- Personal repository: `Zainhomeautomation/Fylogia` returned 404 before rename; GitHub public repository-name search returned zero results. The existing repository was renamed in place, preserving repository ID 1438014070.
- [USPTO](https://tmsearch.uspto.gov/): Wordmark searches FYLOGIA, FILOGIA, PHYLOGIA and prefix FYLOG* returned “No results found”, with live and dead statuses included and no class restriction.
- [TMview](https://www.tmdn.org/tmview/): Contains searches FYLOGIA, FILOGIA and PHYLOGIA returned no rows. No software, news or publishing trademark record was identified in the completed searches. TMview is an aggregator, not a legal clearance certificate.
- WIPO direct search was blocked by an automated challenge and was not completed. Oman and other national registers were not comprehensively cleared. A worldwide phonetic/translation/logo and unregistered-rights review has not been performed.
- Apple US Search API for FYLOGIA returned four unrelated fuzzy results and no exact app name. [Apple search](https://itunes.apple.com/search?term=fylogia&entity=software&limit=25&country=us). [Google Play US search](https://play.google.com/store/search?q=fylogia&c=apps&hl=en&gl=US) displayed “No results for fylogia”. Other storefronts and developer-console name reservation are unverified.
- Similar-name web results: FILOGIA, a French agricultural/nutrition-products business ([public business record](https://entreprises.lefigaro.fr/filogia-49/entreprise-847919685)); a historical biotech reference to Phylogia ([2012 report](https://www.businessnews.com.au/article/Phylogia-licences-technology-to-Janssen-Biotech)). Neither establishes a software/news/publishing conflict; current rights and any legal likelihood of confusion are unverified.

Assessment: no significant conflict identified in this preliminary screening. The code/repository rename is authorized by the owner’s conditional instruction; domain purchase and public deployment still require their approval of these results.
