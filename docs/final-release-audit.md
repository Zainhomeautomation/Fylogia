# Fylogia release audit — 30 October 2026

Release candidate: final validation and publication pending. This audit follows the deployed and verified source, Daily Magazine, sync and performance milestones; no separate visual redesign was performed. The final repository/production synchronization check is reserved for the end.

## Feature verification matrix

| Area | Status | Evidence / limits |
|---|---|---|
| First launch, interests/subtopics, regions, recommendations | PASS | Browser onboarding and existing-interest regression journeys |
| Searchable directory, follow/unfollow, custom RSS/Atom files | PASS WITH LIMITATIONS | Direct remote custom feeds require publisher CORS; optional converter shares the public feed URL with its provider |
| Existing preferences, source IDs, saves and history | PASS | Legacy v1 keys retained; IndexedDB recovery, quota failures and transactional imports tested |
| Authorized complete articles | PASS WITH LIMITATIONS | Nine policy-qualified sources; content fields alone never grant permission; previews remain elsewhere |
| Attribution, headings, permitted figures and captions | PASS | Sanitization/extraction and pagination regressions; explicitly copyrighted NASA third-party figures omitted |
| Preview presentation and original links | PASS | Honest compact preview, prominent Continue Reading; no paywall bypass or invented text |
| Original publisher inside an embedded frame | NOT IMPLEMENTED | No reviewed source established both embedding permission and compatible frame policy; original opens separately |
| Article pagination / no missing paragraphs | PASS | Full text, figures, font changes, resizing, scrolling and reopen regressions |
| Page curl, drag, partial cancellation, tap/swipe, tutorial | PASS WITH LIMITATIONS | Actual page-content twelve-strip cylindrical approximation, not continuous physical-paper simulation; reduced motion and one-page hint suppression tested |
| Single page / facing pages / folded–unfolded resize | PASS WITH LIMITATIONS | Viewport-based geometry, text anchors and simulated touch; no physical hinge or iPhone Duo test |
| Today's Fylogia / continuous stories / issue progress | PASS | Deterministic real stories, cover, contents, sections, story progression and retained issues |
| Back, Home, section/search/filter and scroll return | PASS | Article/PDF/Daily controls and direct/browser-back navigation regressions |
| Single/bulk/Daily offline article downloads | PASS | IndexedDB, permitted real opaque images, network-disabled relaunch, page turns and reconnect tested locally and on production |
| Offline Library, deletion, eviction/quota handling | PASS WITH LIMITATIONS | No bookmark reset; browsers can evict an entire origin, which an app cannot prevent |
| PDF rendering, fit, zoom, separate document positions | PASS | Real NASA PDF plus private imports; bounded canvases, page controls and bookmarks |
| Offline PDF magazines | PASS WITH LIMITATIONS | Imported PDFs up to 50 MB; larger public NASA edition is streamed online and is not automatically stored offline |
| PWA manifest, shell, installation support and worker upgrade | PASS WITH LIMITATIONS | Correct HTTPS/root metadata; actual old-to-new worker upgrade tested in isolated Chromium/WebKit origins; physical iOS Home Screen installation NOT RUN |
| Four appearance modes, startup and legacy Green | PASS | Navy default, Green/Light/System, saved-theme pre-JavaScript and theme switching regressions |
| Anonymous local profile / optional cloud linking | PASS | No mandatory email/password; private profile ownership enforced server-side |
| QR/manual pairing, approval, expiry and one-time proof | PASS WITH LIMITATIONS | Actual independent-browser flow; native macOS Vision decoded QR; physical camera scan NOT RUN |
| Sync queues, retries, conflict handling, device revocation | PASS | Metadata whitelist, tombstones, cross-tab writer/provenance and offline/lost-response tests |
| Recovery, export, cloud deletion | PASS | Two-phase key acknowledgement, idempotent confirmation, encrypted backup and local-copy retention |
| Cloud privacy | PASS WITH LIMITATIONS | No publisher bodies/images/PDF uploads; access-controlled metadata, not end-to-end encryption; free-tier budgets can pause updates |
| Optional summaries | PASS WITH LIMITATIONS | Browser on-device API where supported; otherwise explicitly non-AI extracted passages |
| iOS/iPadOS Simulator / physical devices | BLOCKED | Full Xcode/runtimes and device tools absent; no USB iPhone/iPad found; wireless availability unverified |
| Native macOS Safari | PASS WITH LIMITATIONS | Earlier isolated-origin partial UI checks; current UI connection unavailable; WebDriver permission disabled |

## Findings fixed during final audit

- A NASA agency article carried an explicitly copyrighted external-museum photograph. Ingestion now omits that figure and lead image, preserving agency prose and other permitted figures. Display-time protection also covers old saved/downloaded records without modifying their stored library data. The initial rights-only edit changed only that article's content/image, with all unrelated records and feed timestamps unchanged. A subsequent full feed refresh updated the edition normally.
- Added a build-generated Content Security Policy with exact startup-script hashes, no inline script/event-handler allowance, and required PDF/worker/blob/font allowances. Source-defined images and custom HTTPS feed requests remain usable. HTML is sanitized before storage and again in the reader.
- Corrected outdated README claims about Google Fonts, database absence, public-PDF offline support, bundle size and historical test counts.
- Profiling now excludes buffered interactions that began before the measurement window, rather than counting the initial reader-opening click as a page turn.

## Content and media

The source policies and original 26-feed investigation remain in [full-article release](full-article-release.md), [source directory](source-catalog.md) and [permission evidence](feed-content-review.md). Publisher text/image licenses remain separate from the application's MIT license. A source's full-text label means qualifying entries, not every post.

[NASA media guidance](https://www.nasa.gov/nasa-brand-center/images-and-media/) permits factual informational use with acknowledgement and excludes third-party copyrighted material from that general permission. [STScI's content-use policy](https://www.stsci.edu/copyright) and [ESA/Hubble's policy](https://esahubble.org/copyright/) provide further attribution conditions for their material. No blanket permission for other publishers' photographs is assumed. Original image bytes are not recompressed; high-resolution URLs are selected only from publisher-supplied alternatives. External image availability and resolution can vary.

The 30 October 2026 04:32 UTC refresh checked all 194 configured sources: **188 healthy (96.91%)**, six transient fetch failures retaining previous entries (InsideEVs, View from the Wing, Nintendo Life, Yahoo Sports, Bike EXIF, Sailing World). Nine source policies support qualifying full text and 185 are preview-only. The edition contains **1,728 articles: 88 full and 1,640 previews**, with 1,320 image URLs. Thirty-one duplicate entries were merged into 26 combined stories. Freshness and availability are separate: a failed fetch can retain a recently published story, with its earlier success timestamp. Scheduled GitHub refreshes are best-effort; the last observed scheduled run succeeded, and this manual audit refresh verifies current feed health. No guaranteed four-hour publication SLA is claimed.

## Security and privacy

`npm audit` reported zero known vulnerabilities across production and development dependencies at audit time; this is not a guarantee against undisclosed flaws. The private API requires same-origin JSON POSTs, authenticated host-only HttpOnly/Secure/SameSite cookies, profile ownership checks, bounded requests and parameterized SQL. Preview hosts have no production database access. Pairing codes expire after five minutes and require a separate pending proof plus approval; permanent credentials never enter QR URLs. Recovery revokes old credentials only after explicit acknowledgement of the replacement key.

Library metadata projection excludes article bodies, excerpts, images, private PDF files and signed/private feed definitions. Local libraries and downloads remain independent of cloud availability. Recovery/revocation cannot remotely erase a copy already kept on a disconnected device. The operator and Cloudflare can access stored metadata; no end-to-end-encryption claim is made.

A redacted scan covered 511 text blobs in the locally available repository history. Four remaining pattern matches were manually classified as ordinary historical public-news URL slugs about Justice SK Kaul, not credentials. No credential finding was confirmed. Standard format-pattern scans do not prove the absence of every possible secret. Scoped account credentials remain outside the repository and frontend.

## Accessibility and Apple environments

Axe-core 4.14.0 found zero WCAG A/AA violations in 20 combinations: four themes across Home, My Sources, Settings, Saved and the article reader. Some image/contrast cases require manual judgment; automated scans are not full accessibility certification. Browser regression coverage includes keyboard/Escape, focus isolation/return, reduced motion, touch targets and text resizing. VoiceOver and physical iOS assistive-technology testing were not performed.

[Apple platform evidence and enabling requirements](apple-platform-testing.md) distinguish native desktop checks, native QR decoding, missing simulators/tools, and simulated WebKit viewport testing. No physical iPhone Duo, iPhone, or iPad result is claimed.

## Performance

The deployed pre-audit milestone measured Lighthouse 13.6.0 mobile cold personalized Home at Performance 97, Accessibility 100, Best Practices 100 and SEO 92: LCP 2.572 s, CLS 0.000004, TBT 36 ms. The earlier equivalent production baseline was LCP 6.333 s. These are lab samples on this Mac, not field percentiles; LCP still marginally misses the 2.5 s target. TBT is not INP. Field INP is unavailable; six-turn browser Event Timing and rAF samples are recorded separately. The 60 FPS aim is not a guarantee on physical mobile hardware.

Initial JavaScript is approximately 132 KB gzipped, with lazy XML parsing, QR UI and PDF execution. Offline installation also precaches PDF code/codecs and the complete authorized edition, so background transfer exceeds the initial JavaScript alone. No page-turn animation loop runs while idle; temporary mesh layers are removed, and PDF raster backing is bounded to the visible surface. See [reproducible profiling](reading-performance.md).

## Release decision

Pending final checks. No unconditional bug-free, legal-clearance, physical-device, field-INP or unqualified full-content claim is made. Remaining limitations include publisher permissions/CORS, online-only large public PDF, best-effort scheduled-feed timing, browser storage eviction, non-E2E optional sync with finite free quotas, missing Apple hardware/simulators and the approximate curl renderer.
