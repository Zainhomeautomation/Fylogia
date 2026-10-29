# Full-article reading release — 29 October 2026

Implementation verification before the final production audit. Original source IDs, data keys, saved stories and downloaded copies are preserved.

## Current coverage

Snapshot 2026-10-29T14:18:34.952Z: 169/179 feeds refreshed successfully; 78 authorized full articles and 1533 previews. Eight full-text-capable source policies, 171 preview-only sources. Counts vary with updates; an allowlisted source can still supply previews when an individual item fails checks. All 26 baseline feeds returned usable XML during this refresh.

## Retrieval improvements

- NASA Science CDATA can include an HTML document-type example. It is now treated as inert feed content; actual XML DTD/entity declarations remain rejected.
- NASA image wrappers, sibling captions/credits and fourth-level headings are retained. Related-story blocks remain excluded.
- Video enclosures no longer become cover photographs; actual feed images and relative image URLs are handled explicitly.
- Server-side markup sanitization removes active content, unsafe URLs and event attributes before storage; the reader sanitizes again. No original article pages are scraped.
- Pipeline-version invalidation reprocesses bodies once after a parser/policy upgrade, rather than carrying an old extraction indefinitely through HTTP 304 responses. Subsequent refreshes remain conditional.
- Every edition article records availability, authorization, retrieval method, successful-retrieval timestamp and completeness. Full-looking bodies without verified permission remain previews and their completeness is unknown. Subscription status is recorded only when explicitly supplied by publisher metadata, never guessed from a paywall phrase or extraction success. Retained older records use a legacy-feed method and the prior successful timestamp. Offline availability remains in the existing per-device download records. No destructive data migration.

## Reading improvements

Preview readers use “Article preview — Continue reading at the original publisher” and a prominent Continue Reading link. Technical permission diagnostics are not shown in ordinary reading UI. Full articles retain attribution, byline, headings, figures and captions. A single-column preview never becomes an empty facing-page spread. The original link remains available.

Page images scale against the actual reading height. Figure captions are not constrained by a clipping maximum height. Pending measurements are coalesced and cancelled on unmount. Scrolling progress is persisted and restored, including transitions back to paginated mode; deliberate page navigation and existing Range anchors remain intact across viewport/font changes. The existing page-curl renderer is retained; its projected-strip bend is not a physically deformable paper simulation.

## Baseline 26-feed review

Bodies below are raw publisher content fields, not proof of complete text or permission. Full count is per-feed before cross-feed deduplication. API status means no additional key-free syndication permission has been established, not that no publisher API exists.

| Source | Feed entries | Body fields | Full imported | Decision |
|---|---:|---:|---:|---|
| [Global Voices](https://globalvoices.org/feed/) | 15 | 15 | 12 | Qualifying feed bodies with verified reuse policy |
| [NASA Science](https://science.nasa.gov/feed/) | 10 | 10 | 10 | Qualifying feed bodies with verified reuse policy |
| [NASA](https://www.nasa.gov/feed/) | 10 | 10 | 10 | Qualifying feed bodies with verified reuse policy |
| [BBC · World](https://feeds.bbci.co.uk/news/world/rss.xml) | 29 | 0 | 0 | Preview; no additional authorized full-content route established |
| [BBC · Technology](https://feeds.bbci.co.uk/news/technology/rss.xml) | 20 | 0 | 0 | Preview; no additional authorized full-content route established |
| [BBC · Business](https://feeds.bbci.co.uk/news/business/rss.xml) | 41 | 0 | 0 | Preview; no additional authorized full-content route established |
| [BBC · Health](https://feeds.bbci.co.uk/news/health/rss.xml) | 57 | 0 | 0 | Preview; no additional authorized full-content route established |
| [BBC · Science](https://feeds.bbci.co.uk/news/science_and_environment/rss.xml) | 42 | 0 | 0 | Preview; no additional authorized full-content route established |
| [BBC · Sport](https://feeds.bbci.co.uk/sport/rss.xml) | 63 | 0 | 0 | Preview; no additional authorized full-content route established |
| [BBC · Culture](https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml) | 24 | 0 | 0 | Preview; no additional authorized full-content route established |
| [BBC · Middle East](https://feeds.bbci.co.uk/news/world/middle_east/rss.xml) | 24 | 0 | 0 | Preview; no additional authorized full-content route established |
| [BBC · Europe](https://feeds.bbci.co.uk/news/world/europe/rss.xml) | 21 | 0 | 0 | Preview; no additional authorized full-content route established |
| [BBC · US & Canada](https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml) | 23 | 0 | 0 | Preview; no additional authorized full-content route established |
| [BBC · Asia](https://feeds.bbci.co.uk/news/world/asia/rss.xml) | 17 | 0 | 0 | Preview; no additional authorized full-content route established |
| [The Hindu · India](https://www.thehindu.com/news/national/feeder/default.rss) | 60 | 0 | 0 | Preview; no additional authorized full-content route established |
| [Apple Newsroom](https://www.apple.com/newsroom/rss-feed.rss) | 20 | 20 | 0 | Preview; no additional authorized full-content route established |
| [Home Assistant](https://www.home-assistant.io/atom.xml) | 20 | 20 | 11 | Qualifying feed bodies with verified reuse policy |
| [3DPrint.com](https://3dprint.com/feed/) | 10 | 10 | 0 | Preview; no additional authorized full-content route established |
| [MIT News · AI](https://news.mit.edu/rss/topic/artificial-intelligence2) | 50 | 50 | 18 | Qualifying feed bodies with verified reuse policy |
| [Ars Technica](https://feeds.arstechnica.com/arstechnica/index) | 20 | 20 | 0 | Preview; no additional authorized full-content route established |
| [Simple Flying](https://simpleflying.com/feed/) | 10 | 10 | 0 | Preview; no additional authorized full-content route established |
| [The Guardian · Travel](https://www.theguardian.com/travel/rss) | 22 | 0 | 0 | Preview; no additional authorized full-content route established |
| [Autoblog](https://www.autoblog.com/rss.xml) | 50 | 50 | 0 | Preview; no additional authorized full-content route established |
| [The Guardian · Food](https://www.theguardian.com/food/rss) | 31 | 0 | 0 | Preview; no additional authorized full-content route established |
| [PC Gamer](https://www.pcgamer.com/rss/) | 50 | 50 | 0 | Preview; no additional authorized full-content route established |
| [PetaPixel](https://petapixel.com/feed/) | 20 | 0 | 0 | Preview; no additional authorized full-content route established |

Existing [permission evidence](feed-content-review.md) and [expanded-source policies](source-catalog.md) apply. BBC section feeds and The Hindu supply excerpts. Apple supplies content fields but brief bodies. Ars Technica, Simple Flying, 3DPrint.com, PC Gamer and Autoblog can supply longer bodies; a public RSS field does not establish republication rights. NASA, Global Voices, MIT News and Home Assistant use the established full-feed policies.

## Official APIs and original-publisher reading

[Guardian Open Platform](https://open-platform.theguardian.com/access/) requires an API key and compliance with its content agreement; no account/key or new redistribution right is assumed. [MIT News terms](https://news.mit.edu/terms-of-use) already authorize the RSS syndication route with notices. NASA mission-data APIs are not a blanket replacement for news/article permissions. No other additional authorized, key-free full-news API was established in this review.

Representative original-article headers were checked for the 26 baseline feeds. An absent frame header does not establish embedding permission. No publisher in this review has both confirmed embedding permission and a supported frame policy; Fylogia therefore opens the original publisher in a separate browser tab/view, preserving the current reader and its progress. It does not proxy pages or remove frame/subscription restrictions.

| Source | Representative response / frame restrictions |
|---|---|
| global-voices | HTTP/2 200  |
| nasa-science | HTTP/2 200 ; x-frame-options: SAMEORIGIN |
| nasa | HTTP/2 200 ; x-frame-options: SAMEORIGIN |
| bbc-world | HTTP/2 200 ; x-frame-options: DENY |
| bbc-tech | HTTP/2 200 ; x-frame-options: DENY |
| bbc-business | HTTP/2 200 ; x-frame-options: DENY |
| bbc-health | HTTP/2 200 ; x-frame-options: DENY |
| bbc-science | HTTP/2 200 ; x-frame-options: DENY |
| bbc-sport | HTTP/2 200 ; x-frame-options: DENY |
| bbc-entertainment | HTTP/2 200 ; x-frame-options: DENY |
| bbc-me | HTTP/2 200 ; x-frame-options: DENY |
| bbc-europe | HTTP/2 200 ; x-frame-options: DENY |
| bbc-us | HTTP/2 200 ; x-frame-options: DENY |
| bbc-asia | HTTP/2 200 ; x-frame-options: DENY |
| hindu | HTTP/2 200 ; x-frame-options: SAMEORIGIN |
| apple | HTTP/2 200 ; x-frame-options: SAMEORIGIN |
| homeassistant | HTTP/2 200  |
| 3dprint | HTTP/2 200  |
| mit-ai | HTTP/2 200 ; x-frame-options: SAMEORIGIN |
| arstechnica | HTTP/2 403  |
| aviation | HTTP/2 200 ; x-frame-options: SAMEORIGIN |
| travel | HTTP/2 200 ; x-frame-options: SAMEORIGIN |
| cars | HTTP/2 200  |
| food | HTTP/2 200 ; x-frame-options: SAMEORIGIN |
| gaming | HTTP/2 200 ; x-frame-options: SAMEORIGIN |
| photo | HTTP/2 403 ; x-frame-options: SAMEORIGIN |

## Validation boundary

Automated Chromium and WebKit tests cover long text, exact paragraph preservation, fragment bounds, viewport/font changes, single/facing layouts, scroll-mode progress, media/captions and preview actions. Existing offline, PWA, PDF, curl, bookmark, recovery and navigation suites remain release requirements. No physical iPhone Duo/iPad/Mac hardware validation is claimed. Publisher outages, subscriptions and separate media rights remain limitations.
