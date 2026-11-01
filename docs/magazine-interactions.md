# Magazine interaction maintenance

## Confirmed causes and corrections

The feed exposed two pairs of arrows. Its visible edge buttons were excluded by the shared engine's interactive-element guard, so a reader could tap an arrow but could not drag the same visible target. Phone edge targets shrank to 27 CSS pixels. Hidden neighboring spreads were cloned into every printed paper band, increasing transient DOM work. The width/minimum-height breakpoint also left compact, unfolded screens in single-page mode while the persistent sidebar consumed their available space.

There is now one primary pair of semantic edge buttons, each at least 44 × 44 CSS pixels, with reserved outside gutters, keyboard focus, disabled boundaries, page counters and a nonblocking corner cue. The same target can tap or drag. A canceled or completed drag suppresses its compatibility click; a fresh contact starts normally. Horizontal trackpad momentum advances once per contact; vertical wheels and Ctrl-wheel zoom remain native. Touch swipes keep the existing single-owner Pointer/Touch handling, browser-edge exclusion and multi-touch cancellation.

The existing cylindrical paper renderer remains shared by the news feed, articles, Daily Magazine articles and PDFs. Drag updates are coalesced with requestAnimationFrame. Printed news snapshots contain only the visible spread, not hidden neighbors. The destination remains painted beneath the turning sheet; existing cancellation, reduced-motion, PDF preparation and animation cleanup remain in place. No storage keys, database versions, saved documents, source refreshes, SEO routes or deployment settings are replaced.

`magazineSpread` uses measured container width and viewport shape. Each news/article page needs at least 340 CSS pixels (article text size can raise this); PDFs retain a 370-pixel minimum and their existing fit checks. Tall portrait viewports use one page. Wide and near-square viewports use facing pages when there is enough space. Compact wide layouts reuse the existing navigation drawer to free reading width. The current story/text anchor remains authoritative during folding and resizing; spread boundaries are derived from it rather than overwriting it.

## Alternative evaluated

[StPageFlip](https://github.com/Nodlik/StPageFlip) / `page-flip@2.0.7` was evaluated in disposable Chromium and WebKit harnesses, without adding it to the application. The npm package is MIT licensed; its browser bundle measured 44,058 bytes / 10,401 bytes gzip. Both engines turned to page 2 and changed to portrait on resize without runtime errors. The prototype's long content overflowed its fixed page box, and keyboard arrows needed an application adapter. Those are integration responsibilities, not a claim that the library cannot support them.

The library's published API includes touch handling, shadows, portrait layout and click forwarding. Replacing the existing tested engine would still require custom article pagination, React action ownership, PDF caching, accessibility, offline support and progress restoration. It did not demonstrate a clear benefit sufficient to replace these integrations. The package was tested rather than adopted solely for its demo appearance; no additional runtime dependency is introduced.

## Verification boundaries

Regression tests cover actual intermediate curling poses, dragging the visible controls with mouse and native-style TouchEvents, canceled turns and compatibility clicks, trackpad momentum, vertical/pinch exclusions, 20 spreads forward and backward, odd article counts, exact article return, near-square unfolding, portrait/landscape layouts and bounded paper DOM. Existing headline measurement, offline, reader, original-PDF, navigation, data preservation and SEO suites remain release gates.

In a controlled first-spread comparison at 1194 × 834 with the same 45-story fixture, animated paper descendants fell from 1,400 to 952 (32%) and printed story copies from 42 to 28. Chromium frame medians were 16.7 ms before and after; headless WebKit medians were 33 ms before and after. First visible fold was about 47 ms in Chromium and 98 ms in WebKit. These single-run figures show less DOM work, not a proven universal speedup or native iPad frame rate.

Controlled headless measurements are lab evidence, not a physical-device 60-FPS guarantee. Compare the same fixture, viewport, fonts and browser before/after; keep screenshots and measurements outside the repository. Do not infer physical iPad, Apple Pencil, Home Screen PWA or native Safari behavior from Playwright WebKit.

The current Mac's simulator inventory failed because `simctl` is unavailable under the selected Command Line Tools installation. Native Safari WebDriver refused a session because **Allow remote automation** is disabled. No Xcode/iPadOS runtime or connected physical iPad test is claimed.

## Physical Apple release checklist

On Safari and an installed iPad Home Screen PWA, test portrait/landscape; single taps; fast/slow swipes; dragging and returning a corner; links and bookmarking; native vertical scrolling; two-finger zoom; PDF zoom/pan; 20 spreads each way; folding/rotation equivalents; Back to the same spread; Airplane Mode downloaded reading; reconnecting; and Reduce Motion. Check safe areas, browser-toolbar changes, unexpected duplicate turns, shadows, blank pages and readable text. Apple Pencil should be checked separately when a device is available. To automate native Mac Safari, enable its remote-automation setting; iOS Simulator requires full Xcode with a suitable simulator runtime.
