import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";

test("PWA privacy notice handles host canonical redirects online and offline", async ({
  page,
  context,
}) => {
  // Reproduce Cloudflare Pages' clean-URL redirect, absent in Vite preview.
  // Serve the actual built app/worker and actual precache assets, not a mock SW.
  const root = resolve("dist");
  const types: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".wasm": "application/wasm",
    ".woff2": "font/woff2",
  };
  const server = createServer(async (request, response) => {
    const path = new URL(request.url || "/", "http://localhost").pathname;
    if (path === "/privacy.html") {
      response.writeHead(308, { Location: "/privacy" });
      response.end();
      return;
    }
    const file = resolve(
      root,
      "." +
        (path === "/"
          ? "/index.html"
          : path === "/privacy"
            ? "/privacy.html"
            : path),
    );
    if (!file.startsWith(root + "/")) {
      response.writeHead(403);
      response.end();
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, {
        "Content-Type": types[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing test origin");
  const origin = "http://127.0.0.1:" + address.port;
  try {
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.goto(origin + "/privacy.html", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { name: "Optional custom-feed converter" }),
    ).toBeVisible();
    await expect(page.locator("body")).toContainText("rss2json.com");
    await context.setOffline(true);
    for (const path of ["/privacy", "/privacy.html"]) {
      await page.goto(origin + path, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: "Optional custom-feed converter" }),
      ).toBeVisible();
      await expect(page.locator(".brand img")).toBeVisible();
    }
  } finally {
    await context.setOffline(false);
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
