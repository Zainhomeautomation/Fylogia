# Sports coverage

Measured snapshot: 2026-10-30T18:17:40.175Z. The directory has 278 feeds, including 59 Sports feeds (48 additions). 58/59 Sports feeds refreshed successfully; all 48 new feeds succeeded. Overall refresh: 273/278. Figures are a dated validation snapshot, not a future availability guarantee. The existing Yahoo Sports feed failed and retained its last eight entries; it is not reported healthy.

## Reader and preferences

Sports remains one existing interest with fourteen subtopics. The original Football and Formula 1 preference tokens are retained; the interface labels them Football (Soccer) and Formula 1 & Motorsport. No library schema or data migration changes. Following a sport adds relevant sources without replacing existing follows. For You and newly generated Daily Editions filter unrelated sports when individual sports are selected; non-sports interests remain available. Existing frozen Daily Editions and reading records are preserved. Reader Back retains the selected sport, category and search state.

The sport tabs and selector work inside Explore/For You and the existing Magazine Library. No separate sports application, scores backend or mandatory registration is introduced.

## Measured article coverage

| Sport                      | Classified real stories |
| -------------------------- | ----------------------: |
| Football (Soccer)          |                      73 |
| Basketball                 |                      40 |
| Formula 1 & Motorsport     |                      49 |
| Tennis                     |                      16 |
| American Football          |                      43 |
| Baseball                   |                      24 |
| Cricket                    |                      16 |
| Golf                       |                      17 |
| Combat Sports              |                      31 |
| Cycling                    |                      33 |
| Rugby                      |                      19 |
| Athletics & Olympics       |                      26 |
| Swimming & Water Sports    |                      32 |
| Outdoor & Adventure Sports |                      17 |

Classifications use sport-specific publisher feed contexts first, including duplicate-feed contexts, then bounded sport terminology for general feeds. NFL/college football and soccer are distinct. Different sports counts can overlap for multi-sport reports. The generic Sports view also includes unclassified general headlines.

## Rights and editions

All 59 Sports feeds are conservative publisher previews; zero are asserted to permit full-article republication. Feed-supplied headlines, excerpts, dates, attribution and available image URLs go through the existing sanitizer and reader. No restricted publisher page is scraped, expanded or bypassed. Downloaded previews remain previews, with attribution and original links.

Twelve sports magazine/publication references are available, including FourFourTwo, World Soccer, 11 FREUNDE, SLAM, Basketball Times Archive, Autosport, Motor Sport Magazine, Sports Illustrated, Runner’s World, Outside, Golf Digest and Tennis Magazine/Tennis.com. Five connect to verified existing article feeds; the others link directly to publishers. None is labeled a complete edition. No new sports PDF edition is hosted or embedded without explicit permission. Existing NASA/HackSpace editions and privately imported PDFs retain the same reader and storage.

[College Basketball Times](https://www.collegebasketballtimes.com/about-us) identifies itself as the archive rights holder; [Basketball Times Archives](https://www.collegebasketballtimes.com/archives) is linked as an archive, not a current issue. Free publisher-site access does not imply redistribution permission.

## Verification and unavailable candidates

Discovery used publisher-advertised RSS links, the [ESPN feed directory](https://www.espn.com/espn/news/story?page=rssinfo), [BBC feed documentation](https://support.bbc.co.uk/platform/feeds/SportFeeds.htm), and [Guardian RSS documentation](https://www.theguardian.com/help/feeds). Every enabled addition returned usable RSS/Atom, dated entries and publisher links using Fylogia’s production parser before inclusion. Dedicated league feeds include Premier League, Champions League, women’s football and World Cup. The World Cup feed is seasonal/aging; its actual September publication dates remain visible.

Formula1.com is link-only because its [RSS terms](https://www.formula1.com/en/information/legal-notices.7egvZU48hzrypubGBNcQKt) restrict aggregation and intermediate presentation. NBA’s documented Celtics RSS endpoint returned403. SLAM and Basketball Network blocked automated access. No usable official RSS was verified for Goal, UEFA, FIFA, WNBA, FIBA, EuroLeague, WTA, Tennis.com or ITF in this screening; their sites are not scraped or queried through undocumented APIs. The ATP RSS-information page was blocked. Reuters and The Athletic denied access; no paywalls were bypassed. Eurosport redirected to TNT Sports, whose advertised Google Publisher feed did not resolve. RacingNews365’s advertised RSS was intermittently reachable but failed subsequent checks, so no new source was enabled. These are screening limitations, not assertions that licensed integrations can never exist.

## Automatic updates and safety

The existing four-hour GitHub refresh, six-worker global cap, two-request per-host cap, conditional requests, one bounded retry, duplicate detection, feed health/freshness reporting, 20 MiB edition budget and Cloudflare Pages integration are unchanged. Added feeds do not add scheduled deployments. Offline caches, IndexedDB, saved articles, cloud sync and reading progress are untouched.

## Enabled feeds

A feed is a source endpoint, not necessarily a distinct publisher. Current failure status below is separate from initial validation.

| Source                                 | Publisher RSS                                                    | Latest refresh                       |
| -------------------------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| BBC · Sport                            | [RSS](https://feeds.bbci.co.uk/sport/rss.xml)                    | Success                              |
| Motorsport.com                         | [RSS](https://www.motorsport.com/rss/all/news/)                  | Success                              |
| Autosport                              | [RSS](https://www.autosport.com/rss/all/news/)                   | Success                              |
| Cycling Weekly                         | [RSS](https://www.cyclingweekly.com/feeds.xml)                   | Success                              |
| Cyclingnews                            | [RSS](https://www.cyclingnews.com/feeds.xml)                     | Success                              |
| The Race                               | [RSS](https://www.the-race.com/rss/)                             | Success                              |
| Yahoo Sports                           | [RSS](https://sports.yahoo.com/rss/)                             | Unavailable; cached entries retained |
| Road & Track                           | [RSS](https://www.roadandtrack.com/rss/all.xml/)                 | Success                              |
| ESPN                                   | [RSS](https://www.espn.com/espn/rss/news)                        | Success                              |
| Sailing World                          | [RSS](https://www.sailingworld.com/feed/)                        | Success                              |
| Runner’s World                         | [RSS](https://www.runnersworld.com/rss/all.xml/)                 | Success                              |
| BBC Sport · American Football          | [RSS](https://feeds.bbci.co.uk/sport/american-football/rss.xml)  | Success                              |
| BBC Sport · Athletics & Olympics       | [RSS](https://feeds.bbci.co.uk/sport/athletics/rss.xml)          | Success                              |
| BBC Sport · Baseball                   | [RSS](https://feeds.bbci.co.uk/sport/baseball/rss.xml)           | Success                              |
| BBC Sport · Basketball                 | [RSS](https://feeds.bbci.co.uk/sport/basketball/rss.xml)         | Success                              |
| BBC Sport · Boxing                     | [RSS](https://feeds.bbci.co.uk/sport/boxing/rss.xml)             | Success                              |
| BBC Sport · Cricket                    | [RSS](https://feeds.bbci.co.uk/sport/cricket/rss.xml)            | Success                              |
| BBC Sport · Cycling                    | [RSS](https://feeds.bbci.co.uk/sport/cycling/rss.xml)            | Success                              |
| BBC Sport · Football                   | [RSS](https://feeds.bbci.co.uk/sport/football/rss.xml)           | Success                              |
| BBC Sport · Formula 1                  | [RSS](https://feeds.bbci.co.uk/sport/formula1/rss.xml)           | Success                              |
| BBC Sport · Golf                       | [RSS](https://feeds.bbci.co.uk/sport/golf/rss.xml)               | Success                              |
| BBC Sport · MMA                        | [RSS](https://feeds.bbci.co.uk/sport/mixed-martial-arts/rss.xml) | Success                              |
| BBC Sport · Rugby                      | [RSS](https://feeds.bbci.co.uk/sport/rugby-union/rss.xml)        | Success                              |
| BBC Sport · Swimming & Water Sports    | [RSS](https://feeds.bbci.co.uk/sport/swimming/rss.xml)           | Success                              |
| BBC Sport · Tennis                     | [RSS](https://feeds.bbci.co.uk/sport/tennis/rss.xml)             | Success                              |
| BBC Sport · Outdoor & Adventure Sports | [RSS](https://feeds.bbci.co.uk/sport/winter-sports/rss.xml)      | Success                              |
| ESPN · College Sports                  | [RSS](https://www.espn.com/espn/rss/espnu/news)                  | Success                              |
| ESPN · MLB                             | [RSS](https://www.espn.com/espn/rss/mlb/news)                    | Success                              |
| ESPN · NBA                             | [RSS](https://www.espn.com/espn/rss/nba/news)                    | Success                              |
| ESPN · College Basketball              | [RSS](https://www.espn.com/espn/rss/ncb/news)                    | Success                              |
| ESPN · College Football                | [RSS](https://www.espn.com/espn/rss/ncf/news)                    | Success                              |
| ESPN · NFL                             | [RSS](https://www.espn.com/espn/rss/nfl/news)                    | Success                              |
| ESPN · Motorsport                      | [RSS](https://www.espn.com/espn/rss/rpm/news)                    | Success                              |
| ESPN · FC · Football                   | [RSS](https://www.espn.com/espn/rss/soccer/news)                 | Success                              |
| FourFourTwo                            | [RSS](https://www.fourfourtwo.com/feeds.xml)                     | Success                              |
| The Guardian · Basketball              | [RSS](https://www.theguardian.com/sport/basketball/rss)          | Success                              |
| The Guardian · Boxing                  | [RSS](https://www.theguardian.com/sport/boxing/rss)              | Success                              |
| The Guardian · Cricket                 | [RSS](https://www.theguardian.com/sport/cricket/rss)             | Success                              |
| The Guardian · Cycling                 | [RSS](https://www.theguardian.com/sport/cycling/rss)             | Success                              |
| The Guardian · Football                | [RSS](https://www.theguardian.com/football/rss)                  | Success                              |
| The Guardian · Formula 1               | [RSS](https://www.theguardian.com/sport/formulaone/rss)          | Success                              |
| The Guardian · Golf                    | [RSS](https://www.theguardian.com/sport/golf/rss)                | Success                              |
| The Guardian · Baseball                | [RSS](https://www.theguardian.com/sport/mlb/rss)                 | Success                              |
| The Guardian · MMA                     | [RSS](https://www.theguardian.com/sport/mma/rss)                 | Success                              |
| The Guardian · American Football       | [RSS](https://www.theguardian.com/sport/nfl/rss)                 | Success                              |
| The Guardian · Athletics & Olympics    | [RSS](https://www.theguardian.com/sport/olympic-games/rss)       | Success                              |
| The Guardian · Rugby                   | [RSS](https://www.theguardian.com/sport/rugby-union/rss)         | Success                              |
| The Guardian · Sport                   | [RSS](https://www.theguardian.com/uk/sport/rss)                  | Success                              |
| The Guardian · Surfing                 | [RSS](https://www.theguardian.com/sport/surfing/rss)             | Success                              |
| The Guardian · Swimming                | [RSS](https://www.theguardian.com/sport/swimming/rss)            | Success                              |
| The Guardian · Tennis                  | [RSS](https://www.theguardian.com/sport/tennis/rss)              | Success                              |
| Outside                                | [RSS](https://www.outsideonline.com/feed/)                       | Success                              |
| Sky Sports · News                      | [RSS](https://www.skysports.com/rss/0,20514,11095,00.xml)        | Success                              |
| Sports Illustrated                     | [RSS](https://www.si.com/feed)                                   | Success                              |
| The Guardian · Premier League          | [RSS](https://www.theguardian.com/football/premierleague/rss)    | Success                              |
| The Guardian · Champions League        | [RSS](https://www.theguardian.com/football/championsleague/rss)  | Success                              |
| The Guardian · World Cup               | [RSS](https://www.theguardian.com/football/world-cup-2026/rss)   | Success                              |
| The Guardian · Women’s Football        | [RSS](https://www.theguardian.com/football/womensfootball/rss)   | Success                              |
| Eurohoops                              | [RSS](https://www.eurohoops.net/en/feed/)                        | Success                              |

General-feed NFL/college URLs are explicitly distinguished from soccer. Failed publisher image loads use the existing editorial type-art cover, rather than a blank photograph slot.
