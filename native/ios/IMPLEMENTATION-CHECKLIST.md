# Native implementation checklist

Updated 4 November 2026, Asia/Muscat. This supersedes the historical phase statuses in the root progress ledger. Development remains on `native-ios-foundation`; the golden website and production are protected.

## Current milestone

- [x] Resume the existing SSD checkout after identity/branch/remote checks.
- [x] Open first launch to general news instead of mandatory website onboarding.
- [x] Hydrate the existing library before completing initial setup; retain preferences, selected sources, saved stories and progress. Use worldwide news sources only when no sources have been selected.
- [x] Provide four optional hints for scrolling/curling, saving/offline, settings and sources. Support skipping, completion, restart and replay from Settings.
- [x] Hide native page snapshots while tips are visible; restore magazine preparation after dismissal.
- [x] Avoid starting website-account pairing at native launch. Native iCloud remains unimplemented.
- [x] Rebuild the native web bundle, strictly type-check transformed sources, lint/format, run WebKit regressions, and compile a Release simulator app.
- [ ] Accept the native curl visually on functioning Apple simulators and physical hardware.

## Reading and feature parity

| Requirement                                                                      | Current evidence and remaining work                                                                                                                                                         |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Narrow feed, articles, saved/offline stories and PDFs                            | PASS WebKit regression: one column, multiple stories, continuous PDF pages, offline content and position across resize. Current native UI execution NOT RUN successfully.                   |
| Wide facing-page feed/articles and cream paper                                   | Existing implementation retained; PASS WebKit layout/anchor tests. UIKit middle-spine double-sided renderer unchanged. Native visual acceptance remains open.                               |
| Binding, front/back, shadows, extreme drag/reversal/cancellation                 | NOT ACCEPTED visually. Existing supported UIKit engine retained; no replacement or unsupported mesh manipulation introduced.                                                                |
| For You, Explore, Local, Regional, World, Latest, Categories, My Sources, Search | Golden interface is bundled. Local automatic country detection is not connected to the native loopback origin; this remains a parity gap. Full native navigation acceptance remains open.   |
| Settings, reading preferences, themes                                            | Existing interface retained; native paper/haptics/sound controls and tutorial replay available. Existing preference preservation tested.                                                    |
| Saved articles/bookmarks, offline library, history                               | Existing hybrid stores retained; PASS WebKit save/restart and offline reading. Original UIKit prototype store is preserved separately; no silent migration.                                 |
| Magazines, PDF reader, daily editions, downloads                                 | Existing interface retained; PASS WebKit continuous PDF/lazy canvas/rotation/offline regression. Native import/export, share/download delivery and complete offline acceptance remain open. |
| Personalization                                                                  | Existing on-device ranking uses reading history and saved stories. No paid AI or registration introduced. Dedicated recommendation quality review remains open.                             |
| First launch                                                                     | PASS WebKit fresh/incomplete/existing library cases, four hints, skip/replay/restart. Native Apple UI acceptance remains open.                                                              |

## Apple integration and release gates

- [ ] iCloud: private container/capabilities, offline conflict handling, deletion semantics, progress/preferences/bookmark/saved synchronization and cross-device tests.
- [ ] WidgetKit: small/medium/large targets, shared data, refresh/privacy rules and story deep links.
- [ ] Notifications: off by default, permission-aware daily summary, topic/category selection, breaking-news delivery and limits. No APNs infrastructure configured.
- [ ] App Intents: app, saved library and selected categories with tested routing.
- [ ] Sustained native reading, lifecycle, VoiceOver, Dynamic Type, memory, battery and frame-rate measurements. No 60 FPS claim.
- [ ] Standard iPhone, Pro Max, iPad and dedicated Duo simulator runs. Installed profiles include Pro Max and Duo; no additional runtime was downloaded. Dedicated Duo runtime availability is inventory evidence only.
- [ ] Physical iPhone Duo/iPad pairing, owner signing team and device acceptance. No physical devices were listed by `devicectl` in this run.
- [ ] Native privacy policy/disclosures, rights review, final screenshots/metadata, signed TestFlight build and owner upload/submission approval. Existing branding/icon retained; no Store submission, ads or subscriptions enabled.

## Validation and blocker

PASS: development-volume real and simulated guards; bundled production web build; strict TypeScript of transformed native sources; JS lint with warnings denied; Prettier; strict Swift formatting; Git whitespace; Release simulator compilation. WebKit suites pass for first launch, overlay isolation, adaptive feed, six responsive layouts, article/PDF continuity and content failures. Original layout fixtures are not publisher news or physical-device evidence. Screenshots and generated bundles stay in SSD build storage.

NOT RUN successfully: the iPad XCTest/XCUITest baseline. It compiled but stalled before executing cases. A captured simulator frame showed the Apple boot logo, and XcodeBuildMCP accessibility connection timed out. The current Xcode bundle has no `Contents/Developer/Applications/Simulator.app`. The owned stalled build was interrupted after about five minutes; the booted iPad was shut down without erasing its data. These observations do not establish the cause of the stall. A complete functioning Xcode/Simulator environment is needed to resume native curl demonstrations, visual acceptance and hardware preparation. No SDK files or user simulator data were modified to work around this.

The active GitHub workflow triggers on main pushes/PRs, manual dispatch and scheduled main feed refreshes. This milestone changes only native files and this ledger, and does not merge or dispatch production workflows. Apple capabilities, account configuration and production deployment remain untouched.
