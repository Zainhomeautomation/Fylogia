# Adaptive native reading checkpoint

This checkpoint supersedes the earlier portrait-facing-page policy for the **news feed**. The protected golden website, production configuration and original native prototype remain unchanged.

The bundled shared React feed displays all stories in one vertical column in portrait/narrow windows. Wide or near-square windows use two facing pages when each page has at least 340 CSS pixels, increased by native Dynamic Type scaling. This supports unfolded-sized windows without device-name detection. The existing compact toolbar, overlay sidebar, categories, saved library, settings and article/PDF readers are retained.

Story identity stays in the same NewsFeed component across presentation changes. Scrolling records the first visible story; switching to magazine mode includes that story in its spread. Returning to scrolling restores it near the top. This does not reset preferences, migrate user stores or alter offline download records. The cream paper remains `UIColor(0.97, 0.95, 0.89)` / CSS sRGB equivalent by default; the existing paper preference is retained.

## Page-curl investigation

The existing persistent bound engine already uses a central UIKit spine and double-sided leaves for facing pages, cached adjacent snapshot leaves and a book-boundary cancellation guard. HybridController removes the old bound controller during rotation before preparing new snapshots. The adaptive feed disables page gestures and the native snapshot overlay while scrolling; article/PDF readers continue using their existing controls.

No new rendering engine or private UIKit mesh APIs were introduced. UIKit owns curl deformation and its internal coordinate constraints. The existing over-drag cancellation is a boundary safeguard, not proof that the visual tearing complaint is resolved. Physical-device review, representative intermediate curl frames and frame-rate measurements remain required before claiming realistic binding at every gesture position.

## Verification

- WebKit: six responsive sizes, first-visible-story round trip across rotation, all eight fixture stories in scrolling mode, complete headline bounds and unchanged stored preferences.
- Existing WebKit layout checks: six cases including 1.6x text-scale fallback, control access and overlay navigation.
- Native simulator suite: 13/13 passed (8 unit + 5 UI); the final bundle also passed a separate focused adaptive-feed/bound-drag rerun. Strict TypeScript checking of the transformed feed, production web bundling, JS lint, Swift formatting lint and JS/CSS/Markdown formatting passed. Tests cover 8 unit cases and 5 UI cases including bound forward/back/cancel/over-drag, rotation, navigation/settings and the original reader's persistence/Reduce Motion checks.
- UI comparison content is explicitly labelled fixture content, not fabricated publisher news.
- No physical iPad, iPhone or foldable hardware verification; viewport simulations do not establish physical device support. Full hybrid PDF/offline-download/export/import parity retains the limitations documented in BOUND-READER-REVIEW.md.

Native-only changes belong on `native-ios-foundation`; do not merge these changes into website production.
