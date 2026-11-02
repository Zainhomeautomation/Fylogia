# Native bound-reader review — 2026-11-02

Status: development build, owner visual acceptance required. No website release.

## Confirmed findings

The golden web spread policy required a nearly square/landscape viewport even when two readable columns fit. Its 761–1100px drawer rule had the same orientation condition. The native-only build now removes those orientation conditions: actual content width and a 340px minimum page width decide news spreads. UIKit Dynamic Type raises the minimum width; accessibility sizes fall back to one page. The original React story-ID anchor remains responsible for rotation continuity. The tracked golden website source is unchanged.

The hybrid prototype previously used a transient curl after changing React state. The current experiment keeps a persistent UIPageViewController with a middle spine and double-sided pages for spreads. Current and adjacent pages are captured before gestures, and front/back leaf controllers are cached. React advances only after a completed native transition. The fixed container clips its children, and its spine delegate returns the width-selected layout rather than an orientation-selected spine.

A public gesture target cancels a pan if its touch leaves the physical book rectangle. This is a boundary cancellation guard, **not** direct curl-mesh clamping. UIKit does not expose a public mesh/progress API. It is not yet proven that every over-drag inside the rectangle avoids the perceived tearing effect. No private APIs or replacement engine were introduced. Do not mark the visual defect resolved on the strength of geometry tests.

## Preserved appearance and isolation

Exact paper colour remains UIColor(0.97, 0.95, 0.89, 1). Original logo, typography, navigation, categories and settings are reused from the protected golden tag. Native-only CSS supplies the paper exception and content-sized news sheets. Website source, deployment configuration, existing web data, native prototype UserDefaults and production branch are not modified. The earlier UIKit prototype remains available with `--native-reader` and its original test mode.

## Integration limits

The new hybrid reader remains a prototype, not complete native parity. Native snapshots are used only when a whole reading surface is visible; the existing web reader handles other situations. Centre-of-page interactive links remain web-owned; native gestures begin at the outer edges. Snapshotting can add preparation latency and must be profiled on physical hardware. No claim of measured 60 FPS is made.

Native cloud pairing and automatic country detection are not connected to the localhost app origin; do not bypass backend authentication/origin restrictions. Bundled UI opens without a network, but end-to-end native PDF, download/export/import and offline compatibility still require additional validation. Existing original-native bookmarks are retained in their original store; they are not silently migrated to the hybrid store.

## Validation evidence

See the accompanying test report for exact results. Test mode uses original, clearly labelled layout fixtures and nonpersistent WK storage, never the reviewer's library. Simulator results are not physical iPad verification. A recording is required for the appearance review; passing story-number assertions alone is insufficient. The native gesture regression explicitly requires a native middle-spine book to exist, preventing a web fallback from producing a false native pass.

Validation at this checkpoint: 8 native unit tests passed; a combined run was stopped after simulator launch stalled. Rerunning the complete 5 UI tests separately passed (navigation/settings, native portrait forward/back/cancel, original reader gestures, reduced-motion navigation, save/resize/restoration). Four WebKit layout cases passed with measured headline bounds: phone, iPad portrait, landscape, and enlarged text-scale fallback. Build, Swift formatting and JS/CSS formatting passed. Extreme over-drag visual acceptance, mid-gesture reversal, physical hardware performance and complete hybrid offline parity remain unverified. Production still reports 295ed69c36b8a4fc30adb996a88832f5c4241a5e.
