# Today's Fylogia

Today's Fylogia is a personalized, local daily issue built from real followed stories. It adds a cover, featured story, sectioned contents and continuous reading through the existing article Reader. Cover images retain their complete aspect ratio so publisher graphics and photo credits are not cropped. It does not generate editorial prose, invent stories or fetch restricted publisher pages.

## Selection and stability

The issue includes up to 30 unique stories from followed sources that match the regional preference. Ranking balances freshness, selected interests/topics, publisher-supplied full-content eligibility, photography and page/scroll reading preference. A first pass gives sources space before filling the remainder. Sections use selected interests and the catalog's additive category labels. Ties use stable article IDs.

Opening or downloading an issue freezes its order for that local calendar day and preference combination. Background feed refreshes do not rearrange its table of contents. Changes to interests, followed sources, region or reading mode can create another issue. Up to seven issues are retained; an older issue's download remains in the independent Offline Library even after its metadata leaves this recent list.

## Reading and navigation

Contents open the existing Reader, keyed by article ID to isolate pagination and progress. The final page offers Next Story; in scrolling mode this control remains available alongside Contents. Advancing marks the previous story complete and restores the next story's own position. Partial scroll saves cannot overwrite a completed story after advancing. Arrow keys operate page mode only and do not reset scrolling progress or turn pages behind reader menus. Back from a story restores contents; Back from the issue restores the preceding interface and scroll position. Home closes both and returns to For You. Escape and keyboard focus trapping remain available.

Publisher previews use the existing reader's scrolling layout, avoiding misleading extra magazine leaves on short screens. The user's page/scroll preference is unchanged and continues to govern full articles. Previews retain Continue Reading and original attribution.

## Offline and preservation

Download Daily Edition uses the existing download queue, IndexedDB records, image permission rules and Cache Storage. It downloads the exact stories in the issue, with existing bookmark/progress metadata. No second body store or new download format is introduced. Offline contents clearly show how many issue stories are downloaded on this device. Unavailable stories explain the connection requirement; continuous reading skips unavailable stories. Missing or excluded images retain the existing text fallback.

The additive `dailyEditions` library section stores only IDs, titles, source labels, section labels, full/preview eligibility, dates and region. It has no publisher body, excerpt or image. Existing storage keys, profile IDs, bookmarks, preferences, PDFs and offline databases remain intact. JSON/encrypted backups include issue metadata; older version-1 backups without it still restore, defaulting that optional section to empty. User-requested import retains its existing explicit replacement behavior; download files remain separate.

## Limits and validation

This is a reading collection, not a newly typeset PDF or a replacement page engine. Public source feeds still determine article availability and language. There is no cloud copy of publisher content. Browser storage eviction can remove local issues/downloads, and iOS does not guarantee retention. Export remains available.

Regression tests cover selection, source/region rules, stable ordering, uniqueness, limits, metadata validation, cover/contents, Next Story, independent progress, bookmarks, previews, offline relaunch/page turning, viewport changes, reconnecting and legacy backup compatibility. Chromium and iPhone/iPad-sized WebKit are simulated environments; they do not establish physical iPhone Duo or iOS Home Screen behavior.
