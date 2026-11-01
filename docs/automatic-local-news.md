# Automatic Local News and independent regional preferences

The country is a relevance signal, not a licensing decision. No country or topic is banned by this feature.

## Country request and privacy

`functions/api/location.js` delegates to `server/location.mjs`. It reads only trusted `request.cf.country`, validates its ISO code and returns `{country: "OM"}` or `{country: null}` with private/no-store headers. Query parameters, cookies, client `CF-IPCountry` headers and device language are not country overrides. No IP, city, coordinates, device identifier or country history is serialized, logged or stored by this handler. No database or third-party lookup is involved.

Cloudflare provides the request property on all plans: [request documentation](https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties). Country can be unavailable, approximate or affected by a carrier/proxy; this is not proof of physical residence or content rights.

The browser asks only while Local News is selected. Its request omits credentials and bypasses caching. Country exists only in tab memory, refreshes on entry, return/focus after one minute or reconnection, and is paused while an article/Daily reader is open. It is not copied into preferences, IndexedDB, cloud synchronization or exports. A previously detected in-memory country can remain while offline; a fresh offline launch has no country. Service workers exclude API paths entirely. Offline article/PDF storage remains independent.

Manual country controls and locale suggestions have been removed. Existing manually selected country metadata remains readable for backup/older-client compatibility; it is ignored for current location and never overwritten with detected country.

## Local qualification

An explicit source registry uses national sections: Oman Observer (Oman), The Hindu (India), RNZ National, RTÉ Ireland, BBC UK, CBC Canada, Dawn Pakistan, NPR National, BMAS Germany government news, and Cyprus Mail’s Cyprus section. Cyprus Mail also requires its publisher-provided Cyprus News tag, protecting older cached entries from the former general feed. Kenya’s Capital FM entries require National News or County News tags.

General Times of Oman and ABC Australia feeds are not automatically local. Publisher headquarters and headline keywords alone do not establish a geographic connection. A cross-border story in a national section can still have a valid connection to that country. Regional/general publisher feeds remain accessible in broader views and existing follows are not changed.

Source changes: Cyprus Mail’s validated national URL is `https://cyprus-mail.com/category/cyprus/feed/`. Germany’s `https://bmas.bund.de/SiteGlobals/Functions/RSSFeed/DE/RSSNewsfeed/RSSNewsfeed.xml` supplies original-language government labour/social previews, not comprehensive national journalism. Its official [RSS terms](https://bmas.bund.de/EN/Services/RSS/rss.html) expressly allow embedding supplied RSS titles/introductions. No full-article or image licence is inferred. Country coverage remains limited; unknown/unsupported countries get an explanation and World News link, never fabricated local content.

## Six editorial regions

The preference is independent of detected country and persists through the existing local/backup/private-sync system:

| Selection     | Classification                                                                                                        |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| Worldwide     | All supported regions                                                                                                 |
| Middle East   | Explicit national-country membership or curated Middle East publisher coverage                                        |
| EU            | Explicit membership in the 27 EU member countries; UK/general Europe is not equivalent                                |
| North America | Explicit Northern America country membership or existing North America/US publisher coverage                          |
| Asia          | Explicit Asian country membership or curated Asia/India publisher coverage; Middle East is a separate editorial group |
| India         | India national membership or India-focused publisher coverage                                                         |

EU membership was checked against the [official EU directory](https://european-union.europa.eu/principles-countries-history/eu-countries_en) on 1 November 2026. Northern America here follows the existing editorial grouping (US, Canada, Greenland, Bermuda and Saint Pierre and Miquelon); this is not an assertion about every definition of the North American continent. Broader regional publisher coverage can include international developments; it is not article-level geocoding. Local qualification is stricter and does not use that broad fallback.

Worldwide is the default. Europe/United States values in older stored libraries have UI/filter aliases to EU/North America without rewriting original preference data. Other unsupported historical region labels display Worldwide until the user changes them. Source-directory region filters remain publication discovery tools; the six choices govern the saved Regional News preference. Bookmarks, sources, imported PDFs, saved articles, archives and progress retain their existing namespaces and schemas.

## Validation boundaries

Node tests construct controlled server-side `Request.cf` fixtures for OM, CY, DE, US and unknown/malicious inputs. Browser tests mock only the country response to simulate travel, with service workers blocked for those fixture tests because WebKit service-worker passthrough requests bypass Playwright route injection. A separate real Pages-runtime test installs the actual worker, verifies the country response shape/no-store behavior, confirms it is not available offline/cached, and opens a saved offline article. Physical travel, physical iPad testing and native Safari automation are not implied by these tests.
