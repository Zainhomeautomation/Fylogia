# iPad reader touch navigation

The existing article/PDF readers and paper-fold rendering remain in place. No storage keys, database schemas, bookmarks, offline records, publisher-content policies, dependencies or deployment settings change.

## Reproduced failures

- The shared pointer path classified a swipe as a paper drag at 12 px, then required 35% of the page width to commit. A 75 px swipe on a tablet was therefore cancelled, while the separate React touch-end fallback was suppressed because a pointer drag had already started. Wider pages made the discrepancy worse.
- Touch and pointer handlers competed for the same contact. Pointer cancellation/capture loss could end a paper drag while the native touch sequence continued; the fallback either missed the turn or risked a second turn. The old implementation failed the regression cases for both articles and PDFs in Chromium browser-generated touch input and WebKit event-contract tests.
- Article gestures starting on anchors were rejected outright. This prevented swiping over linked paragraphs and linked photographs. Ordinary link taps must still behave like links.
- PDF pinch state could remain blocked after the final finger lifted. Corner controls also needed independent native-touch ownership, multi-touch cancellation, keyboard/compatibility-click separation, and interruption cleanup.

## Changes

One native touch owner now handles contact start/move/end/cancel on the reading surface. Paired pointer events cannot double-handle that sequence. A non-passive touch-move listener prevents the browser default only after a horizontal reading gesture is recognized; vertical movement, form controls and the outer system-navigation edge are left alone. Mouse/pen input retains its pointer path, with window tracking when capture is unavailable.

Interior swipes use a fixed 60 px horizontal threshold, independent of spread width; terminal displacement also covers fast/coalesced input without move samples. Edge/corner drags retain proportional paper-fold geometry and natural cancellation. A bounded queued turn accepts a rapid follow-up gesture without skipping boundaries. Reversing an established drag past its origin cancels rather than committing in the wrong direction. Multi-touch cleanup includes contacts whose last release occurs on another element. Native corner touch handling uses the existing paper renderer; no card-slider substitute is introduced. Article links permit swiping but retain normal taps/clicks.

The duplicated React swipe fallbacks are removed. PDF custom pinch/pan and double-tap zoom remain, and final touch release clears the pinch lock. Article paginated mode permits browser pinch zoom. When the visual viewport is zoomed, reading-surface swipes yield to browser panning; fitted reading restores page gestures. Scrolling mode and gestures outside the reader remain native. Page and corner input state reset when the document becomes hidden, covering interruption/resume lifecycle without changing PWA storage or installation.

## Validation boundaries

Automated coverage includes short swipes in both directions, paired pointer cancellation, corner partial/cancel/complete folds, edge taps, portrait/landscape reflow, rapid turns, zoom/pinch isolation, linked text, pen-pointer events, interruption cleanup, offline relaunch, saved progress and PDF bookmarks. Existing pagination/text-integrity, keyboard, reduced-motion, download and library tests remain enabled.

Chromium uses browser-generated trusted touch input through its debugging protocol in addition to DOM event-contract tests. Playwright WebKit exercises native-listener contracts with TouchList-shaped DOM events because its exposed `Touch` constructor is not constructible. These checks are not physical iPadOS gesture-arbitration or Apple Pencil certification.

Apple capability inspection found XcodeBuildMCP installed but `list_sims` failed because `simctl` is missing. Only `/Library/Developer/CommandLineTools` is selected; `devicectl` is also missing, and the USB inventory did not expose an iPad/iPhone. Native Mac Safari WebDriver rejected session creation because **Allow remote automation** is disabled. No full Xcode/iPadOS runtime, physical iPad, Apple Pencil, or installed iPad PWA was used. Enabling those tests requires full Xcode plus an iPad simulator runtime, or an attached/trusted physical device; Mac Safari automation additionally requires the owner to enable its setting.

## Short physical-device checklist

1. Reload Safari, or close and reopen the Home Screen PWA once to receive the new code. **Do not clear website data.** Open a complete article in Pages mode. Swipe forward/backward with one finger, tap both page edges, and swipe across linked text. Confirm a link tap still opens the link.
2. Open a magazine/private PDF. Try a short interior swipe, a slow corner curl, a short cancelled corner drag and a completed drag. Repeat in portrait, landscape and immersive reading; turn rapidly and confirm there are no blank or skipped pages.
3. Pinch to zoom, pan with one finger while zoomed, then Fit and swipe again. Confirm pinch/panning does not turn pages and the first fitted swipe works. Try Apple Pencil edge/corner dragging if available.
4. Bookmark a PDF page and save article progress. Reopen both, background/resume the PWA, then test downloaded articles/Daily Editions and imported PDFs in Airplane Mode. Confirm progress/bookmarks persist. Public online PDFs are not advertised as offline downloads.

Platform references: [W3C Pointer Events: touch-action and event-stream suppression](https://www.w3.org/TR/pointerevents/), [MDN touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action), and [MDN pointercancel](https://developer.mozilla.org/en-US/docs/Web/API/Element/pointercancel_event). These describe browser arbitration; the actual iPadOS result still requires the physical checklist above.
