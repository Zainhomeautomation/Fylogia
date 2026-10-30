# Physical magazine page turning

The existing article and PDF readers share a bounded paper-fold renderer. Text pagination remains the measured, accessible DOM column layout; original PDF pages remain PDF.js canvases. No library, publisher-content policy, storage key, bookmark numbering or cloud schema is replaced.

## Rendering and interaction

A stationary region, a reflected reverse face and twelve tangent bands approximate a cylindrical, diagonal crease. The fold follows horizontal/vertical drag displacement with perspective, changing highlights and shade. This deforms the sheet locally; it does not rotate or slide the entire spread. It is a visual paper approximation, not a material/cloth physics simulation.

Facing pages hinge at a fixed center spine. The destination's opposite page supplies the turning sheet's reverse. In single-page mode the reverse is unprinted and the next page appears underneath. Existing buttons, keyboard arrows, single edge taps, corner drags and horizontal swipes use the same engine. Partial or cancelled turns return to the current page. Only one additional navigation intent can queue while a turn is active. Vertical scrolling, interior PDF double-tap/pinch zoom and outer iOS system-navigation margins remain separate.

Reduced motion performs navigation without the fold. Resize, unmount, a second pointer and visibility changes release temporary layers. Tutorial persistence uses the existing key. The actual reading DOM remains accessible; animation copies are inert and hidden from assistive technology.

## Original NASA Spinoff 2025

This publication is 56 native PDF pages, each already containing two square printed pages in a landscape spread. At sufficient fitted width (680 CSS pixels or more), its animation uses the central printed spine and turns one half of the native PDF canvas. The next original spread remains unchanged. Native PDF counters, bookmarks and reading positions remain 1–56; there is no destructive renumbering. Narrow layouts retain a complete original PDF spread with existing zoom rather than inventing or cropping its content. Other landscape PDFs are not presumed to contain two printed pages.

## Resource bounds

PDF preparation caches at most four adjacent page canvases, at most two megapixels each. Two shared decoded images, also capped at two megapixels each, supply front and reverse animation textures. Bands reuse the same image URLs rather than creating fourteen full PDF canvas copies. Eviction cancels pending renders and clears owned canvas buffers; all temporary object URLs are revoked after cancellation, completion or unmount. Native zoomed PDF rendering retains its separate existing five-megapixel bound.

The next spread is prepared before a committed animation. The painted destination stays over native canvases until they have rendered. A ten-second preparation deadline cancels a stalled turn and leaves the old page readable. There is no permanent animation loop; frames run during gestures/transitions only. Imported magazines and downloaded articles use the same engine offline.

## Dependency evaluation

[StPageFlip](https://github.com/Nodlik/StPageFlip), [official documentation](https://nodlik.github.io/StPageFlip/), version 2.0.7, was inspected in a disposable directory. It has no dependencies and a roughly 43 KB browser module. Its rendering loop schedules frames continuously, and its destroy path does not stop that loop. Integrating its page collection would also duplicate the existing article pagination and PDF lifecycle. No dependency or vendored code was added; the bounded fold geometry is implemented locally.

## Validation boundaries

Regression tests cover nonidentical curved-band geometry, stationary content and spine, real reverse-page images, forward/backward order, one-tap edges, cancelled/partial drags, resize, second-pointer/reduced-motion interruption, object-URL cleanup, bounded cache resolution/eviction, native PDF progress, offline turns and existing zoom behavior. Existing browser tests also cover article pagination, reflow anchors, bookmarks, tutorial persistence and accessibility.

Chromium and WebKit with phone, unfolded/facing-page, iPad and desktop viewports are automated browser tests. Held-drag screenshots of the actual NASA publication provide visual verification. These are not physical iPhone Duo tests or a guarantee of 60 FPS on every device. Native iOS simulators require a full Xcode installation and runtimes; this Mac currently has Command Line Tools only, with no connected iPhone/iPad.
