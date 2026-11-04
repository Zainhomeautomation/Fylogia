# Fylogia Development Status

Last refreshed: 4 November 2026 (Asia/Muscat). This shared status points to the separate Web and Native SSD checkouts; they remain separate Git repositories and are not merged.

## Workspace map

| Area | SSD checkout | Development branch | Latest source checkpoint | State |
| --- | --- | --- | --- | --- |
| Website | `/Volumes/Developments/Projects/Fylogia/Web` | `web-maintenance-after-golden-v1` | `ef6eb2695d1535efc3ecfd02f1b7f2e43b5e01f3` | Accessible, clean; remote branch matches. Website production remains on its separate `main` deployment path. |
| Native iOS | `/Volumes/Developments/Projects/Fylogia/Native` | `native-ios-foundation` | `c3ed447fa4d797abdac3de3d473663d208f334b2` | Accessible, clean; remote branch matches. Native changes are not deployed to the website. |

The Codex sidebar already has a **Fylogia — Developments SSD** section containing separate local **Web** and **Native** projects, each linked to the path above. Registered project IDs and section IDs are in `/Volumes/Developments/Workspace-Configuration/projects.json`.

## Website status

- The Web checkout contains the protected website and maintenance records. Its published feature set includes onboarding, curated news feeds, categories and sources, search, saved/offline reading, history, Daily Editions, magazines/PDFs, themes, privacy-conscious local personalization and optional private library sync.
- The golden source tag is `fylogia-web-golden-v1` at source commit `26fd37f27bd70cd7495f33209b823796770d9c22`. Preserve it and production; no website, production, DNS, or feed-refresh configuration was modified for this work.
- The Web branch's last committed test record reports corrected CI passing 510 browser cases (one iPhone case passed on retry), 151 server tests, lint, formatting and build. A fresh Phase 2 run passed 18 live SEO/PDF cases. Google Search Console ownership and sitemap submission were recorded as successful on 2 November 2026. These are the latest recorded results in the Web checkout, not a fresh CI or live-production check from this status update.
- **Next Web milestone:** reproduce and profile the reported standalone PWA page-curl slowdown on a physical iPhone/iPad; no root cause or correction is currently claimed. Search Console indexing/performance processing and publisher-feed health should be refreshed when those decisions are next in scope.

## Native iOS status

- Completed in the Native branch: first-launch tutorial and library preservation; App Intents routes; WidgetKit layouts/deep links; opt-in daily briefings; local breaking-news classification, deduplication and rate limiting; adaptive portrait scrolling and wide landscape curling; a remembered vertical-scroll preference shared by news and full articles; position preservation; offline/PDF reading; and local-first sync-journal plus dormant private CloudKit transport components.
- The sync journal is **not yet wired to the existing WebKit library**. CloudKit remains dormant because no container/entitlement is configured. Breaking-news notifications operate only on locally received stories while the app is active; no remote delivery backend/APNs publisher is configured.
- The full iPhone 17/iOS 27.2 suite recorded before the latest reading-mode Settings control passed 15 unit tests and 6 UI tests. The current Release simulator build passes. Current WebKit checks pass adaptive layout across ten viewports, four representative Duo-sized viewports, reading-mode preference persistence across news/articles/rotation/reload, article/PDF/offline continuity, and breaking-alert settings. Duo viewport checks do **not** validate fold-state behaviour.
- A fresh iPad Pro 11-inch boot attempt again ended with `Data Migration Failed`; SpringBoard existed but the screenshot remained on the Apple logo. It was shut down without erasing data. A fresh iPhone 17 test run passed 16 unit tests, but the UI test runner failed before establishing a connection; the accessibility snapshot timed out. Its screenshot was a launch/transition overlay, not proof of interactive GUI readiness. The existing Pro Max and iPad 11 result bundles each executed zero tests. iPad mini, iPad Pro 13, device-level Duo, and physical-device acceptance remain **NOT RUN**.
- The XCTest pagination microbenchmark averaged 2.27 ms across ten samples. It does not measure scrolling/curl frame rate, memory, battery, or sustained reading. Static screenshots show the cream spread and central binding; active-transition page tearing has not had frame-by-frame visual review.
- iCloud end-to-end sync, remote breaking alerts, installed widget/notification delivery, Siri invocation, accessibility audit, sustained performance, and App Store privacy/rights/screenshots/signing gates remain open. Physical-device signing and trust are not configured.
- **Next Native milestone:** restore Xcode UI-test runner connectivity and resolve the iPad 11 migration failure without erasing its data, then complete iPhone Pro Max, iPad mini, iPad Pro 11/13 and Duo-profile UI checks. The required simulator matrix has **not passed**; physical iPhone Duo acceptance is not ready as a completed validation gate.
- Source detail and current test evidence: [`native/ios/IMPLEMENTATION-CHECKLIST.md`](native/ios/IMPLEMENTATION-CHECKLIST.md) and [`APP_STORE_CHECKLIST.md`](APP_STORE_CHECKLIST.md).

## Codex conversation placement

- **Build and deploy Folio MVP** remains in its original history and is assigned to the Web project.
- **Resume Fylogia iOS implementation** remains in its original history and is in the **Fylogia — Developments SSD** sidebar section. The Codex project move tool did not attach the active conversation to the Native local project; after this conversation is idle, move it from the sidebar into **Native** in that section to bind its future working directory. No chat database was touched.
- New Web work should start from the registered Web project; Native work should start from the registered Native project. Each project resolves to the separate SSD path above.

## Shared status and instructions

Both registered project instruction files should link to this document:

- `/Volumes/Developments/Workspace-Configuration/Project-Instructions/Fylogia-Web.md`
- `/Volumes/Developments/Workspace-Configuration/Project-Instructions/Fylogia-Native.md`

Before software changes, run the corresponding `workspace.py` guard, read the instruction file and repository `AGENTS.md` when present, check branch/remote/worktree, and preserve the golden site, user data, AIHomeOS and production boundaries.
