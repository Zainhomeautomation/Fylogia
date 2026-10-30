# Physical magazine page turning

The existing article and PDF readers share a bounded paper-fold renderer. Article animation projects only the already-laid-out visible text lines and images, using DOM ranges and computed typography. Full off-screen columns are never duplicated into every band; the complete accessible article stays in the original reader. Text pagination remains the measured, accessible DOM column layout; original PDF pages remain PDF.js canvases. No library, publisher-content policy, storage key, bookmark numbering or cloud schema is replaced.

## Rendering and interaction

A stationary region, a reflected reverse face and twelve tangent bands approximate a cylindrical, diagonal crease. The fold follows horizontal/vertical drag displacement with perspective, changing highlights and shade. This deforms the sheet locally; it does not rotate or slide the entire spread. It is a visual paper approximation, not a material/cloth physics simulation.

Facing pages hinge at a fixed center spine. The destination's opposite page supplies the turning sheet's reverse. In single-page mode the reverse is unprinted and the next page appears underneath. Existing buttons, keyboard arrows, single edge taps, corner drags and horizontal swipes use the same engine. Partial or cancelled turns return to the current page. Only one additional navigation intent can queue while a turn is active. Vertical scrolling, interior PDF double-tap/pinch zoom and outer iOS system-navigation margins remain separate.

Reduced motion performs navigation without the fold. Resize, unmount, a second pointer and visibility changes release temporary layers. Tutorial persistence uses the existing key. The actual reading DOM remains accessible; animation copies are inert and hidden from assistive technology.

## Original NASA Spinoff 2025

This publication is 56 native PDF pages, each already containing two square printed pages in a landscape spread. At sufficient fitted width (680 CSS pixels or more), its animation uses the central printed spine and turns one half of the native PDF canvas. The next original spread remains unchanged. Native PDF counters, bookmarks and reading positions remain 1–56; there is no destructive renumbering. Narrow layouts retain a complete original PDF spread with existing zoom rather than inventing or cropping its content. Other landscape PDFs are not presumed to contain two printed pages.

## Resource bounds

PDF preparation caches at most four adjacent page canvases, at most two megapixels each. Two shared decoded images, also capped at two megapixels each, supply front and reverse animation textures. Bands reuse the same image URLs rather than creating fourteen full PDF canvas copies. Eviction cancels pending renders and clears owned canvas buffers; all temporary object URLs are revoked after cancellation, completion or unmount. Native zoomed PDF rendering retains its separate existing five-megapixel bound.

The next spread is prepared before a committed animation. The painted destination stays over native canvases until they have rendered. A ten-second preparation deadline cancels a stalled turn and leaves the old page readable. Turn cleanup uses bounded timer polling, and text reflow has a timer-backed resize fallback so a suspended WebKit animation frame cannot strand a layer or prevent folding/unfolding. There is no permanent animation loop; frames run during gestures/transitions only. Imported magazines and downloaded articles use the same engine offline.

## Dependency evaluation

[StPageFlip](https://github.com/Nodlik/StPageFlip), [official documentation](https://nodlik.github.io/StPageFlip/), version 2.0.7, was inspected in a disposable directory. It has no dependencies and a roughly 43 KB browser module. Its rendering loop schedules frames continuously, and its destroy path does not stop that loop. Integrating its page collection would also duplicate the existing article pagination and PDF lifecycle. No dependency or vendored code was added; the bounded fold geometry is implemented locally.

## Validation boundaries

Regression tests cover nonidentical curved-band geometry, stationary content and spine, real reverse-page images, forward/backward order, one-tap edges, cancelled/partial drags, resize, second-pointer/reduced-motion interruption, object-URL cleanup, bounded cache resolution/eviction, native PDF progress, offline turns and existing zoom behavior. Existing browser tests also cover article pagination, reflow anchors, bookmarks, tutorial persistence and accessibility.

Chromium and WebKit with phone, unfolded/facing-page, iPad and desktop viewports are automated browser tests. Held-drag screenshots of the actual NASA publication provide visual verification. These are not physical iPhone Duo tests or a guarantee of 60 FPS on every device. Native iOS simulators require a full Xcode installation and runtimes; this Mac currently has Command Line Tools only, with no connected iPhone/iPad.

### Local measurement, 30 October 2026

The unthrottled Mac lab run measured six completed article turns per scenario, awaiting the changed page number and layer cleanup each time:

| Engine   | Viewport  | Median / p95 frame interval | Largest sampled Event Timing duration |
| -------- | --------- | --------------------------- | ------------------------------------- |
| Chromium | 390 × 844 | 16.7 / 16.8 ms              | 24 ms                                 |
| Chromium | 844 × 740 | 16.7 / 16.8 ms              | 40 ms                                 |
| WebKit   | 390 × 844 | 17 / 20 ms                  | 24 ms                                 |
| WebKit   | 844 × 740 | 17 / 23 ms                  | 32 ms                                 |

Each scenario finished with zero paper layers. Maximum frame gaps were 47–54 ms, so occasional missed frames remain; these measurements do not guarantee sustained physical-device 60 FPS. The separate real NASA PDF smoke run passed forward/backward order, held drag, fitted spine and bookmark/progress reopening in desktop Chromium, unfolded WebKit and phone WebKit. Its full-spread phone layout remains zoomable as described above.

Reproduce the real-publication smoke check with `node scripts/verify-physical-pages.mjs --url=https://fylogia.com/ --commit=EXPECTED_GIT_SHA --out=/tmp/fylogia-physical-pages`. This uses the actual external NASA PDF and may be affected by publisher availability; the regular offline PDF regressions use an original deterministic fixture instead.

### Long-article stress check

A separate isolated run used the longest authorized feed article (137,434 characters of article HTML), with asynchronous images removed only from the disposable test fixture. Native pagination and all source text remained intact. Visible-line projection reduced the unfolded page's peak element count from 25,958 to 2,596. On this Mac, unfolded WebKit median/p95 frame intervals improved from 41/247 ms to 17/19 ms; the largest sampled Event Timing duration fell from 392 to 40 ms. Chromium's unfolded p95 improved from 50.1 to 16.7 ms. Every scenario completed six turns and left zero paper layers. These are lab observations, not physical-device or field INP guarantees.

Reproduce with `node scripts/profile-reading.mjs --source=longest --text-only --url=https://fylogia.com/ --out=/tmp/fylogia-long-article`. The native article remains complete; the animation copies only measured visible text and images. Regression assertions bound each projected viewport's node count and check that projected text comes from the original source.
