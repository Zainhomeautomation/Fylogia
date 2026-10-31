import test from "node:test";
import assert from "node:assert/strict";
import {
  observeWorkerUpdates,
  updateReady,
  subscribeToUpdates,
} from "../src/pwa-update.ts";
test("worker notification ignores first installation, announces one real replacement and cleans up listeners", () => {
  const container = new EventTarget();
  container.controller = null;
  let notices = 0;
  const unsubscribe = subscribeToUpdates(() => notices++),
    stop = observeWorkerUpdates(container);
  container.controller = {};
  container.dispatchEvent(new Event("controllerchange"));
  assert.equal(updateReady(), false);
  assert.equal(notices, 0);
  container.controller = {};
  container.dispatchEvent(new Event("controllerchange"));
  assert.equal(updateReady(), true);
  assert.equal(notices, 1);
  container.dispatchEvent(new Event("controllerchange"));
  assert.equal(notices, 1);
  stop();
  unsubscribe();
  container.controller = {};
  container.dispatchEvent(new Event("controllerchange"));
  assert.equal(notices, 1);
});
