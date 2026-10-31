import test from "node:test";
import assert from "node:assert/strict";
import {
  beginLocalOperation,
  hasPendingLocalOperations,
  trackLocalOperation,
} from "../src/pending-operations.ts";
test("reload guard retains concurrent and nested imports/downloads until all have finished", async () => {
  const one = beginLocalOperation(),
    two = beginLocalOperation();
  assert.equal(hasPendingLocalOperations(), true);
  one();
  one();
  assert.equal(hasPendingLocalOperations(), true);
  two();
  assert.equal(hasPendingLocalOperations(), false);
  let release;
  const work = trackLocalOperation(async (value) => {
    await new Promise((r) => (release = r));
    return value;
  });
  const result = work(42);
  assert.equal(hasPendingLocalOperations(), true);
  release();
  assert.equal(await result, 42);
  assert.equal(hasPendingLocalOperations(), false);
});
test("failed offline/local operations always release their reload guard", async () => {
  const work = trackLocalOperation(async () => {
    throw Error("storage unavailable");
  });
  await assert.rejects(work(), /storage unavailable/);
  assert.equal(hasPendingLocalOperations(), false);
});
