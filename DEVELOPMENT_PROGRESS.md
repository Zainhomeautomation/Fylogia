# Fylogia Apple product development

Last updated: 2026-11-02, Asia/Muscat. Personal repository only: `Zainhomeautomation/Fylogia`.

## Execution boundaries

Proceed through the owner's phases in order. Preserve the approved website. Native development must not enter the production website artifact or deployment pipeline. Do not purchase services, accept Apple legal agreements, register credentials in Git, activate monetization, or submit to the App Store without the required owner action. Authentication and signing material stay outside source control. No physical-device result may be inferred from a viewport simulation.

## Golden website

- Production and GitHub `main` matched `26fd37f27bd70cd7495f33209b823796770d9c22` at the freeze inspection.
- Annotated tag: `fylogia-web-golden-v1`.
- Tag object: `ca205e79dcecbd891522984a83289eb3f34a835d`.
- GitHub ruleset `26345306` is active, targets only that exact tag, restricts updates/deletion, and has no bypass actors. Administrators can still change repository policy; the recorded object hashes and independent backup provide additional integrity evidence.
- Existing Cloudflare production deployment: `2e0d5c7e-e8ad-4793-8a61-7f83f9628cf2`, source `26fd37f`, project `fylogia`, branch `main`.
- Website maintenance branch: `web-maintenance-after-golden-v1`.
- Source bundle and build-rehearsal archive are stored outside the checkout under the owner's `artifacts/apple-release-2026-11-02/golden/` folder, with SHA256SUMS. They are not published as extra publisher-content downloads.
- Local production build, source bundle verification, independent recovery build, 151 recovery server tests and compiled-asset comparison pass. The original tag browser run exposed a date-sensitive navigation fixture; the immutable tag is unchanged. The corrected maintenance harness passes 9 focused navigation cases and full CI: 510 browser cases (one iPhone case required retry), 151 server tests, lint, formatting and build. Local recovery subset: 50/51 pass with a Chromium PDF timeout; later local attempts hit startup/dependency-read errors, documented in TEST_REPORT.md. Runtime remains unchanged.
- No website source, production deployment, DNS, stored user data or existing scheduled feed-refresh configuration has been changed during Phase 1. Normal pre-existing news refreshes remain enabled; the tag remains the immutable reference to this snapshot.

## Phase ledger

| Phase                         | Status      | Evidence / next gate                                                                                                                                  |
| ----------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Freeze website             | COMPLETE    | Protected tag, independent recovery build/assets and full corrected-harness CI verified; local test limitations recorded.                             |
| 2. SEO / Search Console       | IN PROGRESS | Existing implementation and owner guide will be audited, not rebuilt. Account verification cannot be inferred from a sitemap or DNS alone.            |
| 3. Standalone PWA performance | NOT STARTED | Owner reports slow Home Screen page curling on iPhone/iPad. Actual host reproduction and profiling required; no root cause or correction claimed yet. |
| 4. Native architecture        | NOT STARTED | Decision deferred until the phase gate and representative build/benchmark evidence.                                                                   |
| 5. Universal app              | NOT STARTED | Xcode 27.2 and iOS 17 simulator inventory are now available; app implementation starts after earlier phases.                                          |
| 6. Curl, haptics, paper audio | NOT STARTED | Native interaction and independent optional controls must be validated.                                                                               |
| 7. Magazine layouts/readers   | NOT STARTED | Preserve permission-aware content and position.                                                                                                       |
| 8. Local recommendations      | NOT STARTED | No paid AI or mandatory cloud inference.                                                                                                              |
| 9. First launch               | NOT STARTED | General news first; optional short tutorial, no immediate notification prompt.                                                                        |
| 10. Notifications             | NOT STARTED | Opt-in; APNs/account permissions and cost review before external infrastructure.                                                                      |
| 11. Widgets                   | NOT STARTED | WidgetKit and shared-data/signing validation required.                                                                                                |
| 12. App Intents               | NOT STARTED | Narrow native actions; no external AI subscription.                                                                                                   |
| 13. iCloud                    | NOT STARTED | Private/offline-first sync, conflict and revocation testing required.                                                                                 |
| 14. Native quality            | NOT STARTED | Instruments, accessibility, memory, lifecycle and physical-hardware results required.                                                                 |
| 15. App Store                 | NOT STARTED | Metadata, disclosures, rights, TestFlight and owner submission approval required.                                                                     |
| 16. Future monetization       | NOT STARTED | Architecture only; launch remains free without ads/subscriptions.                                                                                     |

## Required owner/toolchain action

Initial discovery selected Command Line Tools and could not find `simctl`. During this run the owner installed/opened Xcode; a temporary license gate blocked tool use, and the owner subsequently completed that setup. Read-only checks now report Xcode 27.2 (27B52), and XcodeBuildMCP lists iOS 17 iPhone/iPad simulators, all shut down. No simulator/native application has been launched yet. Apple agreements were not accepted by the agent. The prior Xcode setup request no longer blocks simulator preparation; no Apple password or signing material was supplied in chat.

The original tagged test run failed the Daily Magazine part of a navigation test after the frozen feed crossed a calendar boundary. The app correctly excludes old stories from Today. `tests/brand-home.spec.ts` now fixes only that test's Date clock to the newest followed fixture publication, leaving timers/animation and publisher dates unchanged. All 9 focused navigation cases pass. Website/runtime paths remain byte-for-byte unchanged from the tag.

## Commit log

- Frozen production milestone: `26fd37f27bd70cd7495f33209b823796770d9c22` (tag above).
- Initial documentation checkpoint: `5e157cc` (pushed to the maintenance branch; no production merge).
- Calendar-stable navigation harness and status: `3356d62` (pushed; CI run 41396670781 successful).
- Documentation/maintenance commits will be recorded after saving their validated checkpoint; `git log web-maintenance-after-golden-v1` is the authoritative sequence.

## Phase 1 completion qualification

Recovery is proven at source/build level with compiled assets identical to the golden live build; the original tagged calendar-sensitive fixture remains unchanged. No live rollback or physical testing was performed. The existing scheduled refresh has advanced production build-info to `295ed69c36b8a4fc30adb996a88832f5c4241a5e`; the protected golden tag remains fixed. Phase 2 will verify that remote main/live update and inspect existing SEO and Search Console access.

The remote main/live update was verified in a fresh checkout: only public/data/edition.json differs from the golden tag. The original Documents checkout encountered macOS ETIMEDOUT on .git/FETCH_HEAD and installed dependencies. It remains preserved. A separate personal-repository checkout at /Users/abdulahad/Projects/Fylogia-apple-20261102 now continues the same maintenance branch/history; locked dependency installation succeeds with zero reported vulnerabilities. No project restart or implementation replacement occurred.

## Phase 2 checkpoint

Phase 1 completion saved/pushed as `8866f7d`. Phase 2 technical audit: 18 live tests PASS without retries; no website code change needed. Personal Search Console domain verification is prepared, awaiting required owner confirmation before saving one TXT record and granting ownership access. No DNS mutation or sitemap submission yet. Subsequent phases remain pending under the sequential execution requirement. Current production/main `295ed69` differs from the golden tag only in scheduled feed data.

Apple tooling inventory refreshed: iOS 27.2 and 17.0 simulator devices now available, no connected physical devices. Native implementation has not begun. Existing website/user libraries remain intact.

## Google ownership approval completed — 2026-11-02

Owner approved the prepared verification. On resuming, Cloudflare already displayed exactly one matching Google verification TXT record alongside the two unchanged Pages CNAME records; no duplicate was added. Google then confirmed **Ownership verified**, method Domain name provider. Submitted https://fylogia.com/sitemap.xml; Search Console reports **Success**, last read 2 November 2026, **57 discovered pages**, zero videos.

Overview reports that performance, indexing and experience data are still processing. Discovered URLs are not proof of indexing. Retain the verification record. No website code, routing records, security configuration or user data was modified for this verification. Earlier pending-verification entries are historical and superseded by this checkpoint. Phase 2 ownership/submission gate is complete; Phase 3 standalone PWA reproduction remains next.

## Native continuation checkpoint — 2026-11-02

Owner supplied the continuation instruction: bound the standalone investigation and proceed to native development if the issue cannot be reliably reproduced. Reviewed shared capture/turn engine and lifecycle listeners; no confirmed standalone-specific root cause yet, no speculative website patch. XcodeBuildMCP started the iOS 27.2 iPad Pro 11-inch simulator; bootstatus remains in initial LaunchServices migration at this checkpoint. A reported boot action is not a completed Safari/PWA test. Native architecture benchmarks and implementation remain outstanding.

Host storage measured approximately 4.3–5.0 GiB free during simulator setup. Requested owner to free 15–20 GB or authorize a scoped disposable-cache inspection/proposal. No unrelated files, caches or simulator data deleted. This capacity concern is not claimed to be the cause of the PWA slowdown or simulator migration delay. No website deployment made.

## Native foundation implementation — 2 November 2026

- Golden tag freshly verified at `26fd37f27bd70cd7495f33209b823796770d9c22`; ruleset 26345306 still active with update/deletion restrictions. Live build-info remains `295ed69c36b8a4fc30adb996a88832f5c4241a5e` at start of native work.
- Dedicated checkout `/Users/abdulahad/Projects/Fylogia-native-20261102`, branch `native-ios-foundation`, personal repository only. Production branch is not modified.
- Phase 4: native critical-reader architecture chosen for implementation; comparative physical performance evaluation remains open.
- First functional universal project implemented under `native/ios`: native page curling, responsive facing pages, exact-range pagination, local reading anchors/bookmarks, permitted content handling, cached edition text, original links, optional haptics/sound and original branding.
- First successful iPad build and launch completed. Unit and UI tests exercise real simulator UIKit, not browser viewports. Detailed outcomes in `native/ios/TEST_RESULTS.md`.
- Later master-plan phases remain outstanding; this milestone does not claim widgets, notification delivery, iCloud, native PDF reading, complete offline parity, TestFlight or App Store readiness.
- No additional runtime installed; no unrelated cleanup; 10 GB minimum storage guard checked throughout.
