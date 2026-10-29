# Organized interests and source discovery

This implementation milestone precedes the final production audit.

The catalog now contains 194 validated RSS/Atom feeds, including 15 new feeds. 9 policies support qualifying full text; 185 are preview-only. The 2026-10-29T17:40:23.105Z snapshot contains 1727 stories: 86 complete and 1641 previews. Latest per-source checks succeeded for 186/194 (95.88%); failed sources retain previous permitted entries and retrieval dates. Counts vary as publishers update.

## Interests and preservation

All 21 original category IDs and existing preference strings remain valid. Computing, Architecture, Engineering, History & Culture, and Marine add organized specialist choices, including operating systems, Linux/Windows/macOS, PC hardware, civil engineering, construction/materials/facades, archaeology/culture, diving/sailing and ocean science. Four groups and interest/topic search reduce scanning. Topics are deduplicated. Whole-word/alias matching avoids accidental AI matches inside “said” or Mac matches inside “machine.”

Recommendations represent selected interests before filling remaining slots by relevance, topics, authorized full-text capability, region and health. Existing users editing interests retain explicit followed/unfollowed choices instead of automatically re-following recommendations. New source categories are applied to old saved/history cards in memory; stored bodies, bookmarks, downloads and preference keys are not migrated or reset.

## New feeds

| Source | RSS/Atom | Categories | Content |
|---|---|---|---|
| Phoronix | [Publisher feed](https://www.phoronix.com/rss.php) | Computing, Technology, Gaming | Publisher preview |
| OMG! Ubuntu | [Publisher feed](https://www.omgubuntu.co.uk/feed) | Computing, Technology | Publisher preview |
| Windows Central | [Publisher feed](https://www.windowscentral.com/feeds.xml) | Computing, Technology, Gaming | Publisher preview |
| Tom’s Hardware | [Publisher feed](https://www.tomshardware.com/feeds.xml) | Computing, Technology | Publisher preview |
| BleepingComputer | [Publisher feed](https://www.bleepingcomputer.com/feed/) | Computing, Technology | Publisher preview |
| ArchDaily | [Publisher feed](https://feeds.feedburner.com/Archdaily) | Architecture, Engineering | Publisher preview |
| Architectural Digest | [Publisher feed](https://www.architecturaldigest.com/feed/rss) | Architecture | Publisher preview |
| Interesting Engineering | [Publisher feed](https://interestingengineering.com/feed) | Engineering, Technology | Publisher preview |
| Archaeology Magazine | [Publisher feed](https://archaeology.org/feed/) | History & Culture, Science | Publisher preview |
| World History Encyclopedia | [Publisher feed](https://www.worldhistory.org/rss2/?lang=en) | History & Culture | Publisher preview |
| gCaptain | [Publisher feed](https://gcaptain.com/feed/) | Marine, Business | Publisher preview |
| Sailing World | [Publisher feed](https://www.sailingworld.com/feed/) | Marine, Sports | Publisher preview |
| Construction Dive | [Publisher feed](https://www.constructiondive.com/feeds/news/) | Engineering, Business | Publisher preview |
| PADI Blog | [Publisher feed](https://blog.padi.com/feed/) | Marine, Travel | Publisher preview |
| Open Source Initiative | [Publisher feed](https://opensource.org/feed) | Computing, Technology | Qualifying OSI-authored full text |

## Full-text permission boundary

[OSI’s website](https://opensource.org/) states that its own authored content is licensed CC BY 4.0; this does not cover third-party licenses or arbitrary guest contributions. [Its staff page](https://opensource.org/about/team) establishes the bylines used by the conservative allowlist. Qualifying feed bodies retain author, original URL, license and adaptation notice. Third-party images/embeds are omitted. Unknown contributors, item-level restrictions, missing bodies and conflicting licenses remain previews. Nine of ten inspected OSI feed entries qualified; production imports only its bounded recent subset.

World History Encyclopedia provides licensed material but its inspected feed supplies excerpts, so it stays a preview source. Ubuntu Blog supplies body markup, but no blanket blog-text republication permission was established; it was also withheld from the catalog after repeated ingestion failures despite a valid curl response. OpenSource.net has an explicit CC BY-SA policy and full bodies but its main feed is stale (latest inspected post June 2025), so it was excluded. Other omitted candidates returned HTML, HTTP errors, no advertised feed, or duplicated Smithsonian Magazine already present in the catalog. No blocked article pages, paywalls or credentials were bypassed.

## Refresh budget and tests

The four-hour GitHub schedule and existing bounded/conditional fetches remain unchanged (at most 186 scheduled Pages builds in a 31-day month). No database, paid service or user content upload is added. Server regressions cover taxonomy completeness, word boundaries, health/topic/diversity recommendations, saved metadata preservation and OSI author/host/license/media boundaries. Browser regressions cover grouped search, niche recommendations, existing-user settings/follows/bookmarks/progress, responsive layouts and complete OSI article pagination. Viewport tests are not physical-device tests.

The image outage regression was confirmed with a controlled WebKit negative test: restoring the previous uncaught image-fetch behavior reproduced the same `TypeError: Load failed`. With the fallback restored, the fault test passes in Chromium and both WebKit viewports and page navigation continues. Missing-image responses are not cached.
