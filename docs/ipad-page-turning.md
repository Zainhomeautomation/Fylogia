# iPad paper-turn correction

The existing article, Daily Magazine article and PDF readers share `usePageTurn` and the paper surface renderer. This release extends those components rather than adding another reader or changing library storage.

## Findings

- The production engine applied polygon clipping and projective `matrix3d` transforms to fourteen printed paper regions. A held PDF corner drag in WebKit reproduced separated/slivered paper bands on the public production build. Replacing only the projection with affine tangents of the same cylindrical fold produced a continuous sheet in the same browser and document. This is browser-engine evidence, not a physical-iPad reproduction.
- Vertical movement was explicitly rejected by gesture detection. Paginated surfaces also advertised native vertical panning, which conflicts with owning up/down page turns.
- Reduced Motion intentionally skipped animation, without explaining that behavior in the reader.
- Navigation HTML was shell-cache-first and an open PWA did not communicate worker updates. An old open client could keep its already-loaded reader code.

- The release clock started before its first animation callback. A regression that delays first-frame delivery by 900 ms reproduces a page switching directly from its initial to final pose. The clock now starts from delivered frame timestamps after a prepared-pose paint opportunity; the existing bounded stalled-frame recovery remains. This is a reproduced timing defect matching the symptom, not confirmation of the owner's physical-device cause.

## Changes

Each tangent now uses an orthographic projection of the curved sheet, with an independently clipped printed texture. A fixed rectangular overflow mask and inverse texture transform represent the same crease intersection without repainting a polygon mask or changing layout dimensions each frame. Lighting is initialized once on an empty overlay instead of invalidating inherited styles on every printed text descendant. The tangent and mask transforms are composed into one layer, leaving two explicit moving layers per band instead of three. This avoids the problematic projective CSS divide while retaining a moving crease, bent paper, shadows/highlights, printed front/back faces and corner dragging. It is not a flat-sheet rotation or sliding transition. The geometry is shared by horizontal and vertical turns; text remains upright.

One gesture owner locks the dominant axis: left/up advances, right/down goes back. Partial contacts cancel, page bounds and one queued turn remain enforced, and interactive taps retain their normal behavior. Both one-finger axes are owned only in paginated reading. Scrolling mode, two-finger zoom and zoomed panning remain available. Reduced Motion remains respected and is explained visibly.

PWA registration checks updates without the HTTP cache on load, foreground and reconnection. Online navigation requests current HTML, with a bounded installed-shell fallback for offline/stalled connections. The current reader continues until the user reopens or reloads the application; there is no forced reload or added reload control. Offline image caches, private PDFs, IndexedDB, progress and preference keys are preserved; no destructive migration is used.

## Verification boundary

`ipad-animation.spec.ts` verifies changing printed pixels, multiple animation frames before the page number changes, curved tangent geometry, both axes/directions, portrait/landscape, offline turns, progress and reduced motion. Chromium uses browser-dispatched touch events; WebKit exercises the native-listener contract with TouchList-shaped events. Standalone flags are simulated application conditions, not an installed iOS PWA test. Existing gesture, PDF, Daily Magazine, backup, sync and offline tests remain in the complete suite.

Physical iPad acceptance is outstanding. This Mac exposes Command Line Tools but no Xcode `simctl`/`xctrace`; the simulator integration also reports missing `simctl`. No iPad/iPhone was found in the USB inventory. The available native Safari window is locked Private Browsing. Physical frame rate, iPadOS compositing and installed-Home-Screen behavior are not claimed as verified.

On a real iPad, reopen the updated application online, open a multi-page full article in Pages mode and an original PDF, and check all four swipe directions, corner release/cancellation, single taps, links and pinch/Fit. Repeat portrait/landscape and in the Home Screen app; then check downloaded content in Airplane Mode. Reduce Motion must be off to assess the animation itself. An animated physical-device result is required before conclusively closing the reported iPad issue.

Timing follows the [requestAnimationFrame guidance](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame#examples): establish the animation's time origin from delivered callbacks so a delayed first frame does not make it jump. The regression asserts multiple actual intermediate paper poses after a forced delivery delay, alongside the existing suspended-frame recovery test.

The first production verification found that the deployment URL returned `no-cache` for the worker but the custom domain rewrote it to `max-age=14400`. The worker response now also requests `no-store`; this source-level policy is verified on the actual production hostname. No DNS, account, or zone-cache setting is changed. HTTP script caching is separate from the installed worker and the application's Cache Storage/IndexedDB downloads, which remain available offline.
