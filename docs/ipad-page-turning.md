# iPad paper-turn correction

The existing article, Daily Magazine article and PDF readers share `usePageTurn` and the paper surface renderer. This release extends those components rather than adding another reader or changing library storage.

## Findings

- The production engine applied polygon clipping and projective `matrix3d` transforms to fourteen printed paper regions. A held PDF corner drag in WebKit reproduced separated/slivered paper bands on the public production build. Replacing only the projection with affine tangents of the same cylindrical fold produced a continuous sheet in the same browser and document. This is browser-engine evidence, not a physical-iPad reproduction.
- Vertical movement was explicitly rejected by gesture detection. Paginated surfaces also advertised native vertical panning, which conflicts with owning up/down page turns.
- Reduced Motion intentionally skipped animation, without explaining that behavior in the reader.
- Navigation HTML was shell-cache-first and an open PWA did not communicate worker updates. An old open client could keep its already-loaded reader code.

## Changes

Each tangent now uses an orthographic projection of the curved sheet, with an independently clipped printed texture. A fixed rectangular overflow mask and inverse texture transform represent the same crease intersection without repainting a polygon mask or changing layout dimensions each frame. Lighting is initialized once on an empty overlay instead of invalidating inherited styles on every printed text descendant. This avoids the problematic projective CSS divide while retaining a moving crease, bent paper, shadows/highlights, printed front/back faces and corner dragging. It is not a flat-sheet rotation or sliding transition. The geometry is shared by horizontal and vertical turns; text remains upright.

One gesture owner locks the dominant axis: left/up advances, right/down goes back. Partial contacts cancel, page bounds and one queued turn remain enforced, and interactive taps retain their normal behavior. Both one-finger axes are owned only in paginated reading. Scrolling mode, two-finger zoom and zoomed panning remain available. Reduced Motion remains respected and is explained visibly.

PWA registration checks updates without the HTTP cache on load, foreground and reconnection. Online navigation requests current HTML, with a bounded installed-shell fallback for offline/stalled connections. The current reader continues until the user reopens or reloads the application; there is no forced reload or added reload control. Offline image caches, private PDFs, IndexedDB, progress and preference keys are preserved; no destructive migration is used.

## Verification boundary

`ipad-animation.spec.ts` verifies changing printed pixels, multiple animation frames before the page number changes, curved tangent geometry, both axes/directions, portrait/landscape, offline turns, progress and reduced motion. Chromium uses browser-dispatched touch events; WebKit exercises the native-listener contract with TouchList-shaped events. Standalone flags are simulated application conditions, not an installed iOS PWA test. Existing gesture, PDF, Daily Magazine, backup, sync and offline tests remain in the complete suite.

Physical iPad acceptance is outstanding. This Mac exposes Command Line Tools but no Xcode `simctl`/`xctrace`; the simulator integration also reports missing `simctl`. No iPad/iPhone was found in the USB inventory. The available native Safari window is locked Private Browsing. Physical frame rate, iPadOS compositing and installed-Home-Screen behavior are not claimed as verified.

On a real iPad, reopen the updated application online, open a multi-page full article in Pages mode and an original PDF, and check all four swipe directions, corner release/cancellation, single taps, links and pinch/Fit. Repeat portrait/landscape and in the Home Screen app; then check downloaded content in Airplane Mode. Reduce Motion must be off to assess the animation itself. An animated physical-device result is required before conclusively closing the reported iPad issue.
