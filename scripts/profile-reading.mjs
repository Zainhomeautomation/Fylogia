// Optional lab tooling. Uses only disposable browser profiles, never a user's library.
import { chromium, webkit } from "@playwright/test";
import { mkdtemp, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { defaults } from "../src/catalog.ts";
const arg = (name, fallback) =>
  process.argv.find((a) => a.startsWith(name + "="))?.slice(name.length + 1) ||
  fallback;
const url = arg("--url", "https://fylogia.com/"),
  output = resolve(arg("--out", join(tmpdir(), "fylogia-reading-profile")));
const origin = new URL(url);
if (
  origin.username ||
  origin.password ||
  !["http:", "https:"].includes(origin.protocol)
)
  throw new Error("Use a public app URL without credentials.");
await mkdir(output, { recursive: true });
const prefs = {
  ...defaults,
  complete: true,
  sourceIds: ["nasa", "bbc-tech", "global-voices"],
  interests: ["Space", "Technology", "World News"],
};
async function command(exe, args, env) {
  await new Promise((resolve, reject) => {
    const child = spawn(exe, args, { stdio: "inherit", env });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error("Benchmark command exited " + code)),
    );
  });
}
if (process.argv.includes("--lighthouse")) {
  const profile = await mkdtemp(join(tmpdir(), "fylogia-lighthouse-"));
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  const context = await chromium.launchPersistentContext(profile, {
    headless: true,
    args: ["--remote-debugging-port=" + port],
  });
  try {
    const page = context.pages()[0];
    await page.goto(url);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.evaluate(async (p) => {
      localStorage.setItem("folio.v1.preferences", JSON.stringify(p));
      localStorage.setItem(
        "folio.local.savedAt.preferences",
        String(Date.now() + 1),
      );
      for (const r of await navigator.serviceWorker.getRegistrations())
        await r.unregister();
      for (const key of await caches.keys()) await caches.delete(key);
    }, prefs);
    await page.goto("about:blank");
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.clearBrowserCache");
    await cdp.detach();
    await command(
      "npm",
      [
        "exec",
        "--yes",
        "--package=lighthouse@13.6.0",
        "--",
        "lighthouse",
        url,
        "--port=" + port,
        "--disable-storage-reset",
        "--only-categories=performance,accessibility,best-practices,seo",
        "--output=json",
        "--output-path=" + join(output, "home-lighthouse.json"),
        "--quiet",
      ],
      { ...process.env, CHROME_PATH: chromium.executablePath() },
    );
    const result = JSON.parse(
      await readFile(join(output, "home-lighthouse.json"), "utf8"),
    );
    console.log(
      JSON.stringify(
        {
          scenario:
            "personalized home; preserved test preferences; HTTP and service-worker caches cleared",
          version: result.lighthouseVersion,
          scores: Object.fromEntries(
            Object.entries(result.categories).map(([k, v]) => [k, v.score]),
          ),
          lcp: result.audits["largest-contentful-paint"].numericValue,
          cls: result.audits["cumulative-layout-shift"].numericValue,
          tbt: result.audits["total-blocking-time"].numericValue,
          warnings: result.runWarnings,
        },
        null,
        2,
      ),
    );
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
} else {
  const results = [];
  for (const [engine, type] of [
    ["chromium", chromium],
    ["webkit", webkit],
  ])
    for (const [layout, viewport] of [
      ["phone", { width: 390, height: 844 }],
      ["unfolded", { width: 844, height: 740 }],
    ]) {
      const browser = await type.launch(),
        context = await browser.newContext({ viewport, hasTouch: true });
      try {
        const page = await context.newPage();
        const data = await (
          await context.request.get(new URL("data/edition.json", url).href)
        ).json();
        const article = data.articles
          .filter((a) => a.full && a.sourceId === "nasa")
          .sort((a, b) => b.content.length - a.content.length)[0];
        if (!article)
          throw new Error(
            "No current authorized NASA article for the lab profile.",
          );
        await page.addInitScript(
          ({ prefs, article }) => {
            localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
            localStorage.setItem("folio.v1.saved", JSON.stringify([article]));
          },
          { prefs, article },
        );
        await page.goto(new URL("saved", url).href);
        await page.locator(".story-open").first().click();
        await page.locator(".reader").waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => {
          const n = document.querySelector(".reader-footer [role=status]");
          return n && /of [2-9]|of \d{2}/.test(n.textContent);
        });
        await page.evaluate(() => {
          const state = (window.fylogiaLab = {
            startedAt: performance.now(),
            frames: [],
            events: [],
            running: true,
            peakNodes: 0,
            baseNodes: document.getElementsByTagName("*").length,
          });
          function tick(t) {
            state.frames.push(t);
            if (document.querySelector(".paper-fold"))
              state.peakNodes = Math.max(
                state.peakNodes,
                document.getElementsByTagName("*").length,
              );
            if (state.running) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
          try {
            new PerformanceObserver((list) => {
              for (const e of list.getEntries())
                if (e.interactionId && e.startTime >= state.startedAt)
                  state.events.push({
                    interactionId: e.interactionId,
                    duration: e.duration,
                    name: e.name,
                  });
            }).observe({
              type: "event",
              buffered: true,
              durationThreshold: 16,
            });
          } catch {}
        });
        let turns = 0;
        for (const name of [
          "Next page",
          "Next page",
          "Next page",
          "Previous page",
          "Previous page",
          "Previous page",
        ]) {
          const button = page.getByRole("button", { name, exact: true });
          if (await button.isEnabled()) {
            const before = await page
              .locator(".reader-footer [role=status]")
              .textContent();
            await button.click();
            await page.waitForFunction(
              (before) =>
                document.querySelector(".reader-footer [role=status]")
                  ?.textContent !== before &&
                !document.querySelector(".paper-fold,.curl-underlay"),
              before,
            );
            turns++;
          }
        }
        const metrics = await page.evaluate(() => {
          const s = window.fylogiaLab;
          s.running = false;
          const gaps = s.frames
            .slice(1)
            .map((n, i) => n - s.frames[i])
            .sort((a, b) => a - b);
          const events = Object.values(
            Object.fromEntries(s.events.map((e) => [e.interactionId, e])),
          )
            .map((e) =>
              Math.max(
                ...s.events
                  .filter((v) => v.interactionId === e.interactionId)
                  .map((e) => e.duration),
              ),
            )
            .sort((a, b) => a - b);
          return {
            medianFrameGap: gaps[Math.floor(gaps.length * 0.5)],
            p95FrameGap: gaps[Math.floor(gaps.length * 0.95)],
            maxFrameGap: gaps.at(-1),
            frames: gaps.length,
            longFrames: gaps.filter((n) => n > 32).length,
            observedInteractionCount: events.length,
            maxEventTiming: events.at(-1) ?? null,
            baseNodes: s.baseNodes,
            peakNodes: s.peakNodes,
            remainingCurlLayers:
              document.querySelectorAll(".paper-fold").length,
            spread: document.querySelector(".reader-viewport").dataset.spread,
          };
        });
        results.push({ engine, layout, viewport, turns, ...metrics });
      } finally {
        await context.close();
        await browser.close();
      }
    }
  await writeFile(
    join(output, "reading-profile.json"),
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        url,
        notes:
          "Lab rAF intervals and Event Timing samples on this Mac; no physical-device or field INP claim; node sampling adds small overhead.",
        results,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(results, null, 2));
}
