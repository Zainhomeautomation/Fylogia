# Fylogia Development Status

Last refreshed: 5 November 2026 (Asia/Muscat). This shared status points to the separate Web and Native SSD checkouts; they remain separate Git repositories and are not merged.

## Workspace map

| Area | SSD checkout | Development branch | Latest source checkpoint | State |
| --- | --- | --- | --- | --- |
| Website | `/Volumes/Developments/Projects/Fylogia/Web` | `web-maintenance-after-golden-v1` | `ef6eb2695d1535efc3ecfd02f1b7f2e43b5e01f3` | Accessible, clean; remote branch matches. Website production remains on its separate `main` deployment path. |
| Native iOS | `/Volumes/Developments/Projects/Fylogia/Native` | `native-ios-foundation` | `1c99e91bc41e41e7a247f72baa38d028d90dc5cb` | Accessible, clean; remote branch matches. Bounded simulator continuation and WebKit regression evidence are recorded in the implementation checklist. Native changes are not deployed to the website. |

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
- A fresh iPad Pro 11-inch boot attempt ended with `Data Migration Failed`; SpringBoard existed but the screenshot remained on the Apple logo. It was shut down without erasing data. A fresh iPhone 17 run passed 16 unit tests, but the UI runner failed before connecting. The subsequent 5 November iPad mini run passed one focused adaptive UI test after a direct app launch; see the update below. iPad Pro 13, Pro 11 UI acceptance, device-level Duo, and physical-device acceptance remain **NOT RUN/BLOCKED**.
- The XCTest pagination microbenchmark averaged 2.27 ms across ten samples. It does not measure scrolling/curl frame rate, memory, battery, or sustained reading. Static screenshots show the cream spread and central binding; active-transition page tearing has not had frame-by-frame visual review.
- iCloud end-to-end sync, remote breaking alerts, installed widget/notification delivery, Siri invocation, accessibility audit, sustained performance, and App Store privacy/rights/screenshots/signing gates remain open. Physical-device signing and trust are not configured.
- **Next Native milestone:** resolve the iPad Pro 11 data-migration and iPad Pro 13 runner IPC failures without erasing data, then complete the remaining Pro and Duo viewport/device checks. The iPad mini focused UI runner passed on 5 November. The required simulator matrix has **not passed**; physical iPhone Duo acceptance is not ready as a completed validation gate.
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


### Startup reliability update (4 November 2026)

Native startup now has bounded stage diagnostics, a 12-second recoverable error screen, a 5-second IndexedDB startup-write deadline, and fail-closed handling when the existing library cannot be read. Retry reloads without resetting storage. Isolated WebKit scenarios passed: successful open 255 ms; stalled transaction timed out at 5,000 ms and library launch completed in 5,408 ms; failed read/retry preserved bookmarks, saved/history/progress and offline article data; failed-write fallback passed. The native-launch regression passed. Current iPhone 17/iOS 27.2 validation passed 16/16 native unit tests and one focused UI smoke test. Broader iPad/Pro Max matrix, physical testing, and transition-level curl visual acceptance remain incomplete. See the detailed evidence in `native/ios/IMPLEMENTATION-CHECKLIST.md`.

### Simulator validation continuation (5 November 2026)

- Active developer directory is the SSD Xcode 27.2 build 27B52. Its bundle still lacks `Simulator.app`; no Xcode reinstall or runtime changes were made. Internal free space remained above 20 GB (44.88 GB at the end), and no simulator remained booted.
- iPhone 18 Pro Max focused adaptive feed/curl/drag test passed 1/1 twice. Static screenshots show the portrait feed and settled landscape binding/spread. The broader UI run passed one test then stalled at the next app launch; it was canceled. iPad mini's one bounded focused run stalled before test execution and was canceled; previous iPad mini/Pro 13 logs ended with CoreSimulator IPC server death (`-308`), while iPad Pro 11 ended with data migration failure. No Fylogia app startup defect was confirmed.
- WebKit adaptive feed checks passed ten viewport sizes, including four Duo-shaped viewports; reading mode, rotation/position, offline, PDF, first-launch recovery, content failures, notification settings, App Intents, and overlay-isolation regressions passed. These viewport tests do not prove fold/hinge behavior.
- Current performance evidence is limited to a WebKit content process at about 153 MB and 0.1% CPU after load; no scroll/curl FPS, sustained peak memory, battery or transition video was measured. Curl tearing remains unreviewed at transition-frame level.
- **Gate: NO-GO for physical-device acceptance/full simulator completion.** Remaining tasks: repair simulator/XCTest startup through a supported path, run untested iPad Pro profiles and full Pro Max suite, capture actual transition frames, measure sustained performance, and test the physical Duo.

### iPad mini validation follow-up (5 November 2026)

- Existing iPad mini (A20 Pro) reached `bootstatus: Finished` in 6 seconds, although the first screenshot still showed the boot logo. A direct non-XCTest launch then rendered the news feed in approximately 35 seconds, including the first tutorial tip. A Home-button capture confirmed the Home Screen. One focused `testAdaptiveFeedAndBoundDrag` XCTest passed 1/1 and exercised the iPad mini portrait and landscape feed modes, curling gestures, rotation and position state. This supersedes the earlier iPad mini runner-blocked status for this focused test only.
- The XcodeBuildMCP accessibility snapshot still timed out; the focused XCTest runner itself connected and passed. The CUA Simulator GUI could not be connected. Article-reader rendering on iPad remains unverified in this pass.
- The 8 GB Mac reported 72% memory free and 2.38 GB swap before boot; lowest observed free was 28%, peak swap 6.15 GB during the single test. After simulator shutdown, memory free recovered to 57% and swap use to 2.16 GB. The focused test passed; these measurements do not establish RAM as the cause of earlier IPC failures. A 16 GB or larger Mac is recommended for the remaining full serial matrix to reduce swap pressure, but was not proven strictly necessary by this iPad mini run.
- No simulator was erased or created, and no application source was changed. Test screenshots and the result bundle are under `/Volumes/Developments/Xcode/TestResults/Fylogia-iPad-mini-XCTest-20261105/` and `/Volumes/Developments/Xcode/TestResults/`.
- Remaining gate: iPad Pro 11 migration failure, Pro 13 runner IPC failure, iPad article/PDF behavior, full matrix, active page-curl frame review and physical Duo validation. Overall acceptance remains **NO-GO**.
