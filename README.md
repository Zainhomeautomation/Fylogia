# Fylogia

A free, open-source personal news and magazine reader. No account, ads, paid subscription, or API key required.

Production target: **https://fylogia.com/**, deployed from the personal [Zainhomeautomation/Fylogia](https://github.com/Zainhomeautomation/Fylogia) repository through Cloudflare Pages GitHub integration. The owner authorized publication on 29 October 2026. The earlier naming screen remains a cautionary record, not legal clearance.

## Features

- Three-step onboarding: 21 interests, subtopics, regions, recommended sources and custom RSS/Atom feeds.
- Real publisher content from 194 curated feeds, refreshed every four hours by GitHub Actions. The app checks for a newer deployed edition every 15 minutes and on Refresh.
- Editorial home, Explore, Categories, source management, saved articles, magazines, history and settings.
- Single-page article reading on small screens, two-column spreads on wide screens, swipes, keyboard/page controls, text-size adjustment and optional continuous scrolling. Pagination responds to resizing, rotation and folding.
- Eight sources support permitted full text when their feed supplies a qualifying article body; other publishers receive conservative, attributed previews and original links. No article-page scraping or paywall bypass.
- Original NASA Spinoff 2025 PDF with PDF.js page rendering, page turns, spreads and bookmarks. Imported PDFs stay in IndexedDB on your device (50 MB per file).
- Midnight Navy, Editorial Green, Light and System themes; installable PWA with a cached shell, IndexedDB downloads, and a separate Cache Storage image library. Download individual articles, select several, or use Download Daily Edition (up to 30 stories from the current For You selection). Offline Library shows text/image availability, reading progress, storage use, refresh and delete controls.
- Automatic anonymous local profiles; preferences, source selections, saved stories and progress persist with IndexedDB and legacy browser storage. JSON transfer/recovery and optional password-encrypted backups. No automatic cloud synchronization.
- Summarize uses supported browsers' on-device Summarizer API. Otherwise extracted key passages are explicitly labeled as not an AI summary.

## Local setup

Use Node 24 LTS and npm. Ingestion uses Node's native TypeScript support.

```sh
npm ci
npm run feeds
npm run magazines
npm run dev
```

Open the printed root URL.

```sh
npm run build
npm run preview
npx playwright install chromium webkit
npm test
```

Tests cover Chromium desktop, WebKit iPhone/iPad, onboarding, saved stories, history, themes, search, regions, source selection, pagination, live resizing, scrolling, summaries, the real PDF reader, manifest, service worker and offline saved reading.

## Deployment

Use the existing Cloudflare account that owns fylogia.com. Connect only **Zainhomeautomation/Fylogia** using Pages' **Import an existing Git repository** workflow. Keep production branch **main**, build command **npm run build:pages**, output directory **dist**, repository root unchanged and **NODE_VERSION=24**. `.node-version` also specifies 24. No Cloudflare token or other private credential belongs in source or frontend environment variables. Pages automatically deploys future main pushes; disable preview branch builds to conserve the free allowance.

Add `fylogia.com` in the Pages project's Custom domains, allowing Pages to create only its required apex DNS record. Configure a domain-specific Cloudflare redirect from `www.fylogia.com` to `https://fylogia.com`, preserving path and query. Keep HTTPS enabled. Do not alter unrelated zones, records, applications or account settings. Verify the public page, deep links, certificate and `build-info.json` commit after deployment. This repository does not provision DNS or store account credentials.

`npm run build:pages` uses the committed real-news dataset, generates the production app/service worker and checks the 25 MiB asset limit. The original NASA magazine exceeds that limit, so its fixed URL is served by one streaming Pages Function with HTTP range support; no arbitrary proxy target, uploaded document, credential forwarding or paid storage is used. `_routes.json` limits function invocations to that PDF. All other content is static; Pages' default SPA fallback handles section URLs. Do not add a top-level `404.html` without preserving SPA routing. `_headers` revalidates the manifest/service worker/news and caches versioned assets. No credentials or external backend are required for private local libraries.

GitHub Actions validates main pushes and pull requests. A separate scheduled job refreshes publisher feeds every four hours and commits only `public/data/edition.json`, triggering Pages through its GitHub integration. This uses at most 186 of the free plan's 500 monthly builds, leaving room for code updates. Schedules can be delayed or disabled after inactivity; failed sources retain previous entries with visible timestamps. The app checks the deployed dataset every 15 minutes and on reconnection/Refresh. Refresh does not start a cloud build. The NASA PDF endpoint shares Cloudflare Workers Free request/CPU quotas; publisher or quota outages leave article reading and imported PDFs functional.

The original offline, branding and local-profile branches are integrated by fast-forward, preserving their commits. Legacy browser-storage keys (`folio.v1.*`), PDF database (`folio-magazines`), offline database (`fyllora-offline`), image cache (`fyllora-offline-images-v1`) and download index intentionally retain their compatibility names. The production base, manifest identity, scope and service worker default to `/`. An explicit `FYLOGIA_BASE_PATH=/Fylogia/` still supports legacy subpath builds. `FYLOGIA_TEST_URL` targets an existing build; `FYLOGIA_SCREENSHOTS` chooses an absolute screenshot directory.

Browser libraries belong to an origin. A GitHub Pages library cannot automatically move to fylogia.com: export/import its library backup in Settings, then re-download articles/images and re-import private PDFs on the new origin. No data is publicly uploaded or silently discarded.

Local Pages runtime verification:

```sh
npm run build:pages
npx wrangler pages dev dist --port 8788
FYLOGIA_TEST_URL=http://127.0.0.1:8788/ npm test
```

## Production verification — 29 October 2026

The application is publicly available without registration at **https://fylogia.com/** through the `fylogia` Cloudflare Pages project. Both the personal repository integration and automatic production deployments use `main`; non-production branch builds are disabled. The domain-specific `Fylogia www to HTTPS apex` 301 rule preserves paths and query strings. Only the requested apex/www DNS records and this site's settings were configured.

Validation passed: all **54 Playwright tests** in the local Cloudflare Pages runtime, all **54 against the public fylogia.com origin**, three server tests, production build/asset validation, formatting and lint (three existing non-blocking React warnings). GitHub CI also passed. Tests cover desktop Chromium and WebKit iPhone/iPad viewports, folded/unfolded resizing, real publisher images/PDFs, saved articles, preferences, offline startup/deep links, single/bulk/Daily Edition downloads, page turns, bookmarks/progress, storage failure/eviction and reconnection. The latest feed refresh returned **24/24 healthy sources**.

**Physical-device testing: NOT RUN.** Browser emulation does not certify an iPhone Duo, iPhone or iPad in actual Airplane Mode, physical Home Screen installation, device hinges or real iOS storage pressure. On iOS, open the HTTPS site in Safari, use Share → Add to Home Screen, launch online once, download an edition and verify Offline Library before travel. Browser storage may be evicted; keep a library backup. Automatic cross-device synchronization is not enabled. Publisher permissions continue to determine full text, previews and offline images.

## Custom feeds

Add a public HTTPS RSS/Atom URL in My Sources. Direct browser access requires publisher CORS permission. You can opt into the free [rss2json](https://rss2json.com/docs) converter; the feed URL is then shared with that third party, and service quotas/availability apply. Never add private or credential-bearing URLs. An RSS/Atom file import also works without the converter. Custom sources refresh at startup or after source/converter changes and are stored locally.

## Architecture

React, TypeScript, Vite, Lucide icons, DOMPurify, fast-xml-parser and lazy-loaded PDF.js.

- `src/catalog.ts`: shared source/category definitions and types.
- `scripts/refresh-feeds.mjs`: bounded concurrent feed ingestion, timeouts, timestamps, original images, source health.
- `src/Reader.tsx`: CSS multi-column pagination measured by ResizeObserver; sanitized publisher HTML.
- `src/PdfReader.tsx`: original PDF pages rendered on canvas.
- `src/storage.ts` and `src/local-library.ts`: reactive library state, anonymous device identity, IndexedDB persistence, legacy-storage migration/recovery and visible save failures.
- `src/library-data.ts` and `src/library-backup.ts`: validated, transactional restore and optional AES-GCM encrypted recovery files.
- `scripts/write-sw.mjs`: versioned app-shell cache and network-first edition refresh; excludes large online PDFs.

The main bundle is about 126 KB gzipped. PDF code/worker are loaded only when opening a magazine. No analytics or server database. Google Fonts and publisher image CDNs receive normal network metadata; images send no referrer. Browser storage is not an encrypted cloud backup. Clearing browser data removes the local library.

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

## Earlier Sites investigation

Sites publication was not completed because the available integration required its own assigned source repository, conflicting with the personal-repository-only constraint. The owner subsequently selected Cloudflare Pages. No Sites deployment or duplicate source repository is required. The old `.openai` compatibility template remains historical and contains no credentials or invented project ID.

## FYLOGIA availability screening — 29 October 2026

- `fylogia.com`: the earlier Verisign registry query returned HTTP 404, but a later check confirmed registration at 2026-10-29 07:33:40 UTC. Ownership was not established; the agent did not register or purchase it. [Registry query](https://rdap.verisign.com/com/v1/domain/fylogia.com).
- `fylogia.app`: Google Registry RDAP returned HTTP 404 with “fylogia.app not found”. [Registry query](https://pubapi.registry.google/rdap/domain/fylogia.app). The `.app` result is a point-in-time observation; registrability, premium/reserved status and price remain unverified until a registrar checks. The `.com` is now registered as noted above. Nothing was purchased or reserved by the agent.
- Personal repository: `Zainhomeautomation/Fylogia` returned 404 before rename; GitHub public repository-name search returned zero results. The existing repository was renamed in place, preserving repository ID 1438014070.
- [USPTO](https://tmsearch.uspto.gov/): Wordmark searches FYLOGIA, FILOGIA, PHYLOGIA and prefix FYLOG* returned “No results found”, with live and dead statuses included and no class restriction.
- [TMview](https://www.tmdn.org/tmview/): Contains searches FYLOGIA, FILOGIA and PHYLOGIA returned no rows. No software, news or publishing trademark record was identified in the completed searches. TMview is an aggregator, not a legal clearance certificate.
- The initial WIPO attempt was blocked by an automated challenge. Subsequent broader screening completed the exact search and reviewed fuzzy/phonetic matches. It confirmed [PHILOZIA, France 5151558](https://data.inpi.fr/marques/FR5151558), including electronic books/periodicals in class 41 and software development in 42, and [Advokatfirman FYLGIA, Sweden 537532](https://www.tmdn.org/tmview/#/tmview/detail/SE500000201606120), including software and online publishing. These material review flags supersede the preliminary no-significant-conflict assessment. Oman national-register clearance remains incomplete; a worldwide phonetic/translation/logo and unregistered-rights review has not been completed.
- Apple US Search API for FYLOGIA returned four unrelated fuzzy results and no exact app name. [Apple search](https://itunes.apple.com/search?term=fylogia&entity=software&limit=25&country=us). [Google Play US search](https://play.google.com/store/search?q=fylogia&c=apps&hl=en&gl=US) displayed “No results for fylogia”. Other storefronts and developer-console name reservation are unverified.
- Similar-name web results: FILOGIA, a French agricultural/nutrition-products business ([public business record](https://entreprises.lefigaro.fr/filogia-49/entreprise-847919685)); a historical biotech reference to Phylogia ([2012 report](https://www.businessnews.com.au/article/Phylogia-licences-technology-to-Janssen-Biotech)). Neither establishes a software/news/publishing conflict; current rights and any legal likelihood of confusion are unverified.

Assessment after the expanded screening: CAUTION. Obtain targeted professional review of the similar publishing/software marks and an Oman national search before adopting the brand publicly. The owner subsequently registered the domain and authorized Cloudflare Pages publication. This does not replace professional trademark advice.

## Anonymous local profiles and recovery (implemented)

The MVP follows the explicitly authorized local-first fallback for optional synchronization. No connected Supabase project, backend configuration or account suitable for secure device pairing is available in this workspace. Creating a secure service would add anonymous authentication, database policies, private membership, pairing/recovery functions and abuse controls. These are a separate development phase; no fake pairing buttons, shared bearer URLs, public library table or unverified backend is shipped.

Every browser creates a cryptographically random local profile automatically, including existing installations migrated from the Folio keys. No email, password, registration or network call is needed for that identity. The ID is a local identifier, **not** a cloud authentication credential or recovery secret. Opening another browser creates a separate identity. Importing a library does not clone the source device's identity.

`folio-personal-library` is an IndexedDB database with one `records` store. Preferences, followed/custom sources, bookmarks/saved articles, history and reading progress are saved as versioned records. Existing `folio.v1.*` keys are retained as a synchronous secondary copy. The app restores a missing/corrupt primary copy from valid IndexedDB data before onboarding renders. A storage event updates other tabs on the same browser origin; this is not cross-device cloud synchronization or a conflict-resolution protocol. The Settings save status waits for the attempted writes and shows when changes exist only in the current tab. The two local stores share the browser's origin and eviction policy: this redundancy cannot survive complete browser-data deletion or iOS origin eviction.

Recovery steps:

1. In Settings, choose **Export library** for a readable JSON copy. That file contains private library data; keep it private.
2. For an encrypted file, enter a password of at least 12 characters in **Backup password**, then choose **Export encrypted backup**. The optional password protects this backup only; it is not an account or sign-in requirement. Keep it separately. Lost passwords cannot be reset.
3. On a new device, complete the short onboarding and open Settings. Enter the backup password if the file is encrypted, then choose **Import library**. Restore replaces the five library sections together only after schema validation and a successful IndexedDB transaction. A wrong password, tampered file, invalid section or failed transaction leaves the current library unchanged. Restore requires writable IndexedDB; ordinary online reading can still use localStorage if IndexedDB is unavailable.
4. Re-download offline articles/images and separately re-import PDFs on the destination device. Recovery exports do not contain image/PDF binaries or cloud credentials. There is no automatic merge or ongoing synchronization after file transfer.

Encrypted recovery uses browser Web Crypto: AES-256-GCM with a fresh 96-bit IV, a fresh 128-bit salt, authenticated format/version context and PBKDF2-HMAC-SHA-256 with 600,000 iterations. Passwords remain in memory only, clear after successful use or leaving Settings, and never enter localStorage, IndexedDB, URLs or server requests. Local browser databases themselves are not application-encrypted. Import/export is bounded at 10 MB, and untrusted URLs, shapes and progress values are validated before any replacement. External article HTML continues to be sanitized by the reader.

## Optional cross-device synchronization — next phase (not enabled)

Supabase is a candidate, rather than a configured dependency. Its documented [anonymous authentication](https://supabase.com/docs/guides/auth/auth-anonymous) supports no-email identities, but still requires durable sessions and abuse prevention. An anonymous Auth user is distinct from the public `anon` API role. Private libraries must use [row-level security and restricted grants](https://supabase.com/docs/guides/database/postgres/row-level-security). Public/publishable configuration is not a substitute for per-device authorization; secret/service-role keys must never be shipped in the PWA.

A concrete implementation must provide:

- **Opt-in cloud use:** continue creating local profiles for everyone; create an anonymous Supabase Auth identity for a device only when cloud sync is enabled. The free/local app must work if the service sleeps, reaches quota, loses authorization or is removed. Verify a personal project and current free-tier limits before provisioning; do not enable paid infrastructure.
- **Private membership:** separate `libraries`, `devices/memberships` and versioned library records. Use each device's own Auth identity and revocable membership checks on every read/write, including Realtime authorization. Deny public access and cross-library reads/writes by default. Do not make libraries accessible merely by knowing a random ID, and do not store membership authority in user-editable Auth metadata.
- **Short-lived pairing:** server-generated high-entropy QR invitations or at least 12 random Base32 characters for manual codes; store only a hash, expire within five minutes, bind to a proposed destination device and consume atomically once. Rate-limit guesses by device and IP, cap attempts, use generic errors, and require approval on an existing device with a matching confirmation phrase. Submit codes in request bodies; never include permanent device tokens or recovery secrets in shareable URLs or analytics. Codes must not directly confer membership before approval. Handle replay and simultaneous redemption.
- **Device unlinking:** let an authorized device list and revoke linked devices; revoke server membership and pending invitations immediately and reject queued writes from revoked devices even while their old JWT is unexpired. Remove that device's cloud session when it learns it was revoked. Unlinking cannot remotely erase already-downloaded offline material; local deletion is separate. A revoked device must not silently rejoin via an old invitation or queued operation.
- **Recovery without email:** offer a high-entropy offline recovery kit, store only a server-side verifier, protect recovery attempts with rate limits, and rotate recovery/pairing authority after use. Explain that losing every linked device and the recovery kit makes the anonymous cloud library unrecoverable. A local profile ID or a plain exported library must never authorize cloud-account recovery. Do not copy long-lived access/refresh tokens between devices.
- **Offline conflict handling:** a local outbox, idempotent operation IDs, optimistic server revisions and per-field preference updates. Bookmarks/source removals need tombstones so old offline devices do not resurrect deletions. Reading progress needs an explicit latest-intent rule, including intentional resets, rather than always taking the maximum. Test reconnect/retry/backoff and concurrent edits before choosing the final merge policy. Avoid relying solely on client wall clocks. Ordinary recovery import remains a replacement action, not a hidden cloud merge.
- **Local offline assets:** synchronize library metadata and only content legally permitted for cloud storage. Images, PDFs and downloaded article bodies remain independent per device by default; do not upload publisher material or credentials from custom-feed URLs. Keep private API responses out of public service-worker caches. Existing article reading must never wait for cloud availability.
- **Release evidence:** tests with unrelated users/devices proving library isolation through direct REST and Realtime access; pair expiry/replay/brute-force/dual-redemption tests; revocation with an existing JWT and pending offline writes; recovery rotation; concurrent deletion/edit/progress tests; offline startup without the backend; and free-tier quota/failure behavior. Only then expose pairing and claim cross-device synchronization works.

Cloud synchronization remains a documented future phase; local reading, offline downloads and encrypted recovery work independently of any cloud identity service.

## Premium reader upgrade

The existing column layout now supplies text pagination beneath a shared, dependency-free 3D paper-turn animation in both article and PDF readers. Facing pages turn around the central gutter; narrow screens turn from the edge. Horizontal swipes ignore predominantly vertical gestures, keyboard controls remain available, and reduced motion disables the animation. Continuous article scrolling remains available. Article reflow tracks a visible text range while existing persisted progress ratios stay compatible with old libraries and exports. PDF page numbers survive viewport changes. This is a lightweight paper rotation with shading, not a physically simulated deformable curl.

Facing article pages require at least 680 CSS pixels of reader width, increased for larger text; PDF spreads require 740 viewport pixels. Layout uses viewport dimensions, existing dynamic viewport height and safe-area padding, without device identification. Physical foldable/iOS installation and Airplane Mode testing still require real devices; automated Chromium and WebKit tests simulate resizing and network loss.

Full-content coverage is intentionally permission-limited. The catalog adds [NASA Science RSS](https://science.nasa.gov/feed/) alongside NASA. NASA's [media usage policy](https://www.nasa.gov/nasa-brand-center/images-and-media/) and [Science reuse FAQ](https://science.nasa.gov/earth/faq/) allow informational reuse of agency material, subject to attribution and third-party exceptions. Only allowlisted sources with an actual RSS/Atom content body enter the full-article pipeline; descriptions never become full articles. Existing extraction preserves publisher prose, headings and credited figures, and does not fetch article pages, bypass paywalls or generate missing text. Full articles receive a modest recommendation boost without replacing selected interests. Custom feeds remain conservative previews. NASA Science images are not automatically eligible for offline image storage; existing image permission restrictions remain intact.

At the upgrade's feed refresh, 25/25 feeds were reachable: 387 articles, 14 full-content articles from two NASA sources and 373 previews. These counts vary with subsequent scheduled refreshes. The other 23 sources do not have verified full-content republication permission in this catalog. The original article link remains available in every reader.

## Editorial reading refinement

The cover now pairs a prominent photograph with an editorial headline, followed by an open two-column story layout. Daily Edition downloads retain their existing behavior. Every story identifies full in-app text or a publisher preview. Previews use a narrow single-page layout; full articles continue using responsive facing pages. Both readers offer an immersive control that hides secondary tools without invoking browser fullscreen or changing preferences. All legacy storage keys, downloads, backups and production deployment settings remain unchanged.

Main Settings keeps appearance, reading, interests, offline use and library management visible. Expand **Advanced settings** for encrypted backup controls, storage eviction details and technical content explanations. Ordinary import/export remain on the main screen; enter an encrypted backup's password under Advanced settings before importing it.

[Global Voices RSS](https://globalvoices.org/feed/) adds licensed world-news text under its [republishing guidelines](https://globalvoices.org/about/global-voices-attribution-policy/) and CC BY 3.0. Each full item retains its byline, original-story link and license link at the beginning. Formatting changes and media omissions are disclosed. Third-party images and embeds are excluded, and items with missing bylines or explicit republication exceptions remain previews. No article pages are scraped. The original 26-feed implementation snapshot is retained in the content review; current coverage and health are documented in the [organized interests release notes](docs/organized-interests.md).

Browser QA covers preview layout, immersive controls, Advanced settings, text anchors through folding, page turns, reduced motion and all existing offline/storage flows in Chromium and WebKit. Viewport simulation does not certify a physical foldable device or iOS Home Screen installation.

## Curl gestures and discovery

Both existing readers now use a transient curved paper surface for page turns. The animation copies the outgoing article/PDF surface into twelve adjoining projected strips, with paper-back shading and corner lift. It runs only during a turn; temporary layers, canvases and animation frames are removed on completion, cancellation, resize or reader exit. Reduced-motion users get immediate navigation without the curl. This is a lightweight visual approximation, not a physical paper simulation; mobile Safari performance and feel still need physical-device evaluation.

The inset corner buttons support dragging, tap-to-turn and keyboard activation. Short drags return the page; longer drags commit a turn. Existing swipe, footer, arrow-key and Back/Home controls remain available. A short guide and three-cycle corner hint appear on first multi-page use. Completing a corner turn or choosing Got it stores `fylogia.page-turn-tutorial.v1`; no existing library keys are changed. Single-page previews and scrolling mode have no corner controls. Daily Edition articles use the same article reader, including downloaded copies.

[StPageFlip](https://github.com/Nodlik/StPageFlip) was evaluated, including version 2.0.7's HTML page model and render lifecycle. It would require a separate page collection, and its perpetual render loop does not fit this transient animation design. No dependency was retained. Page pagination, text anchors and offline storage continue to use Fylogia's existing implementations.

## Full article experience and feed review

The [26-source content review](docs/feed-content-review.md) records real feed-body availability and permission boundaries. MIT News syndication and Home Assistant's noncommercial share-alike text join NASA and Global Voices. Attribution and applicable license/reprint notices travel inside downloaded article bodies. Optional content metadata survives plain/encrypted export and IndexedDB recovery; old articles without it remain valid. Older saved/downloaded previews are retained until the user replaces their offline copy.

Use **Full articles only** while browsing to find articles available inside Fylogia. Source settings report the number of full texts from the latest refresh. Full articles show estimated reading time and support immersive pagination, headings, lists, code and tables. Preview stories explain the limit and link directly to the publisher near the headline. Feed bodies alone do not establish permission: unverified publishers remain previews, and no article-page scraping or paywall bypass is used.

The MIT license covers Fylogia's application code. Publisher article text, photographs and other third-party materials retain their own rights and licenses; they are not relicensed under the application's MIT license.

PDF decoding assets are packaged from the installed pdf.js version under a versioned local URL and included in the PWA cache, so JPEG2000/JBIG2 images do not depend on a missing decoder or external CDN. Their upstream licenses are retained. Curl layers also have a bounded cleanup deadline and cancel on lost pointer capture, including when WebKit temporarily suspends animation frames.

## Final appearance and curl direction

Appearance offers Midnight Navy (`#0A1018`), Editorial Green, Light and System. New profiles default to Navy, with lighter navy surfaces, cream text and sage accents. Existing stored `dark` preferences remain Editorial Green, and old light/system values remain valid. System resolves to Navy for a dark device appearance and Light otherwise. Appearance metadata and installation colors follow the Navy default; the app restores the user's selected appearance after launch.

Dragging now reveals the destination article columns or an asynchronously rendered next PDF page underneath the outgoing paper. PDF preview rendering is abortable and capped to a viewport-sized pixel budget; cancelled drags leave the current page and progress intact. The guide still uses its existing completion key, so returning users are not retrained.

**Curl fidelity limitation:** the renderer is a twelve-strip projected curve approximation with shaded paper backs and corner lift. It is not a physically deformable paper simulation, and should not be presented as equivalent to a high-fidelity physical page curl. StPageFlip's separate page collection and render lifecycle were evaluated previously; no new library is retained. Physical mobile-Safari performance and feel remain unverified. Reduced-motion mode keeps immediate accessible navigation.

## Expanded source directory

The [initial source validation report](docs/source-catalog.md) records source URLs, categories, freshness, permission evidence and measured refresh results. My Sources now supports search, region/topic/content filters, recommended/followed views and incremental browsing. Recommendations favor relevant permitted full text, while retaining existing follows. Nine source policies support qualifying full articles; the remainder are previews. Source capability does not mean every item qualifies. Automatic refresh uses conditional requests, bounded concurrency and retained last-known stories on outages; no paid infrastructure or article-page scraping is introduced.

## Full-article reading refinement

The [reading release report](docs/full-article-release.md) includes the refreshed baseline 26-feed review and permission boundaries. Preview readers show a clear Continue Reading action without technical licensing messages. NASA figure/caption extraction and Science CDATA handling preserve more permitted content. Every edition item carries internal retrieval diagnostics; an unverified content field is never promoted to authorized full text. Existing offline records remain compatible. Paginated media scales to the viewport; scrolling progress now survives reopening and reading-mode changes. Original publisher pages open through the browser because no eligible, explicitly permitted embedded-original integration was established.

### Original PDF reading and editorial images

PDFs fit the available width and height, use readable portrait spreads, and retain original landscape spreads. Zoom buttons, double-tap/double-click and two-finger pinch support closer reading; zoomed sheets pan inside the reader. Pinch movement transforms the existing canvas and renders at final resolution on release. Rendering is bounded for mobile memory. Automatic PDF progress is keyed by magazine ID independently of legacy bookmarks, so identical filenames do not share progress.

The library displays the actual NASA publication cover and generates private PDF covers locally, including for existing imports when opened. Bundled covers remain available offline. Article figures preserve aspect ratio, and feed processing selects safe, larger publisher-provided media/srcset images without guessing CDN URLs or changing permission policies. See [PDF and media details](docs/pdf-and-media-reading.md) for source attribution, limits and test coverage.

### Organized specialist interests

The source catalog has 194 validated feeds and nine full-text-capable policies. Search grouped interests for computing/operating systems, architecture, engineering/construction, history/culture and marine topics. Recommendations balance interests and match topics without changing existing follows. Saved/history cards gain relevant category labels in memory while stored data remains intact. See [current coverage, publisher permission boundaries and validation](docs/organized-interests.md).
