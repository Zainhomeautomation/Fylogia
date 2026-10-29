import test from "node:test";
import assert from "node:assert/strict";
import { feedImage, bestSrcset } from "../src/feed-images.ts";
import { sanitizePublisherContent } from "../scripts/sanitize-content.mjs";
const base = "https://publisher.example/story/";
test("feed photographs prefer the largest bounded publisher image, never video or a guessed CDN URL", () => {
  const item = {
    "media:content": [
      {
        "@_url": "https://publisher.example/movie.mp4",
        "@_medium": "video",
        "@_width": 1920,
      },
      { "@_url": "/small.jpg", "@_medium": "image", "@_width": 320 },
      { "@_url": "/editorial.jpg", "@_medium": "image", "@_width": 1600 },
      { "@_url": "/huge.jpg", "@_medium": "image", "@_width": 8000 },
    ],
    "media:thumbnail": { "@_url": "/thumbnail.jpg" },
  };
  assert.equal(
    feedImage(item, "", base),
    "https://publisher.example/editorial.jpg",
  );
});
test("a publisher srcset upgrades the inline image and survives sanitation as one safe source", () => {
  const html =
    '<figure><img src="/tiny.jpg" srcset="/tiny.jpg 320w,/large.jpg 1600w,/huge.jpg 6000w" onerror="alert(1)"><figcaption>Publisher credit</figcaption></figure>';
  assert.equal(
    feedImage({}, html, base),
    "https://publisher.example/large.jpg",
  );
  const clean = sanitizePublisherContent(html, base);
  assert.match(clean, /src="https:\/\/publisher.example\/large.jpg"/);
  assert.match(clean, /Publisher credit/);
  assert.doesNotMatch(clean, /srcset|onerror/);
});
test("missing image metadata stays absent and safe thumbnail fallback remains supported", () => {
  assert.equal(feedImage({}, "<p>Only text.</p>", base), "");
  assert.equal(
    feedImage({}, '<img src="/fallback.jpg" srcset="/original.jpg">', base),
    "https://publisher.example/fallback.jpg",
  );
  assert.equal(
    feedImage(
      {},
      '<img src="/fallback.jpg" srcset="javascript:alert(1) 2x">',
      base,
    ),
    "https://publisher.example/fallback.jpg",
  );
  assert.equal(
    feedImage({ "media:thumbnail": { "@_url": "/thumb.jpg" } }, "", base),
    "https://publisher.example/thumb.jpg",
  );
  assert.equal(
    bestSrcset("javascript:alert(1) 2x, data:image/png;base64,x 1x", base),
    "",
  );
  assert.equal(
    feedImage(
      {
        "media:group": {
          "media:content": { "@_url": "/group.jpg", "@_medium": "image" },
        },
      },
      "",
      base,
    ),
    "https://publisher.example/group.jpg",
  );
});
