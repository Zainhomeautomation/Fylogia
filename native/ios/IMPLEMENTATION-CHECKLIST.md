# Native implementation checklist

Updated 4 November 2026, Asia/Muscat. This supersedes the historical phase statuses in the root progress ledger. Development remains on `native-ios-foundation`; the golden website and production are protected.

## Current milestone

- [x] Resume the existing SSD checkout after identity/branch/remote checks.
- [x] Open first launch to general news instead of mandatory website onboarding.
- [x] Hydrate the existing library before completing initial setup; retain preferences, selected sources, saved stories and progress. Use worldwide news sources only when no sources have been selected.
- [x] Provide four optional hints for scrolling/curling, saving/offline, settings and sources. Support skipping, completion, restart and replay from Settings.
- [x] Hide native page snapshots while tips are visible; restore magazine preparation after dismissal.
- [x] Avoid starting website-account pairing at native launch. Native iCloud remains unimplemented.
- [x] Add App Intents for opening Fylogia and routing to For You, Saved, History, Science, Technology and World News. Native unit and WebKit route tests pass; invoking the shortcuts through Siri/Shortcuts remains unverified.
- [x] Rebuild the native web bundle, strictly type-check transformed sources, lint/format, run WebKit regressions, and compile a Release simulator app.
- [ ] Accept the native curl visually on functioning Apple simulators and physical hardware.

## Reading and feature parity

| Requirement                                                                      | Current evidence and remaining work                                                                                                                                                         |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Narrow feed, articles, saved/offline stories and PDFs                            | PASS WebKit regression: one column, multiple stories, continuous PDF pages, offline content and position across resize. Current native UI execution NOT RUN successfully.                   |
| Wide facing-page feed/articles and cream paper                                   | PASS WebKit layout and six responsive sizes. Short landscape native spreads now fit the WebView rather than inheriting the 480-point website minimum; the UIKit middle-spine renderer remains unchanged. Native UI test confirms the overlay fits; round-trip reading position still fails its iPhone UI assertion. |
| Binding, front/back, shadows, extreme drag/reversal/cancellation                 | iPhone 17 UI test now confirms native UIKit overlay preparation, short cancellation, forward/reverse turns and one-spread extreme-drag settling. Final rotation-back assertion fails; transition-level visual curl and tearing acceptance remain open. No engine replacement or unsupported mesh API was introduced. |
| For You, Explore, Local, Regional, World, Latest, Categories, My Sources, Search | Golden interface is bundled. Native loopback now relays only the public `/api/location` GET when Local News requests it, strips the result to a validated country code, and uses no cookies/cache. Other API routes stay blocked. Live country lookup and full native navigation acceptance remain open. |
| Settings, reading preferences, themes                                            | Existing interface retained; native paper/haptics/sound controls and tutorial replay available. Existing preference preservation tested.                                                    |
| Saved articles/bookmarks, offline library, history                               | Existing hybrid stores retained; PASS WebKit save/restart and offline reading. Original UIKit prototype store is preserved separately; no silent migration.                                 |
| Magazines, PDF reader, daily editions, downloads                                 | Existing interface retained; PASS WebKit continuous PDF/lazy canvas/rotation/offline regression. Native import/export, share/download delivery and complete offline acceptance remain open. |
| Personalization                                                                  | Existing on-device ranking uses reading history and saved stories. No paid AI or registration introduced. Dedicated recommendation quality review remains open.                             |
| First launch                                                                     | PASS WebKit fresh/incomplete/existing library cases, four hints, skip/replay/restart. Native Apple UI acceptance remains open.                                                              |

## Apple integration and release gates

- [ ] iCloud: private container/capabilities, offline conflict handling, deletion semantics, progress/preferences/bookmark/saved synchronization and cross-device tests.
- [x] WidgetKit: small/medium/large headline layouts, hourly timeline refresh requests, extension-local offline cache, lock-screen privacy redaction and story deep links are implemented. Network refresh, installed widget appearance, size-specific layout and tap acceptance remain NOT RUN on device.
- [x] Daily briefing notifications: disabled by default; opt-in permission request, local delivery time and topic selection; latest cached matching headlines are included; tapping opens Fylogia. WebKit settings and native schedule/body validation pass. Actual permission grant and notification delivery remain untested.
- [ ] Breaking-news alerts: no publisher alert or APNs delivery service is configured; requires an approved delivery source and real-device delivery validation.
- [x] App Intents: app, saved library, reading history and selected categories with tested routing. Siri/Shortcuts presentation and invocation remain unverified.
- [ ] Sustained native reading, lifecycle, VoiceOver, Dynamic Type, memory, battery and frame-rate measurements. No 60 FPS claim.
- [ ] Standard iPhone, Pro Max, iPad and dedicated Duo simulator runs. Installed profiles include Pro Max and Duo; no additional runtime was downloaded. Dedicated Duo runtime availability is inventory evidence only.
- [ ] Physical iPhone Duo/iPad pairing, owner signing team and device acceptance. No physical devices were listed by `devicectl` in this run.
- [ ] Native privacy policy/disclosures, rights review, final screenshots/metadata, signed TestFlight build and owner upload/submission approval. Existing branding/icon retained; no Store submission, ads or subscriptions enabled.

## Validation and blocker

PASS: development-volume real and simulated guards; bundled production web build; strict TypeScript of transformed native sources; JS lint with warnings denied; Prettier; strict Swift formatting; Git whitespace; Release simulator compilation. WebKit suites pass for first launch, overlay isolation, adaptive feed, six responsive layouts, article/PDF continuity and content failures. Original layout fixtures are not publisher news or physical-device evidence. Screenshots and generated bundles stay in SSD build storage.

App Intents milestone (4 November 2026): PASS Debug simulator build and 10/10 `FylogiaTests` on iPhone 17 / iOS 27.2; PASS Release simulator build with App Intents metadata extraction; PASS WebKit route exercise for World News, Saved and History plus the existing fresh-launch regression. Siri/Shortcuts presentation and actual voice invocation are NOT RUN.

Daily briefing milestone (4 November 2026): PASS native Debug simulator build and 11/11 `FylogiaTests`, including time validation and safe headline formatting; PASS Release simulator build; PASS WebKit settings exercise for default-off state, topic selection, headline inclusion and bridge delivery, plus App Intents routing and fresh-launch regressions. The native permission prompt and scheduled notification delivery were NOT RUN. The repeating local notification uses headlines cached at the last app update; background refresh is not configured.

Widget milestone (4 November 2026): PASS WidgetKit extension build and embedding; PASS Release simulator build; PASS 12/12 `FylogiaTests` on iPhone 17 / iOS 27.2, including widget-link route validation; PASS WebKit story-route exercise. Built app Info.plist registers the `fylogia` URL scheme and extension metadata is valid. Home Screen widget installation, small/medium/large visual acceptance, live network refresh and tap-through on iPhone/iPad are NOT RUN.

Local News native relay milestone (4 November 2026): PASS validated response handling (2 ASCII letters only, uppercased, body limited to 4 KiB), and PASS Debug build plus 13/13 native unit tests on iPhone 17 / iOS 27.2. The relay is GET-only, ephemeral, credentialless and uncached; parity/offline modes and unrelated `/api/` routes remain blocked. Live Cloudflare response and native Local News interaction are NOT RUN. The same full UI run passed 4/6 UI tests; `testAdaptiveFeedAndBoundDrag` failed bounds/native-overlay assertions and `testGoldenNavigationSettingsAndScreenshots` failed to locate Settings content through the iOS 27.2 accessibility tree. These do not validate or reject the relay and remain open acceptance failures.

Short-landscape reader milestone (4 November 2026): PASS WebKit adaptive-feed tests across six viewport sizes including 844×390, with complete headline bounds and anchor-round-trip checks; PASS web layout controls/regression suite; PASS release simulator build. The iPhone 17 native feed test now reaches and prepares the UIKit spread, verifies its in-viewport bounds, performs cancel/forward/reverse/extreme drag and settles on a single spread. It fails only after landscape→portrait→landscape when the expected Story 3–4 accessibility label is absent; the captured screen reports Story 5–6, so exact position preservation is still a real unresolved defect. A second previously failing settings UI case still cannot find the Appearance section after navigation through iOS 27.2 UI automation.

NOT RUN successfully: the iPad XCTest/XCUITest baseline. It compiled but stalled before executing cases. A captured simulator frame showed the Apple boot logo, and XcodeBuildMCP accessibility connection timed out. The current Xcode bundle has no `Contents/Developer/Applications/Simulator.app`. The owned stalled build was interrupted after about five minutes; the booted iPad was shut down without erasing its data. These observations do not establish the cause of the stall. A complete functioning Xcode/Simulator environment is needed to resume native curl demonstrations, visual acceptance and hardware preparation. No SDK files or user simulator data were modified to work around this.

The active GitHub workflow triggers on main pushes/PRs, manual dispatch and scheduled main feed refreshes. This milestone changes only native files and this ledger, and does not merge or dispatch production workflows. Apple capabilities, account configuration and production deployment remain untouched.
