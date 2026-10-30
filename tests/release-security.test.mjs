import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { securityHeaders } from "../scripts/write-security-headers.mjs";
import { feedArticle } from "../scripts/feed-content.mjs";
test("CSP hashes the precise startup script without allowing inline event handlers or external script hosts", () => {
  const code = "\n  document.documentElement.dataset.theme='light';\n";
  const result = securityHeaders(
    "script-src 'self' {{FYLOGIA_INLINE_SCRIPT_HASHES}}; script-src-attr 'none'",
    `<script>${code}</script><script src="/app.js"></script>`,
  );
  assert.match(
    result,
    new RegExp(
      createHash("sha256")
        .update(code)
        .digest("base64")
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ),
  );
  assert.doesNotMatch(result, /unsafe-inline|\{\{|https:/);
  assert.throws(() =>
    securityHeaders(
      "{{FYLOGIA_INLINE_SCRIPT_HASHES}}",
      "<script src='/app.js'></script>",
    ),
  );
});
test("NASA third-party copyrighted photographs are omitted without truncating agency prose or permitted figures", () => {
  const paragraph =
    "NASA agency text remains available in the authorized feed. ".repeat(8);
  const a = feedArticle(
    {
      title: "Rights regression",
      link: "https://www.nasa.gov/rights-test/",
      pubDate: "2026-10-29T12:00:00Z",
      "content:encoded": `<p class="wp-block-paragraph">${paragraph}</p><div class="wp-block-image"><figure><img src="https://www.nasa.gov/restricted.jpg"></figure><figcaption>Credit: © External Museum</figcaption></div><div class="wp-block-image"><figure><img src="https://www.nasa.gov/allowed.jpg"></figure><figcaption>Credit: NASA</figcaption></div><p class="wp-block-paragraph">Final agency paragraph.</p>`,
    },
    {
      id: "nasa",
      name: "NASA",
      full: true,
      categories: ["Space"],
      region: "Worldwide",
    },
  );
  assert.equal(a.full, true);
  assert.equal(a.image, undefined);
  assert.equal(a.offlineImagesAllowed, false);
  assert.doesNotMatch(a.content, /restricted.jpg|External Museum/);
  assert.match(a.content, /allowed.jpg/);
  assert.match(a.content, /Final agency paragraph/);
  assert.ok(a.content.includes(paragraph));
});
