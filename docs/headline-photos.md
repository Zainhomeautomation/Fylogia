# Headline photo availability

The investigation distinguishes a missing publisher photo from an image-delivery failure. Fylogia does not fabricate photographs, scrape restricted pages, bypass a CDN denial, or relax its media-permission checks.

The inspected 31 October 10:50 UTC edition had 2,712 stories: 2,100 included an eligible image URL (77.4%) and 612 did not. A URL is not proof that its CDN will deliver it. Actual production requests reproduced 403 responses from an Investing/Reuters image host, and a NASA image host returned 429 during CI. Some Apple feeds supply only text; Daring Fireball's recent image-bearing entries were outside the bounded ingestion window. Photos with unverified reuse or explicit third-party copyright remain excluded where applicable. These figures describe that snapshot, not a promise about every personalized feed.

A separate application bug was reproduced in both Chromium and WebKit: after one image error, a card retained its fallback even after the same original image became available and the user reconnected or refreshed. Cards now retry failed images on reconnection or explicit Refresh. Healthy images keep their existing node and original URL. There is no polling retry loop, cache-busting URL, image proxy or placeholder photo presented as news.

Images decode asynchronously; the featured cover photo has high fetch priority. Image and fallback aspect ratios agree in the story grid so recovery does not move the headline. Missing or persistently denied photos retain the existing editorial publisher/category treatment. Offline image permissions and Cache Storage behavior are unchanged.

Regression tests use an explicitly labeled original transport fixture, never synthetic production news. Separate integration tests still decode real publisher photographs and test permitted downloaded images offline.
