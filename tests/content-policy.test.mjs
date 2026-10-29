import test from "node:test";
import assert from "node:assert/strict";
import { cleanGlobalVoices, feedText } from "../scripts/article-content.mjs";
test("licensed feed prose keeps attribution and license while excluding third-party images", () => {
  const body = cleanGlobalVoices(
    '<p>First paragraph.</p><div class="wp-caption"><img src="https://example.com/photo.jpg"><p>Photo credit.</p></div><h2>Context</h2><p>Last paragraph.</p><div class="gv-rss-footer">Translated by Contributor.</div>',
    "https://globalvoices.org/story/",
    "A & B",
  );
  assert.match(body, /A &amp; B/);
  assert.match(body, /creativecommons.org\/licenses\/by\/3.0/);
  assert.match(body, /<h2>Context<\/h2>/);
  assert.match(body, /Last paragraph/);
  assert.match(body, /Translated by Contributor/);
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

test("notice containers cannot hide a partner or alternate-license exception", () => {
  assert.equal(
    cleanGlobalVoices(
      '<div class="originally-published">Originally published by Partner.</div><p>Story text.</p>',
      "https://globalvoices.org/story/",
      "Author",
    ),
    "",
  );
  assert.equal(
    cleanGlobalVoices(
      '<div class="gv-rss-footer">CC BY-NC 4.0</div><p>Story text.</p>',
      "https://globalvoices.org/story/",
      "Author",
    ),
    "",
  );
  assert.match(
    cleanGlobalVoices(
      '<p class="originally-published">Originally published on <a href="https://globalvoices.org/story/">Global Voices</a></p><p>Story text.</p>',
      "https://globalvoices.org/story/",
      "Author",
    ),
    /Story text/,
  );
});
test("feed excerpts preserve block and line-break word boundaries and decode entities", () => {
  assert.equal(
    feedText(
      "<p>Walks</p><p>The vital moment &amp; more.</p>Rice<br>Here are <strong>two</strong> things.",
    ),
    "Walks The vital moment & more. Rice Here are two things.",
  );
});
