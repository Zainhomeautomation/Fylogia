# Reading-first native review — 2026-11-02

## Changes

The native magazine opens in reading mode. The original date, edition/download actions, sorting, search, filters and presentation switch remain mounted and functional behind **Edition controls**. **Resume reading** closes that panel. A compact branded header and section toolbar remain outside the paper; no permanent toolbar overlays article text.

The existing sidebar is reused as an overlay in magazine mode at every width, including iPad landscape. Its menu and close buttons remain accessible; other sections keep their existing navigation. Opening the sidebar hides the native snapshot layer so it cannot obscure navigation. No user preferences or library stores are reset.

Tall reading space is allocated to editorial photographs within bounded heights. Headlines retain the original wrap/readability rules; large text and unusually long stories can still require scrolling instead of clipping. The exact warm cream background is unchanged.

The native book begins 94–102 CSS points below the web viewport's top. In normal-size iPad fixtures it occupies about 90% of the remaining reading area (approximately 81–83% of the entire viewport). This is a measured fixture result, not a guarantee for every article or accessibility size.

Snapshot preparation now waits for WebKit paint before capturing a sheet. Completing JavaScript alone does not mean a removed neighbor preview has left the rendered frame; waiting avoids using a stale adjacent page as current-page artwork.

## Evidence

- [iPad portrait simulator screenshot](review/2026-11-02/ipad-portrait.png)
- [iPad landscape simulator screenshot](review/2026-11-02/ipad-landscape.png)
- [Representative native curl frame](review/2026-11-02/curl-in-progress.png)
- [Measured WebKit layout results](review/2026-11-02/layout-results.json)

Screenshots use original, explicitly labelled layout fixtures and a nonpersistent test store. They do not present invented articles as news. The screen recording is delivered separately to avoid committing a large movie to the source repository.

## Coverage and limits

WebKit checks cover 393px standard/folded-phone size, 440px large-phone size, 720px unfolded-style width, iPad portrait and landscape, and a 1.6x minimum-width accessibility fallback. They measure headline bounds, spread count, initial book position, retained search/sort controls and reopening the sidebar. These are viewport simulations, not physical device tests.

The existing iPad simulator verifies native navigation/settings, opening and closing reading controls, native middle-spine presence, sidebar occlusion protection, partial-drag cancellation, slow forward and fast backward turns, one-spread settling after a full-width over-drag, and rotation retaining the current spread. A full-width drag should complete one turn; an early test incorrectly demanded cancellation after the completion threshold and was corrected. This is separate from the short-drag cancellation assertion.

The native curl remains UIKit's engine. There is no direct public mesh-clamping API, so **the perceived tearing problem is not declared fully resolved**. Public gesture-boundary cancellation, fixed clipping and a stable spine improve containment, but extreme curvature within the page bounds, reversal mid-drag and real-device 60 FPS remain visual/performance acceptance gaps. See [BOUND-READER-REVIEW.md](BOUND-READER-REVIEW.md). No alternative engine or private UIKit APIs were introduced.

No additional runtimes were installed. No production deployment, DNS change or website-source modification was made. Production was verified read-only at 295ed69c36b8a4fc30adb996a88832f5c4241a5e.

## Final validation

PASS — full native test suite: 13 tests, 0 failures, 183.1 seconds, existing iPad Pro 11-inch simulator. Result bundle: `test_sim_2026-11-02T12-05-04-241Z_pid83290_4ed50081.xcresult`. Six WebKit layout/control cases passed. Swift formatting, JS/CSS formatting, production web-bundle generation and native build passed. An earlier combined run stalled at simulator launch and was canceled; the final complete rerun passed. No physical device test or measured 60 FPS claim is made. iPhone/large-phone/foldable-size checks used WebKit viewport simulation; only iPad used the installed native simulator in this refinement.

Native-source-only checkpoint follows the preserved hybrid checkpoint 27b0769. Do not merge into website production merely to trigger deployment.
