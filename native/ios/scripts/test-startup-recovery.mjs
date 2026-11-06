import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve("native/ios");
const modules = resolve(root, ".build/golden-source/node_modules");
const { webkit } = await import(resolve(modules, "playwright/index.mjs"));
const fixture = readFileSync(resolve(root, "web/parity-fixture.js"), "utf8");
const url = process.env.FYLOGIA_TEST_URL || "http://127.0.0.1:4176/";
const article = {
  id: "startup-preserved-story",
  sourceId: "nasa",
  source: "Fylogia startup fixture",
  title: "A preserved library story",
  url: "https://example.com/startup-preserved-story",
  published: "2026-11-02T09:00:00.000Z",
  categories: ["Science"],
  region: "Worldwide",
  content: "<p>Saved content remains available.</p>",
  excerpt: "Isolated startup fixture.",
  full: true,
};
const retained = {
  saved: [article],
  history: [article],
  progress: { [article.id]: 0.42 },
  custom: [],
  magazineReading: {},
  dailyEditions: [],
};
const seedScript = `
  for (const [key, value] of Object.entries(${JSON.stringify(retained)}))
    localStorage.setItem("folio.v1." + key, JSON.stringify(value));
`;
const readRetained = (keys) =>
  Object.fromEntries(
    keys.map((key) => [
      key,
      JSON.parse(localStorage.getItem("folio.v1." + key) || "null"),
    ]),
  );
function assertRetainedData(value) {
  assert.equal(value.saved[0]?.id, article.id);
  assert.equal(value.history[0]?.id, article.id);
  assert.equal(value.progress[article.id], 0.42);
}
const browser = await webkit.launch();
const results = [];

async function makeContext(initScript = `${fixture}\n${seedScript}`) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
  });
  await context.addInitScript(`
    window.__fylogiaNativeStartupEvents = [];
    const handlers = window.webkit?.messageHandlers || {};
    window.webkit = {
      ...(window.webkit || {}),
      messageHandlers: {
        ...handlers,
        fylogia: {
          postMessage(message) {
            if (message?.action === "startupStage")
              window.__fylogiaNativeStartupEvents.push(structuredClone(message));
          },
        },
      },
    };
    ${initScript}
  `);
  return context;
}

async function startupStages(page) {
  return page.evaluate(() =>
    window.__fylogiaNativeStartupEvents.map((message) => message.event.stage),
  );
}

async function waitForLibrary(page) {
  await page.locator(".native-story-list .story-open").first().waitFor({
    timeout: 15000,
  });
  assert.equal(await page.locator(".native-startup-recovery").count(), 0);
}

try {
  // Normal launch exercises an isolated WebKit profile with a successful DB.
  {
    const context = await makeContext();
    const page = await context.newPage();
    const errors = [];
    const diagnostics = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    page.on("console", (message) => {
      if (message.text().includes("[fylogia-startup]"))
        diagnostics.push(message.text());
    });
    const startedAt = performance.now();
    await page.goto(url);
    await waitForLibrary(page);
    const durationMs = Math.round(performance.now() - startedAt);
    assertRetainedData(
      await page.evaluate(readRetained, Object.keys(retained)),
    );
    assert.ok(
      diagnostics.some((line) => line.includes("library-read-complete")),
    );
    assert.ok(
      diagnostics.some((line) => line.includes("app-render-requested")),
    );
    await page.waitForFunction(() =>
      window.__fylogiaNativeStartupEvents.some(
        (message) => message.event?.stage === "feed-render-ready",
      ),
    );
    const stages = await startupStages(page);
    for (const stage of [
      "bootstrap-start",
      "local-library-start",
      "indexeddb-open-start",
      "indexeddb-open-ready",
      "indexeddb-read-start",
      "indexeddb-read-complete",
      "library-read-complete",
      "library-reconciliation-start",
      "library-reconciliation-complete",
      "library-write-batch-start",
      "library-write-batch-complete",
      "local-library-ready",
      "app-render-requested",
      "first-render-frame",
      "feed-preparation-complete",
      "feed-render-ready",
    ])
      assert.ok(stages.includes(stage), `missing forwarded stage ${stage}`);
    const forwarded = await page.evaluate(
      () => window.__fylogiaNativeStartupEvents,
    );
    assert.ok(forwarded.every((message) => message.action === "startupStage"));
    assert.ok(
      forwarded.every((message) =>
        Object.keys(message.event).every((key) =>
          [
            "stage",
            "elapsedMs",
            "operationElapsedMs",
            "failureStage",
            "errorName",
          ].includes(key),
        ),
      ),
      "startup bridge must not forward library content",
    );
    assert.deepEqual(errors, []);
    results.push({ scenario: "successful-open", durationMs, result: "PASS" });
    console.log("PASS successful-open", durationMs + "ms");
    await context.close();
  }

  // A transaction that never reports completion is aborted at its deadline;
  // localStorage remains the already-written mirror and startup can continue.
  {
    const context = await makeContext();
    await context.addInitScript(() => {
      const original = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function (...args) {
        const tx = original.apply(this, args);
        if (this.name !== "folio-personal-library" || tx.mode !== "readwrite")
          return tx;
        const handlers = {};
        let proxy;
        proxy = new Proxy(tx, {
          get(target, key) {
            if (key === "oncomplete") return handlers.oncomplete;
            const value = Reflect.get(target, key, target);
            return typeof value === "function" ? value.bind(target) : value;
          },
          set(target, key, value) {
            if (key === "oncomplete") {
              handlers.oncomplete = value;
              return true;
            }
            return Reflect.set(target, key, value, target);
          },
        });
        tx.addEventListener(
          "complete",
          (event) =>
            window.setTimeout(
              () => handlers.oncomplete?.call(proxy, event),
              6500,
            ),
          { once: true },
        );
        return proxy;
      };
    });
    const page = await context.newPage();
    const diagnostics = [];
    page.on("console", (message) => {
      if (message.text().includes("[fylogia-startup]"))
        diagnostics.push(message.text());
    });
    const startedAt = performance.now();
    await page.goto(url);
    await waitForLibrary(page);
    const startupDurationMs = Math.round(performance.now() - startedAt);
    assert.ok(
      startupDurationMs < 12000,
      "startup must stay within its deadline",
    );
    assert.ok(
      diagnostics.some((line) => line.includes("indexeddb-write-timeout")),
      "a stalled transaction must be logged with its elapsed time",
    );
    assert.ok(
      (await startupStages(page)).includes("indexeddb-write-timeout"),
      "native startup bridge must forward a delayed IndexedDB stage",
    );
    assertRetainedData(
      await page.evaluate(readRetained, Object.keys(retained)),
    );
    results.push({
      scenario: "delayed-transaction",
      result: "PASS",
      transactionDeadlineMs: 5000,
      startupDurationMs,
    });
    console.log("PASS delayed-transaction", startupDurationMs + "ms");
    await context.close();
  }

  // Read failure shows a retry page before touching local rows. Retry succeeds
  // after the isolated fixture releases the simulated failure.
  {
    const context = await makeContext();
    const page = await context.newPage();
    const diagnostics = [];
    page.on("console", (message) => {
      if (message.text().includes("[fylogia-startup]"))
        diagnostics.push(message.text());
    });
    await page.goto(new URL("apple-touch-icon.png", url).href);
    const downloaded = {
      id: article.id,
      article,
      downloadedAt: "2026-11-02T09:00:00.000Z",
      refreshedAt: "2026-11-02T09:00:00.000Z",
      images: [],
      missingImages: [],
      excludedImages: 0,
      bytes: 0,
      opaqueImages: 0,
      bookmarked: true,
      progress: 0.42,
    };
    await page.evaluate(async (record) => {
      await new Promise((resolve, reject) => {
        const request = indexedDB.open("fyllora-offline", 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("articles", { keyPath: "id" });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const tx = request.result.transaction("articles", "readwrite");
          tx.objectStore("articles").put(record);
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        };
      });
    }, downloaded);
    await context.addInitScript(() => {
      const original = IDBFactory.prototype.open;
      IDBFactory.prototype.open = function (...args) {
        if (!sessionStorage.getItem("fylogia-startup-open-failed")) {
          sessionStorage.setItem("fylogia-startup-open-failed", "1");
          throw new DOMException("Isolated storage failure", "SecurityError");
        }
        return original.apply(this, args);
      };
    });
    await page.goto(url);
    await page
      .getByRole("heading", { name: "We couldn’t open your library" })
      .waitFor({ timeout: 3000 });
    assert.deepEqual(
      await page.evaluate(readRetained, Object.keys(retained)),
      retained,
    );
    assert.ok(diagnostics.some((line) => line.includes("indexeddb-open-failed")));
    assert.ok(diagnostics.some((line) => line.includes("library-read-failed")));
    const failedStages = await startupStages(page);
    assert.ok(failedStages.includes("indexeddb-open-failed"));
    assert.ok(failedStages.includes("library-read-failed"));
    assert.ok(failedStages.includes("startup-failed"));
    assert.ok(failedStages.includes("recovery-screen-activated"));
    await page.getByRole("button", { name: "Retry opening Fylogia" }).click();
    await waitForLibrary(page);
    assertRetainedData(
      await page.evaluate(readRetained, Object.keys(retained)),
    );
    const offlineRecords = await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const request = indexedDB.open("fyllora-offline", 1);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const tx = request.result.transaction("articles", "readonly");
            const read = tx.objectStore("articles").getAll();
            tx.oncomplete = () => resolve(read.result);
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    assert.equal(offlineRecords.length, 1);
    assert.equal(offlineRecords[0].id, article.id);
    results.push({ scenario: "failed-read-and-retry", result: "PASS" });
    console.log("PASS failed-read-and-retry");
    await context.close();
  }

  // A storage write failure falls back to the verified localStorage copy.
  {
    const context = await makeContext();
    await context.addInitScript(() => {
      const original = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function (...args) {
        if (
          this.name === "folio-personal-library" &&
          (args[1] === "readwrite" || args[1]?.mode === "readwrite")
        )
          throw new DOMException("Isolated transaction failure", "AbortError");
        return original.apply(this, args);
      };
    });
    const page = await context.newPage();
    const diagnostics = [];
    page.on("console", (message) => {
      if (message.text().includes("[fylogia-startup]"))
        diagnostics.push(message.text());
    });
    await page.goto(url);
    await waitForLibrary(page);
    assertRetainedData(
      await page.evaluate(readRetained, Object.keys(retained)),
    );
    assert.ok(
      diagnostics.some((line) =>
        line.includes("indexeddb-write-failed"),
      ),
    );
    results.push({ scenario: "failed-write-fallback", result: "PASS" });
    console.log("PASS failed-write-fallback");
    await context.close();
  }

  console.log(JSON.stringify({ results }, null, 2));
} finally {
  await browser.close();
}
