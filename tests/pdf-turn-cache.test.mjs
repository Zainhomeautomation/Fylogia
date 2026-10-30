import test from "node:test";
import assert from "node:assert/strict";
import { pdfTurnCache } from "../src/pdf-turn-cache.ts";

test("adjacent PDF cache deduplicates work, bounds resolution and evicts only its least-recent page", async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  const density = Object.getOwnPropertyDescriptor(
    globalThis,
    "devicePixelRatio",
  );
  const canvases = [];
  const calls = [];
  Object.defineProperty(globalThis, "devicePixelRatio", {
    value: 3,
    configurable: true,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement() {
        const canvas = { width: 0, height: 0, style: {}, setAttribute() {} };
        canvases.push(canvas);
        return canvas;
      },
    },
  });
  const pdf = {
    async getPage(n) {
      calls.push(n);
      return {
        getViewport({ scale }) {
          return { width: 600 * scale, height: 800 * scale };
        },
        render() {
          return { promise: Promise.resolve(), cancel() {} };
        },
      };
    },
  };
  const cache = pdfTurnCache(pdf, 1200, 1200);
  try {
    const pending = cache.get(1);
    assert.equal(cache.get(1), pending);
    const first = await pending;
    assert.ok(first.width * first.height <= 2_000_001);
    for (const n of [2, 3, 4]) await cache.get(n);
    assert.equal(cache.size, 4);
    await cache.get(1);
    await cache.get(5);
    assert.equal(cache.size, 4);
    assert.equal(canvases[1].width, 0);
    assert.ok(first.width > 0);
    assert.deepEqual(calls, [1, 2, 3, 4, 5]);
    cache.dispose();
    assert.ok(canvases.every((c) => c.width === 0 && c.height === 0));
    assert.equal(cache.size, 0);
    await assert.rejects(cache.get(6), { name: "AbortError" });
  } finally {
    cache.dispose();
    if (original) Object.defineProperty(globalThis, "document", original);
    else delete globalThis.document;
    if (density) Object.defineProperty(globalThis, "devicePixelRatio", density);
    else delete globalThis.devicePixelRatio;
  }
});
