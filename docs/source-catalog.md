# Source catalog validation — 29 October 2026

This is source-expansion validation, not the final production audit. The 26 original feed identifiers are preserved. Candidate discovery used a public [curated RSS directory](https://github.com/plenaryapp/awesome-rss-feeds) plus publisher feeds. Of 362 candidate URLs, 283 returned usable dated RSS/Atom during initial screening; aliases, duplicates, unsuitable categories and unreliable endpoints were excluded. The final catalog contains 179 feeds, not necessarily distinct publishers. Travel Dudes (403) and Psychology Today (repeated 502) were excluded before release.

## Measured refresh

- Snapshot: 2026-10-29T13:42:37.860Z.
- Successful refreshes, including conditional HTTP 304: 174/179 (97.21%).
- 8 full-text-capable sources; 171 conservative preview sources.
- 1610 unique stories: 78 full and 1532 previews; 29 duplicate feed entries combined.
- 74 conditional responses reused previous bodies.
- Failed refreshes: six-colors (fetch failed; 8 retained entries), eso-news (The operation was aborted due to timeout; 8 retained entries), fstoppers (fetch failed; 8 retained entries), naked-capitalism (fetch failed; 8 retained entries), yahoo-sports (fetch failed; 8 retained entries).

A failed current refresh is not reported as healthy because a previous request succeeded. All selected endpoints were validated with usable dated content during selection. Latest-entry age is shown separately: fresh ≤30 days, infrequent ≤90 days, stale >90 days. Technical blogs publish less frequently. Feeds are rechecked every four hours; availability and article counts vary.

## Reuse boundaries

Full text is enabled only for NASA, NASA Science, Global Voices, MIT News AI, Home Assistant, EFF, Fedora Magazine and Mozilla Hacks, with actual supplied bodies and item-specific exceptions. Existing policies are in [the baseline 26-feed review](feed-content-review.md). New policies: [EFF CC BY 4.0](https://www.eff.org/copyright), [Fedora original text CC BY-SA 4.0](https://fedoramagazine.org/terms-and-conditions/), [Mozilla Hacks CC BY-SA 3.0 or later](https://hacks.mozilla.org/about/). Author, source, license and transformation notices remain inside the article and its offline copy. Missing bylines, partner republications and incompatible licenses fall back to preview. EFF explicitly supplies its full text in description; generic descriptions remain previews. Third-party media is omitted from the new licensed copies. Existing NASA image restrictions remain unchanged.

A substantial RSS body alone is not permission. Mozilla main-blog and Raspberry Pi news are previews because equivalent news-blog permissions were not established. Custom feeds remain previews. No publisher pages or restricted content are scraped. Publisher-site access may require subscriptions. Magazine publisher news feeds are not licensed magazine PDF editions.

## Infrastructure and data preservation

Six concurrent requests, two per host, 12-second request timeouts and one bounded transient-error retry; no retry/proxy for 4xx denials. ETag/Last-Modified requests avoid unnecessary bodies. New feeds retain eight entries; originals retain eighteen. Failed requests preserve previous stories and last-success timestamps. The edition has a 20 MiB safety budget. Six scheduled refreshes per day mean at most 186 scheduled builds in 31 days, below [Cloudflare Pages Free 500 builds/month](https://developers.cloudflare.com/pages/platform/limits/); other code deployments still count. Standard runners for public repositories are [free](https://docs.github.com/en/billing/concepts/product-billing/github-actions). No paid services added.

Tracking URLs and same-publisher exact long headlines on the same date are merged; different-publisher similar headlines are not assumed identical. Primary article IDs remain unchanged. Alternate-feed membership preserves followed-source visibility; older saved entries, preferences, history and offline copies are not rewritten. New optional provenance fields round-trip through backups.

## Validated directory

| Source / feed                                                                                     | Topics                               | Region        | Reading               | Latest refresh         | Freshness |
| ------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------- | --------------------- | ---------------------- | --------- |
| [Global Voices](https://globalvoices.org/feed/)                                                   | World News, Politics, Technology     | Worldwide     | Full where authorized | OK                     | fresh     |
| [NASA Science](https://science.nasa.gov/feed/)                                                    | Science, Space                       | Worldwide     | Full where authorized | OK                     | fresh     |
| [NASA](https://www.nasa.gov/feed/)                                                                | Space, Science, Aviation, Technology | Worldwide     | Full where authorized | OK                     | fresh     |
| [BBC · World](https://feeds.bbci.co.uk/news/world/rss.xml)                                        | World News, Politics                 | Worldwide     | Preview               | OK                     | fresh     |
| [BBC · Technology](https://feeds.bbci.co.uk/news/technology/rss.xml)                              | Technology, AI, Smart Home           | Worldwide     | Preview               | OK                     | fresh     |
| [BBC · Business](https://feeds.bbci.co.uk/news/business/rss.xml)                                  | Business, Economy                    | Worldwide     | Preview               | OK                     | fresh     |
| [BBC · Health](https://feeds.bbci.co.uk/news/health/rss.xml)                                      | Health, Healthy Food                 | Worldwide     | Preview               | OK                     | fresh     |
| [BBC · Science](https://feeds.bbci.co.uk/news/science_and_environment/rss.xml)                    | Science, Space                       | Worldwide     | Preview               | OK                     | fresh     |
| [BBC · Sport](https://feeds.bbci.co.uk/sport/rss.xml)                                             | Sports                               | Worldwide     | Preview               | OK                     | fresh     |
| [BBC · Culture](https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml)                     | Entertainment, Photography           | Worldwide     | Preview               | OK                     | fresh     |
| [BBC · Middle East](https://feeds.bbci.co.uk/news/world/middle_east/rss.xml)                      | World News, Politics                 | Middle East   | Preview               | OK                     | fresh     |
| [BBC · Europe](https://feeds.bbci.co.uk/news/world/europe/rss.xml)                                | World News, Politics                 | Europe        | Preview               | OK                     | fresh     |
| [BBC · US & Canada](https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml)                    | World News, Politics                 | United States | Preview               | OK                     | fresh     |
| [BBC · Asia](https://feeds.bbci.co.uk/news/world/asia/rss.xml)                                    | World News, Politics                 | Asia          | Preview               | OK                     | fresh     |
| [The Hindu · India](https://www.thehindu.com/news/national/feeder/default.rss)                    | World News, Politics                 | India         | Preview               | OK                     | fresh     |
| [Apple Newsroom](https://www.apple.com/newsroom/rss-feed.rss)                                     | Apple, Technology                    | Worldwide     | Preview               | OK                     | fresh     |
| [Home Assistant](https://www.home-assistant.io/atom.xml)                                          | Smart Home, Technology               | Worldwide     | Full where authorized | OK                     | fresh     |
| [3DPrint.com](https://3dprint.com/feed/)                                                          | 3D Printing, Technology              | Worldwide     | Preview               | OK                     | fresh     |
| [MIT News · AI](https://news.mit.edu/rss/topic/artificial-intelligence2)                          | AI, Science, Technology              | Worldwide     | Full where authorized | OK                     | fresh     |
| [Ars Technica](https://feeds.arstechnica.com/arstechnica/index)                                   | Technology, Gaming, AI               | Worldwide     | Preview               | OK                     | fresh     |
| [Simple Flying](https://simpleflying.com/feed/)                                                   | Aviation, Travel                     | Worldwide     | Preview               | OK                     | fresh     |
| [The Guardian · Travel](https://www.theguardian.com/travel/rss)                                   | Travel                               | Worldwide     | Preview               | OK                     | fresh     |
| [Autoblog](https://www.autoblog.com/rss.xml)                                                      | Cars                                 | Worldwide     | Preview               | OK                     | fresh     |
| [The Guardian · Food](https://www.theguardian.com/food/rss)                                       | Cooking, Healthy Food                | Worldwide     | Preview               | OK                     | fresh     |
| [PC Gamer](https://www.pcgamer.com/rss/)                                                          | Gaming                               | Worldwide     | Preview               | OK                     | fresh     |
| [PetaPixel](https://petapixel.com/feed/)                                                          | Photography                          | Worldwide     | Preview               | OK                     | fresh     |
| [EFF](https://www.eff.org/rss/updates.xml)                                                        | Technology, Politics, World News     | Worldwide     | Full where authorized | OK                     | fresh     |
| [Fedora Magazine](https://fedoramagazine.org/feed/)                                               | Technology, Gaming                   | Worldwide     | Full where authorized | OK                     | fresh     |
| [Mozilla Hacks](https://hacks.mozilla.org/feed/)                                                  | Technology, AI                       | Worldwide     | Full where authorized | OK                     | aging     |
| [Mozilla Blog](https://blog.mozilla.org/en/feed/)                                                 | Technology, AI                       | Worldwide     | Preview               | OK                     | fresh     |
| [Al Jazeera English](https://www.aljazeera.com/xml/rss/all.xml)                                   | World News, Politics                 | Worldwide     | Preview               | OK                     | fresh     |
| [DW News](https://rss.dw.com/rdf/rss-en-all)                                                      | World News, Politics                 | Worldwide     | Preview               | OK                     | fresh     |
| [France 24](https://www.france24.com/en/rss)                                                      | World News, Politics                 | Worldwide     | Preview               | OK                     | fresh     |
| [UN News](https://news.un.org/feed/subscribe/en/news/all/rss.xml)                                 | World News, Politics, Health         | Worldwide     | Preview               | OK                     | fresh     |
| [Oman Observer](https://www.omanobserver.om/rssFeed/1)                                            | World News, Politics                 | Middle East   | Preview               | OK                     | fresh     |
| [Arab News](https://www.arabnews.com/rss.xml)                                                     | World News, Politics                 | Middle East   | Preview               | OK                     | fresh     |
| [Times of Oman](https://timesofoman.com/feed)                                                     | World News, Politics                 | Middle East   | Preview               | OK                     | fresh     |
| [Indian Express](https://indianexpress.com/feed/)                                                 | World News, Politics                 | India         | Preview               | OK                     | fresh     |
| [NDTV](https://feeds.feedburner.com/ndtvnews-top-stories)                                         | World News, Politics                 | India         | Preview               | OK                     | fresh     |
| [Hong Kong Free Press](https://hongkongfp.com/feed/)                                              | World News, Politics                 | Asia          | Preview               | OK                     | fresh     |
| [Dawn](https://www.dawn.com/feeds/home)                                                           | World News, Politics                 | Asia          | Preview               | OK                     | fresh     |
| [Japan Today](https://japantoday.com/feed)                                                        | World News, Politics                 | Asia          | Preview               | OK                     | fresh     |
| [Euronews](https://www.euronews.com/rss)                                                          | World News, Politics                 | Europe        | Preview               | OK                     | fresh     |
| [The Kyiv Independent](https://kyivindependent.com/news-archive/rss/)                             | World News, Politics                 | Europe        | Preview               | OK                     | fresh     |
| [NPR News](https://feeds.npr.org/1001/rss.xml)                                                    | World News, Politics, Business       | United States | Preview               | OK                     | fresh     |
| [PBS NewsHour](https://www.pbs.org/newshour/feeds/rss/headlines)                                  | World News, Politics                 | United States | Preview               | OK                     | fresh     |
| [Mint](https://www.livemint.com/rss/news)                                                         | Economy, Business                    | India         | Preview               | OK                     | fresh     |
| [The Hill](https://thehill.com/feed/?feed=partnerfeed-news-feed&format=rss)                       | Politics, World News                 | United States | Preview               | OK                     | fresh     |
| [Skift](https://skift.com/feed/)                                                                  | Travel, Business                     | Worldwide     | Preview               | OK                     | fresh     |
| [Motorsport.com](https://www.motorsport.com/rss/all/news/)                                        | Sports, Cars                         | Worldwide     | Preview               | OK                     | fresh     |
| [FlightGlobal](https://www.flightglobal.com/feed/)                                                | Aviation, Travel                     | Worldwide     | Preview               | OK                     | fresh     |
| [ESA Space News](https://www.esa.int/rssfeed/Our_Activities/Space_News)                           | Space, Science                       | Worldwide     | Preview               | OK                     | fresh     |
| [HomeKit News](https://homekitnews.com/feed/)                                                     | Smart Home, Apple                    | Worldwide     | Preview               | OK                     | fresh     |
| [Prusa Blog](https://blog.prusa3d.com/feed/)                                                      | 3D Printing, Technology              | Worldwide     | Preview               | OK                     | fresh     |
| [All News](https://www.investing.com/rss/news.rss)                                                | Business, Economy                    | Worldwide     | Preview               | OK                     | fresh     |
| [Budget Bytes](https://www.budgetbytes.com/feed/)                                                 | Cooking, Healthy Food                | Worldwide     | Preview               | OK                     | fresh     |
| [Federal Reserve News](https://www.federalreserve.gov/feeds/press_all.xml)                        | Economy, Business                    | United States | Preview               | OK                     | fresh     |
| [Six Colors](https://sixcolors.com/feed/)                                                         | Apple, Technology                    | Worldwide     | Preview               | Retained / unavailable | fresh     |
| [Digital Camera World](https://www.digitalcameraworld.com/feeds.xml)                              | Photography, Technology              | Worldwide     | Preview               | OK                     | fresh     |
| [OpenAI News](https://openai.com/news/rss.xml)                                                    | AI, Technology                       | Worldwide     | Preview               | OK                     | fresh     |
| [Cancer Research UK News](https://news.cancerresearchuk.org/feed/)                                | Health, Science                      | Worldwide     | Preview               | OK                     | fresh     |
| [GamingOnLinux](https://www.gamingonlinux.com/article_rss.php)                                    | Gaming, Technology                   | Worldwide     | Preview               | OK                     | fresh     |
| [Apartment Therapy](https://www.apartmenttherapy.com/main.rss)                                    | Entertainment, Smart Home            | Worldwide     | Preview               | OK                     | fresh     |
| [ProPublica](https://www.propublica.org/feeds/propublica/main)                                    | Politics, World News                 | United States | Preview               | OK                     | fresh     |
| [Electrek](https://electrek.co/feed/)                                                             | Cars, Technology                     | Worldwide     | Preview               | OK                     | fresh     |
| [Science News](https://www.sciencenews.org/feed)                                                  | Science, Health, Space               | Worldwide     | Preview               | OK                     | fresh     |
| [One Mile at a Time](https://onemileatatime.com/feed/)                                            | Travel, Aviation                     | Worldwide     | Preview               | OK                     | fresh     |
| [Autosport](https://www.autosport.com/rss/all/news/)                                              | Sports, Cars                         | Worldwide     | Preview               | OK                     | fresh     |
| [AirlineGeeks](https://airlinegeeks.com/feed/)                                                    | Aviation, Travel                     | Worldwide     | Preview               | OK                     | fresh     |
| [ESO News](https://www.eso.org/public/news/feed/)                                                 | Space, Science, Photography          | Worldwide     | Preview               | Retained / unavailable | fresh     |
| [AppleHome Authority](https://www.applehomeauthority.com/feed/)                                   | Smart Home, Apple                    | Worldwide     | Preview               | OK                     | fresh     |
| [Bambu Lab Blog](https://blog.bambulab.com/rss/)                                                  | 3D Printing, Technology              | Worldwide     | Preview               | OK                     | fresh     |
| [Economic Times](https://economictimes.indiatimes.com/rssfeedsdefault.cms)                        | Business, Economy                    | Worldwide     | Preview               | OK                     | fresh     |
| [Minimalist Baker](https://minimalistbaker.com/feed/)                                             | Cooking, Healthy Food                | Worldwide     | Preview               | OK                     | fresh     |
| [Bank of England News](https://www.bankofengland.co.uk/rss/news)                                  | Economy, Business                    | Europe        | Preview               | OK                     | fresh     |
| [TidBITS](https://tidbits.com/feed/)                                                              | Apple, Technology                    | Worldwide     | Preview               | OK                     | fresh     |
| [DIY Photography](https://www.diyphotography.net/feed/)                                           | Photography, Technology              | Worldwide     | Preview               | OK                     | fresh     |
| [Google DeepMind](https://deepmind.google/blog/rss.xml)                                           | AI, Science                          | Worldwide     | Preview               | OK                     | fresh     |
| [STAT News](https://www.statnews.com/feed/)                                                       | Health, Science                      | Worldwide     | Preview               | OK                     | fresh     |
| [GamesRadar+](https://www.gamesradar.com/feeds.xml)                                               | Gaming, Entertainment                | Worldwide     | Preview               | OK                     | fresh     |
| [Dezeen](https://www.dezeen.com/feed/)                                                            | Entertainment, Photography           | Worldwide     | Preview               | OK                     | fresh     |
| [InsideEVs](https://insideevs.com/rss/news/all/)                                                  | Cars, Technology                     | Worldwide     | Preview               | OK                     | fresh     |
| [ScienceAlert](https://www.sciencealert.com/feed)                                                 | Science, Space, Health               | Worldwide     | Preview               | OK                     | fresh     |
| [View from the Wing](https://viewfromthewing.com/feed/)                                           | Travel, Aviation                     | Worldwide     | Preview               | OK                     | fresh     |
| [Cycling Weekly](https://www.cyclingweekly.com/feeds.xml)                                         | Sports, Travel                       | Worldwide     | Preview               | OK                     | fresh     |
| [AeroTime](https://www.aerotime.aero/feed)                                                        | Aviation, Travel                     | Worldwide     | Preview               | OK                     | fresh     |
| [NOIRLab News](https://noirlab.edu/public/news/feed/)                                             | Space, Science, Photography          | Worldwide     | Preview               | OK                     | fresh     |
| [SmartHomeScene](https://smarthomescene.com/feed/)                                                | Smart Home, Technology               | Worldwide     | Preview               | OK                     | fresh     |
| [3D Printing Industry](https://3dprintingindustry.com/feed/)                                      | 3D Printing, Business                | Worldwide     | Preview               | OK                     | fresh     |
| [Forbes - Business](https://www.forbes.com/business/feed/)                                        | Business, Economy                    | Worldwide     | Preview               | OK                     | fresh     |
| [Pinch of Yum](https://pinchofyum.com/feed)                                                       | Cooking, Healthy Food                | Worldwide     | Preview               | OK                     | fresh     |
| [European Central Bank](https://www.ecb.europa.eu/rss/press.html)                                 | Economy, Business                    | Europe        | Preview               | OK                     | fresh     |
| [Apple Developer News](https://developer.apple.com/news/rss/news.rss)                             | Apple, Technology                    | Worldwide     | Preview               | OK                     | fresh     |
| [Fstoppers](https://fstoppers.com/feed)                                                           | Photography, Technology              | Worldwide     | Preview               | Retained / unavailable | fresh     |
| [Google Research](https://research.google/blog/rss/)                                              | AI, Science                          | Worldwide     | Preview               | OK                     | fresh     |
| [KFF Health News](https://kffhealthnews.org/feed/)                                                | Health, Politics                     | United States | Preview               | OK                     | fresh     |
| [Nintendo Life](https://www.nintendolife.com/feeds/latest)                                        | Gaming                               | Worldwide     | Preview               | OK                     | fresh     |
| [Design Milk](https://design-milk.com/feed/)                                                      | Entertainment, Photography           | Worldwide     | Preview               | OK                     | fresh     |
| [Motor1](https://www.motor1.com/rss/news/all/)                                                    | Cars                                 | Worldwide     | Preview               | OK                     | fresh     |
| [SciTechDaily](https://scitechdaily.com/feed/)                                                    | Science, Space, Health               | Worldwide     | Preview               | OK                     | fresh     |
| [The Travel Hack](https://thetravelhack.com/feed/)                                                | Travel                               | Worldwide     | Preview               | OK                     | fresh     |
| [Cyclingnews](https://www.cyclingnews.com/feeds.xml)                                              | Sports                               | Worldwide     | Preview               | OK                     | fresh     |
| [Airlive](https://airlive.net/feed/)                                                              | Aviation, Travel                     | Worldwide     | Preview               | OK                     | fresh     |
| [SpaceNews](https://spacenews.com/feed/)                                                          | Space, Business                      | Worldwide     | Preview               | OK                     | fresh     |
| [The Ambient](https://www.the-ambient.com/feed/)                                                  | Smart Home, Technology               | Worldwide     | Preview               | OK                     | fresh     |
| [VoxelMatters](https://www.voxelmatters.com/feed/)                                                | 3D Printing, Technology              | Worldwide     | Preview               | OK                     | fresh     |
| [Fortune](https://fortune.com/feed/fortune-feeds/?id=3230629)                                     | Business, Economy                    | Worldwide     | Preview               | OK                     | fresh     |
| [Skinnytaste](https://www.skinnytaste.com/feed/)                                                  | Cooking, Healthy Food                | Worldwide     | Preview               | OK                     | fresh     |
| [Naked Capitalism](https://www.nakedcapitalism.com/feed)                                          | Economy, Business                    | Worldwide     | Preview               | Retained / unavailable | fresh     |
| [iDownloadBlog](https://www.idownloadblog.com/feed/)                                              | Apple, Technology                    | Worldwide     | Preview               | OK                     | fresh     |
| [Amateur Photographer](https://amateurphotographer.com/feed/)                                     | Photography                          | Worldwide     | Preview               | OK                     | fresh     |
| [Hugging Face](https://huggingface.co/blog/feed.xml)                                              | AI, Technology                       | Worldwide     | Preview               | OK                     | fresh     |
| [WHO News](https://www.who.int/rss-feeds/news-english.xml)                                        | Health, World News                   | Worldwide     | Preview               | OK                     | fresh     |
| [Push Square](https://www.pushsquare.com/feeds/latest)                                            | Gaming                               | Worldwide     | Preview               | OK                     | fresh     |
| [Consequence](https://consequence.net/feed/)                                                      | Entertainment                        | Worldwide     | Preview               | OK                     | fresh     |
| [The Drive](https://www.thedrive.com/feed)                                                        | Cars, Technology                     | Worldwide     | Preview               | OK                     | fresh     |
| [Quanta Magazine](https://www.quantamagazine.org/feed/)                                           | Science, AI                          | Worldwide     | Preview               | OK                     | fresh     |
| [Atlas Obscura - Latest Articles and Places](https://www.atlasobscura.com/feeds/latest)           | Travel                               | Worldwide     | Preview               | OK                     | fresh     |
| [The Race](https://www.the-race.com/rss/)                                                         | Sports, Cars                         | Worldwide     | Preview               | OK                     | fresh     |
| [Airline Reporter](https://www.airlinereporter.com/feed/)                                         | Aviation, Travel                     | Worldwide     | Preview               | OK                     | fresh     |
| [Spaceflight Now](https://spaceflightnow.com/feed/)                                               | Space, Science                       | Worldwide     | Preview               | OK                     | fresh     |
| [CNX Software](https://www.cnx-software.com/feed/)                                                | Smart Home, Technology               | Worldwide     | Preview               | OK                     | fresh     |
| [3DPrintBeginner](https://3dprintbeginner.com/feed/)                                              | 3D Printing, Technology              | Worldwide     | Preview               | OK                     | fresh     |
| [Pure Xbox](https://www.purexbox.com/feeds/latest)                                                | Gaming                               | Worldwide     | Preview               | OK                     | fresh     |
| [Music Business Worldwide](https://www.musicbusinessworldwide.com/feed/)                          | Entertainment                        | Worldwide     | Preview               | OK                     | fresh     |
| [NVIDIA Blog](https://blogs.nvidia.com/feed/)                                                     | AI, Technology, Gaming               | Worldwide     | Preview               | OK                     | fresh     |
| [US Top News and Analysis](https://www.cnbc.com/id/100003114/device/rss/rss.html)                 | Business, Economy                    | Worldwide     | Preview               | OK                     | fresh     |
| [Sally's Baking Recipes](https://sallysbakingaddiction.com/feed/)                                 | Cooking                              | Worldwide     | Preview               | OK                     | fresh     |
| [Auto Express](https://www.autoexpress.co.uk/feed/all)                                            | Cars                                 | Worldwide     | Preview               | OK                     | fresh     |
| [Our World in Data](https://ourworldindata.org/atom.xml)                                          | Economy, Science, Health             | Worldwide     | Preview               | OK                     | fresh     |
| [The Mac Observer](https://www.macobserver.com/feed/)                                             | Apple, Technology                    | Worldwide     | Preview               | OK                     | fresh     |
| [DPReview](https://www.dpreview.com/feed/)                                                        | Photography, Technology              | Worldwide     | Preview               | OK                     | fresh     |
| [The Aviationist](https://theaviationist.com/feed/)                                               | Aviation, Technology                 | Worldwide     | Preview               | OK                     | fresh     |
| [Psyche](https://psyche.co/feed.rss)                                                              | Health, Entertainment                | Worldwide     | Preview               | OK                     | fresh     |
| [Smithsonian Magazine](https://www.smithsonianmag.com/rss/latest_articles/)                       | Science, Travel, Entertainment       | Worldwide     | Preview               | OK                     | fresh     |
| [PCGamesN](https://www.pcgamesn.com/mainrss.xml)                                                  | Gaming, Technology                   | Worldwide     | Preview               | OK                     | fresh     |
| [Yahoo Sports](https://sports.yahoo.com/rss/)                                                     | Sports                               | Worldwide     | Preview               | Retained / unavailable | fresh     |
| [RSS: News](https://pitchfork.com/feed/feed-news/rss)                                             | Entertainment                        | Worldwide     | Preview               | OK                     | fresh     |
| [Everything Everywhere](https://feeds2.feedburner.com/EverythingEverywhere/)                      | Travel                               | Worldwide     | Preview               | OK                     | fresh     |
| [Universe Today](https://www.universetoday.com/rss.xml)                                           | Space, Science                       | Worldwide     | Preview               | OK                     | fresh     |
| [Arduino Blog](https://blog.arduino.cc/feed/)                                                     | Smart Home, Technology, 3D Printing  | Worldwide     | Preview               | OK                     | fresh     |
| [Microsoft Research](https://www.microsoft.com/en-us/research/feed/)                              | AI, Science                          | Worldwide     | Preview               | OK                     | fresh     |
| [IEEE Spectrum](https://spectrum.ieee.org/feeds/feed.rss)                                         | Technology, AI, Science              | Worldwide     | Preview               | OK                     | fresh     |
| [King Arthur Baking](https://www.kingarthurbaking.com/blog/feed)                                  | Cooking                              | Worldwide     | Preview               | OK                     | fresh     |
| [Road & Track](https://www.roadandtrack.com/rss/all.xml/)                                         | Cars, Sports                         | Worldwide     | Preview               | OK                     | fresh     |
| [9to5Mac](https://9to5mac.com/feed/)                                                              | Apple, Technology                    | Worldwide     | Preview               | OK                     | fresh     |
| [500px](https://iso.500px.com/feed/)                                                              | Photography                          | Worldwide     | Preview               | OK                     | fresh     |
| [Nautilus](https://nautil.us/feed)                                                                | Science, Entertainment               | Worldwide     | Preview               | OK                     | fresh     |
| [Game Developer](https://www.gamedeveloper.com/rss.xml)                                           | Gaming, Technology                   | Worldwide     | Preview               | OK                     | fresh     |
| [www.espn.com - TOP](https://www.espn.com/espn/rss/news)                                          | Sports                               | Worldwide     | Preview               | OK                     | fresh     |
| [Song Exploder](https://feed.songexploder.net/songexploder)                                       | Entertainment                        | Worldwide     | Preview               | OK                     | fresh     |
| [The Points Guy Articles](https://feeds.feedburner.com/thepointsguy)                              | Travel                               | Worldwide     | Preview               | OK                     | fresh     |
| [Sky & Telescope](https://skyandtelescope.org/astronomy-news/feed/)                               | Space, Science, Photography          | Worldwide     | Preview               | OK                     | fresh     |
| [Adafruit Blog](https://blog.adafruit.com/feed/)                                                  | Smart Home, Technology, 3D Printing  | Worldwide     | Preview               | OK                     | fresh     |
| [CMU Machine Learning](https://blog.ml.cmu.edu/feed/)                                             | AI, Science                          | Worldwide     | Preview               | OK                     | aging     |
| [Android Authority](https://www.androidauthority.com/feed/)                                       | Technology, Smart Home               | Worldwide     | Preview               | OK                     | fresh     |
| [101 Cookbooks](https://www.101cookbooks.com/feed)                                                | Cooking, Healthy Food                | Worldwide     | Preview               | OK                     | fresh     |
| [BMWBLOG](https://feeds.feedburner.com/BmwBlog)                                                   | Cars                                 | Worldwide     | Preview               | OK                     | fresh     |
| [AppleInsider News](https://appleinsider.com/rss/news/)                                           | Apple, Technology                    | Worldwide     | Preview               | OK                     | fresh     |
| [Digital Photography School](https://feeds.feedburner.com/DigitalPhotographySchool)               | Photography                          | Worldwide     | Preview               | OK                     | fresh     |
| [Physics World](https://physicsworld.com/feed/)                                                   | Science, Space                       | Worldwide     | Preview               | OK                     | fresh     |
| [IGN News](https://www.ign.com/rss/articles/feed)                                                 | Gaming, Entertainment                | Worldwide     | Preview               | OK                     | fresh     |
| [/Film](https://feeds2.feedburner.com/slashfilm)                                                  | Entertainment                        | Worldwide     | Preview               | OK                     | fresh     |
| [Astronomy Magazine](https://www.astronomy.com/feed/)                                             | Space, Science                       | Worldwide     | Preview               | OK                     | fresh     |
| [Hackster](https://www.hackster.io/news.atom)                                                     | Smart Home, Technology, 3D Printing  | Worldwide     | Preview               | OK                     | fresh     |
| [Simon Willison](https://simonwillison.net/atom/everything/)                                      | AI, Technology                       | Worldwide     | Preview               | OK                     | fresh     |
| [Android Police](https://www.androidpolice.com/feed/)                                             | Technology, Smart Home               | Worldwide     | Preview               | OK                     | fresh     |
| [Chocolate & Zucchini](https://cnz.to/feed/)                                                      | Cooking, Healthy Food                | Worldwide     | Preview               | OK                     | fresh     |
| [BikeEXIF](https://www.bikeexif.com/feed)                                                         | Cars                                 | Worldwide     | Preview               | OK                     | fresh     |
| [Cult of Mac](https://www.cultofmac.com/feed)                                                     | Apple, Technology                    | Worldwide     | Preview               | OK                     | fresh     |
| [Strobist](https://feeds.feedburner.com/blogspot/WOBq)                                            | Photography                          | Worldwide     | Preview               | OK                     | aging     |
| [eLife Research](https://elifesciences.org/rss/recent.xml)                                        | Science, Health                      | Worldwide     | Preview               | OK                     | fresh     |
| [Steam News](https://store.steampowered.com/feeds/news.xml)                                       | Gaming                               | Worldwide     | Preview               | OK                     | fresh     |
| [ComingSoon.net – Movie Trailers, TV & Streaming News, and More](https://www.comingsoon.net/feed) | Entertainment                        | Worldwide     | Preview               | OK                     | fresh     |
| [EarthSky](https://earthsky.org/feed/)                                                            | Space, Science                       | Worldwide     | Preview               | OK                     | fresh     |
| [Espressif Developer Blog](https://developer.espressif.com/blog/index.xml)                        | Smart Home, Technology               | Worldwide     | Preview               | OK                     | fresh     |
| [Sebastian Raschka](https://magazine.sebastianraschka.com/feed)                                   | AI, Science                          | Worldwide     | Preview               | OK                     | fresh     |
| [Android Developers](https://developer.android.com/static/blog/atom.xml)                          | Technology                           | Worldwide     | Preview               | OK                     | fresh     |
| [Raspberry Pi News](https://www.raspberrypi.com/feed/)                                            | Smart Home, Technology, 3D Printing  | Worldwide     | Preview               | OK                     | fresh     |

## Country-focused coverage added 1 November 2026

Nine additional publisher RSS feeds were fetched, parsed and checked for dated entries within seven days before inclusion. All additions use attributed previews; public RSS delivery is not treated as full-article republication permission.

| Feed             | Country        | Official RSS                                       |
| ---------------- | -------------- | -------------------------------------------------- |
| Cyprus Mail      | Cyprus         | https://cyprus-mail.com/feed/                      |
| BBC News UK      | United Kingdom | https://feeds.bbci.co.uk/news/uk/rss.xml           |
| RTÉ Ireland      | Ireland        | https://www.rte.ie/feeds/rss/?index=/news/ireland/ |
| CBC Canada       | Canada         | https://www.cbc.ca/webfeed/rss/rss-canada          |
| RNZ National     | New Zealand    | https://www.rnz.co.nz/rss/national.xml             |
| ABC Australia    | Australia      | https://www.abc.net.au/news/feed/51120/rss.xml     |
| Dawn Pakistan    | Pakistan       | https://www.dawn.com/feeds/pakistan                |
| Capital FM Kenya | Kenya          | https://www.capitalfm.co.ke/news/feed/             |
| NPR National     | United States  | https://feeds.npr.org/1003/rss.xml                 |

The existing Oman Observer, Times of Oman and The Hindu India entries are reused, not duplicated. Publisher coverage is explicitly curated in `countries` and `news-geography.ts`; publisher headquarters or headline keywords do not automatically make an article local. A country-focused feed can still contain international stories. Countries without verified feeds show this limitation rather than unrelated news labeled local.

Chronology uses `news-chronology.ts` for both ingestion and browsing. RSS pubDate, Atom published and Dublin Core date are original-date candidates; Atom updated is stored separately. Missing/invalid/ambiguous-clock dates and implausibly future timestamps do not receive the retrieval time. Date-only publication fields retain date-only precision. Duplicate entries keep the earliest valid publication timestamp while preserving the selected authorized body. Pipeline version 10 forces one fresh publisher response before resuming conditional ETag/Last-Modified refreshes. The six-request concurrency limit and four-hour schedule remain unchanged.

Latest is the default; neither search relevance, Apple relevance, full-text availability nor publisher diversity can move an older story ahead in Latest. Those ranking signals are only used after explicitly selecting Most Relevant. Today/Yesterday use local calendar boundaries, including daylight-saving changes. New daily editions use that publication day; archived issues are not rewritten.
