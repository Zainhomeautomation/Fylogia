import test from "node:test";
import assert from "node:assert/strict";
import { cleanGlobalVoices } from "../scripts/article-content.mjs";
test("licensed feed prose keeps attribution and license while excluding third-party images", () => {
  const body = cleanGlobalVoices(
    '<p>First paragraph.</p><div class="wp-caption"><img src="https://example.com/photo.jpg"><p>Photo credit.</p></div><h2>Context</h2><p>Last paragraph.</p>',
    "https://globalvoices.org/story/",
    "A & B",
  );
  assert.match(body, /A &amp; B/);
  assert.match(body, /creativecommons.org\/licenses\/by\/3.0/);
  assert.match(body, /<h2>Context<\/h2>/);
  assert.match(body, /Last paragraph/);
  assert.doesNotMatch(body, /<img|photo.jpg/);
});
test("missing bylines and explicit republication exceptions stay previews", () => {
  assert.equal(
    cleanGlobalVoices("<p>Text</p>", "https://globalvoices.org/story/", ""),
    "",
  );
  assert.equal(
    cleanGlobalVoices(
      "<p>Republished with permission.</p>",
      "https://globalvoices.org/story/",
      "Author",
    ),
    "",
  );
});

test("partner bylines and alternate licenses override the general source license", () => {
  assert.equal(
    cleanGlobalVoices(
      "<p>This article was originally published by Partner.</p>",
      "https://globalvoices.org/story/",
      "Author",
    ),
    "",
  );
  assert.equal(
    cleanGlobalVoices(
      '<p>Licensed under <a href="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC</a>.</p>',
      "https://globalvoices.org/story/",
      "Author",
    ),
    "",
  );
});
