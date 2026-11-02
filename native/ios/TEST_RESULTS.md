# First native milestone — 2026-11-02

## PASS

- Xcode 27.2 (27B52), existing iOS 27.2 iPad Pro 11-inch (M5) simulator. First build + install + launch succeeded in 28.5 seconds after correcting a selector-name conflict with UIResponder.next. No third-party dependencies or runtime downloads.
- Final iPad suite: **10 passed, 0 failed, 0 skipped**, 134.8 seconds, zero warnings. Seven XCTest cases: image space reservation, contiguous text ranges at three page sizes, reading anchors across resize, width/Dynamic Type policy, full-content permission gate, persistent bookmarks/position, pagination performance. Three XCUITest cases: finger-drag forward and return, Reduced Motion navigation, save/rotation/relaunch persistence.
- 24 fixture pages: pagination averaged approximately **2.1 ms** in the final ten-iteration test (host simulator, not physical iPhone/iPad throughput or frame rate).
- Native image-downsampling implementation compiled in the final tests. Normal launch displays real source-attributed Fylogia news; UI tests use explicitly labeled original guide text.
- Swift formatting lint (strict), project listing/build and Git whitespace checks passed.
- Golden source/tag and active GitHub protection rechecked. No website runtime/configuration/deployment changes.

## BLOCKED / NOT RUN

- Existing iPhone 17 / iOS 27.2: test build succeeded, but execution timed out at 300 seconds while the simulator showed Apple's first-boot progress screen. Test process interrupted afterward; simulator shutdown requested without erasing data. **No iPhone runtime pass claimed.** Width-policy and pagination tests cover compact sizes on the iPad test host, not an actual phone run.
- XcodeBuildMCP accessibility snapshot timed out; Xcode's own UI tests succeeded on iPad. A screenshot alone is not an interaction result.
- Physical iPhone/iPad/foldable hardware, Apple Pencil, tactile/audio quality, 60 FPS/battery/memory profiling, native-vs-hybrid benchmark, full offline Airplane Mode tests, PDF reader, iCloud/widgets/notifications and App Store signing/submission: **NOT RUN / future phases**.
- Current curl is Apple's actual UIKit page-curl transition, with simulator finger-drag interaction tested. No claim of physical-device acceptance or a measured animation frame budget.

## Evidence on this Mac

Successful build log: `~/Library/Developer/XcodeBuildMCP/workspaces/you-are-codex-acting-as-the-77f663e3d1fa/logs/build_run_sim_2026-11-02T10-32-30-015Z_pid83290_cb7bcb89.log`

Final iPad result bundle: `~/Library/Developer/XcodeBuildMCP/workspaces/you-are-codex-acting-as-the-77f663e3d1fa/result-bundles/test_sim_2026-11-02T10-48-26-057Z_pid83290_4042178e.xcresult`

The result bundle includes a retained post-gesture screenshot. Large generated build/test artifacts are not committed. Native DerivedData was approximately 200 MB; new simulator first-boot data accounted for additional host usage. Free storage was monitored above the 10 GB minimum; no unrelated files or caches were deleted.
