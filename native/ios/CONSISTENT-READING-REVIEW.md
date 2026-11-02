# Consistent native reading modes

This checkpoint extends ADAPTIVE-READING-REVIEW.md from the news feed to the existing article and PDF readers. Website sources, the golden tag, production configuration and user stores are preserved. Only native adapters and tests change.

## Behaviour

- Portrait/narrow news and reflowable articles use one vertical column, including articles opened from Saved, Offline Library and Daily Magazine. No page-turn handler or native sheet overlay is enabled in this mode.
- Wide/near-square windows use facing pages when both columns meet the readable minimum, increased for Dynamic Type. Previews remain scrolling. Fixed-layout PDF spreads retain the original fitting constraints.
- PDFs use continuous original pages when narrow. IntersectionObserver mounts nearby canvases, retaining measured placeholder proportions. Original PDF page numbers, zoom and bookmarks remain available; rotation keeps the current page.
- Article scroll positions retain a text range across reflow, with the existing ratio format retained for persistence and exports. Resize-generated scrolling cannot overwrite progress during the short layout transition. Existing library and download stores are not reset or migrated.
- Manual website presentation preferences remain stored. Native presentation is automatic, so the native toolbar explains this policy rather than offering conflicting page/list switches.
- Cream paper, typography, compact controls, themes, categories, navigation and publisher attribution remain in place. Native Dynamic Type scales article body text and minimum readable widths.

## Performance and lifetime changes

Portrait photos load lazily; the small set of current/adjacent magazine sheets still preload. Feed scroll tracking is limited to one update per animation frame. Continuous PDFs release offscreen canvases. A weak script-message proxy removes the controller-to-WebKit-handler ownership cycle; its lifetime regression checks release after UIKit autoreleases drain. Memory warnings discard only regenerable native snapshots. Backgrounding suspends snapshots, and foregrounding schedules their restoration.

Only the frontmost, non-inert reader may prepare native pages. Opening reading options or a summary hides native overlays, preventing an underlying feed snapshot from covering a scrolling/preview reader or its controls.

## Curl realism and limits

The existing UIKit central-spine, double-sided engine and bounded-drag safeguard remain. No private mesh APIs or replacement rendering library is introduced. UIKit does not expose a supported deformable-sheet geometry clamp. The current boundary cancellation does not establish that every intermediate frame is visually bound. Extreme/diagonal dragging, reversal, and cancellation still require owner visual acceptance. Do not label the tearing issue resolved based on unit tests or changed page numbers.

## Evidence and release limits

Run native/ios/scripts/test-consistent-readers.mjs against the native bundle for repeated article open/back, unchanged text across rotation, visible-paragraph restoration, saved/downloaded articles offline, Dynamic Type, automatic modes with a stored website-list preference, 20-page PDF lazy rendering, PDF rotation and offline continuation. test-bound-layer.mjs verifies overlay isolation; existing adaptive-feed and layout scripts remain applicable.

Native test execution and profiling outcomes are recorded in the delivery report. A failed test-harness initialization is not a passing UI test. Screenshot fixtures are explicitly original layout-test text, not publisher news. No physical-device, hardware FPS, complete VoiceOver, extended battery, real low-memory, or active-drive-disconnection acceptance is implied. Test the development-volume guard with a simulated missing mount; do not unplug the SSD during migration to manufacture a test.

Keep this native branch isolated from website production. Signing, App Store submission, native cloud credentials and additional runtimes are outside this checkpoint.

## Validation status for this checkpoint

PASS: production web bundle for the native app and Debug simulator compilation; strict TypeScript of the transformed App/Reader/PdfReader/NewsFeed/StoryCard; JS/Swift formatting and lint; nine native unit tests including the bridge lifetime test; responsive feed/layout, article/PDF continuity, saved/downloaded reading offline, malformed-PDF handling, missing-text/image fallback, overlay isolation, and simulated missing-volume/low-storage browser/build-guard regressions.

Earlier native UI cases exercised the new article modes, existing bound drag/cancel and navigation successfully. Final all-case acceptance is pending: reruns encountered `XCTDaemonErrorDomain Code=18: Timed out waiting for AX loaded notification`, animation/event-loop monitoring failures, and test-tool timeouts. The installed Xcode bundle also lacks Developer/Applications/Simulator.app; the simulator browser mirror displayed a real booted iPad frame, but is not a substitute for passing the UI suite. No SDK files were altered.

Resource safety stopped further simulator work after internal free storage fell below 10 GB, briefly reaching approximately 6.9 GB. Simulators and owned capture/test processes were stopped; no original files or runtime data were deleted. Further Apple UI, physical-device, VoiceOver and Instruments/frame-rate acceptance remains open. No claim of 60 FPS, full native offline acceptance, or resolved page tearing is made.

An iPhone simulator capture was black during the resource-pressure period. It is not accepted as a successful native visual test. Recheck it after restoring storage headroom and a healthy Apple test environment.
