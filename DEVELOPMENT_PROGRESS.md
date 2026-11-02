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
- Local production build, source bundle verification, independent recovery build, 151 recovery server tests and compiled-asset comparison pass. The original tag browser run exposed a date-sensitive navigation fixture; the immutable tag is unchanged. The corrected maintenance harness passes 9 focused navigation cases and will run the full suite against unchanged website runtime code.
- No website source, production deployment, DNS, stored user data or existing scheduled feed-refresh configuration has been changed during Phase 1. Normal pre-existing news refreshes remain enabled; the tag remains the immutable reference to this snapshot.

## Phase ledger

| Phase                         | Status      | Evidence / next gate                                                                                                                                  |
| ----------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Freeze website             | IN PROGRESS | Protected tag and recovery build/assets verified; full corrected-harness browser checks pending.                                                      |
| 2. SEO / Search Console       | NOT STARTED | Existing implementation and owner guide will be audited, not rebuilt. Account verification cannot be inferred from a sitemap or DNS alone.            |
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
- Documentation/maintenance commits will be recorded after saving their validated checkpoint; `git log web-maintenance-after-golden-v1` is the authoritative sequence.
