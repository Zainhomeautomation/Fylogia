import test from "node:test";
import assert from "node:assert/strict";
import { freshNavigation } from "../scripts/sw-navigation.mjs";
test("online PWA navigation bypasses stale HTTP HTML without replacing downloaded caches", async () => {
  let fallbackUsed = false;
  const request = new Request("https://fylogia.com/saved");
  const response = await freshNavigation(
    request,
    async (r) => {
      assert.equal(r.cache, "no-store");
      assert.equal(r.url, request.url);
      return new Response("new reader shell");
    },
    () => {
      fallbackUsed = true;
      return new Response("old reader shell");
    },
  );
  assert.equal(await response.text(), "new reader shell");
  assert.equal(fallbackUsed, false);
});
test("offline and failed deployment navigation retain the installed shell", async () => {
  for (const fetcher of [
    async () => {
      throw new TypeError("offline");
    },
    async () => new Response("not ready", { status: 503 }),
  ]) {
    const response = await freshNavigation(
      new Request("https://fylogia.com/magazines"),
      fetcher,
      () => new Response("installed offline shell"),
    );
    assert.equal(await response.text(), "installed offline shell");
  }
});
test("a stalled iPad connection falls back to its installed library promptly", async () => {
  const response = await freshNavigation(
    new Request("https://fylogia.com/saved"),
    (r) =>
      new Promise((_, reject) =>
        r.signal.addEventListener("abort", () =>
          reject(new TypeError("network stalled")),
        ),
      ),
    () => new Response("offline library"),
    5,
  );
  assert.equal(await response.text(), "offline library");
});
