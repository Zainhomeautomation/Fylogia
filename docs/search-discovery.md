# Search discovery and owner setup

Fylogia is technically prepared for search discovery, not guaranteed indexing, ranking, rich results or Google Discover inclusion. No advertising, paid SEO service, Search Console account connection or DNS change is introduced.

## Public pages and content boundaries

The build prerenders the existing homepage onboarding and 56 public collection pages. `/discover` links to news and magazine directories. News collections cover the existing category catalog, including Technology, Apple, AI, Travel, Fashion, Sports, Local News, Regional News and World News. Magazine collections identify original editions separately from official publisher links. Pages without a relevant publication or edition are not generated.

Public collections have original descriptions and attributed publisher-site links, not copied article bodies. They use the established logo, palette and typography. Their native links work without JavaScript; category entry links open the existing app with a transient category filter and do not change interests, saved stories or preferences. The homepage remains the existing onboarding/personalised reader, with a small public-collection link footer on onboarding. There is no bot-specific rendering or user-agent sniffing.

The public collection pages ship without the application JavaScript bundle. All visitors and crawlers receive the same public collection content. Only the existing theme initializer reads the saved appearance preference. Public Local News does not request country; approximate country is requested only after entering Local News in the application.

`WebSite` and `Organization` identify the Fylogia project, without inventing a legal company name, address, registration or staff. `CollectionPage`, `BreadcrumbList` and publisher `WebSite` list items describe the directories. No `Article`, `NewsArticle`, article body, author claim or publication date is invented for aggregated reporting. A future original editorial article needs its own editorial and rights review before receiving article schema.

## Sitemap, canonical and exclusion policy

`npm run build:pages` automatically regenerates `/sitemap.xml`, `/robots.txt`, public HTML and per-route metadata. The sitemap contains 57 canonical URLs under `https://fylogia.com/`, with no parameters, article duplicates, private libraries, search results or invalid category pages. Optional `lastmod` is deliberately omitted: build time, deployment time and scheduled RSS retrieval are not truthful per-page editorial modification dates. Add it only when a content-revision record can support it.

Non-home app sections (including Settings, Sources, Saved Articles, History, Offline Library and personalised exploration) receive HTML and HTTP `noindex` directives. They remain crawlable so Google can see those directives. Private data is never server rendered. Structured public landing pages live under `/discover`, separate from personalised app views. Unknown pages return HTTP 404 with a real not-found document, including when an installed service worker is controlling navigation.

Raw feed JSON caches, PDFs and API routes are excluded from robots crawling; raw static data and original PDF responses additionally receive `X-Robots-Tag: noindex`. Robots directives are not access controls. Blocking a crawl can prevent a crawler from seeing `noindex`, and an already known URL can still appear as a bare URL. If any such resource is already indexed, use Search Console's removal workflow and a reviewed crawl/noindex transition. Do not change data access, delete user libraries or rewrite public Git history automatically. The pre-existing public Git/content snapshot architecture remains subject to the [compliance risk report](compliance/risk-report.md).

Existing offline downloads and shell namespaces are preserved. Only three discovery index documents are precached; once the reader’s service worker is installed, individual public collections are cached when visited online, avoiding an all-category download on every installation. Cached visits remain readable offline. API responses remain excluded from service-worker caching.

## Branding and Discover readiness

Every indexable page has a unique title and description, one self-canonical, Open Graph fields, English language and mobile viewport metadata. Social cards use the existing owned 1200×630 brand artwork; favicon, 48px PNG, SVG, Apple Touch Icon and PWA icons remain unchanged. `max-image-preview:large` permits large previews of these owned assets. This does **not** extend a publisher photograph's licence or declare the logo to be a Discover news photograph.

The original reader continues to show accurate publisher dates, attribution and permitted images. Cached full texts and previews are not automatically promoted into indexed Fylogia article pages. Discover is most likely to need timely, distinctive, rights-cleared editorial content and suitable non-logo images. This directory foundation alone does not establish that content inventory or guarantee inclusion.

## Google Search Console — owner checklist

1. Sign in to [Google Search Console](https://search.google.com/search-console) using the Google account that should own the property. Choose **Add property → Domain** and enter **fylogia.com**, without `https://` or a path.
2. Choose DNS TXT verification and copy the **actual value Google generates**. The agent cannot generate this account-specific ownership token. Do not share your Google password, recovery codes or general Cloudflare API tokens.
3. In the existing personal Cloudflare account: **fylogia.com → DNS → Records → Add record**. Add only this record:

   | Field   | Value                                                  |
   | ------- | ------------------------------------------------------ |
   | Type    | TXT                                                    |
   | Name    | `@` (the root fylogia.com zone)                        |
   | Content | Exact Google-issued `google-site-verification=…` value |
   | TTL     | Auto                                                   |
   | Proxy   | Not applicable to TXT                                  |

   The ellipsis is an explanation, **not a value to publish**. Keep existing TXT records, SPF, DKIM, DMARC, MX, Pages/domain records and certificate settings. No automated third-party DNS integration is necessary.

4. Return to Search Console and choose **Verify** after the TXT record is publicly visible. DNS propagation and Google's verification can take time. Keep the verification TXT record after success.
5. Under **Sitemaps**, submit **https://fylogia.com/sitemap.xml**. Inspect the homepage and representative URLs such as **https://fylogia.com/discover/news/technology**, **/discover/news/apple**, **/discover/news/world-news** and **/discover/magazines**. Use **Test live URL**, inspect rendered HTML, confirm the Google-selected canonical, then request indexing for these representative pages.
6. Review **Page indexing** for exclusions and errors, **Crawl stats**, **Core Web Vitals** and **Performance** for real search activity. Discover reporting appears only when Google has sufficient eligible traffic; its absence does not prove a setup defect. Do not use the Google Indexing API for ordinary news collection pages.
7. Validate JSON-LD with [Schema.org Validator](https://validator.schema.org/) and use [Rich Results Test](https://search.google.com/test/rich-results) for supported result types. Site-name `WebSite` metadata is not a Rich Results Test feature. Account-owned URL Inspection is the authoritative follow-up for how Google actually renders and indexes this deployment.

**Owner action outstanding:** Google sign-in, the unique verification value, DNS verification and sitemap submission. This release does not claim those account actions were performed.

## Performance and validation limits

Automated validation checks initial HTML, sitemap XML, route status, unique metadata, canonical URLs, structured-data shape/identity, exclusion headers, no-JavaScript rendering, preference preservation, offline navigation and reader regressions in Chromium and WebKit. Schema validation here checks syntax and semantic invariants; it is not a Google rich-result approval.

Lab performance measurements can assess load, LCP, CLS and main-thread blocking. They do not establish real-user 75th-percentile Core Web Vitals or field INP. Search Console/CrUX needs real traffic and time. Physical iPhone/iPad/iPhone Duo tests are separate from simulated viewports; native Safari automation was unavailable in the current session.

## Primary guidance

- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google sitemap generation and lastmod](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Google site names](https://developers.google.com/search/docs/appearance/site-names)
- [Google Organization metadata](https://developers.google.com/search/docs/appearance/structured-data/organization)
- [Google Discover guidance](https://developers.google.com/search/docs/appearance/google-discover)
- [Search Console ownership verification](https://support.google.com/webmasters/answer/9008080)
- [Cloudflare DNS record management](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/)
