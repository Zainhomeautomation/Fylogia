import { test, expect } from "@playwright/test";
import { parseHTML } from "linkedom";
import { XMLParser } from "fast-xml-parser";
import { defaults } from "../src/catalog";

test("sitemap URLs serve unique crawlable HTML and truthful collection schema without article bodies", async ({
  request,
}) => {
  const r = await request.get("./sitemap.xml");
  expect(r.status()).toBe(200);
  const xml = await r.text();
  expect(xml).not.toContain("<lastmod>");
  const rows = new XMLParser().parse(xml).urlset.url;
  expect(rows.length).toBeGreaterThan(40);
  const titles = new Set(),
    descriptions = new Set();
  for (let start = 0; start < rows.length; start += 6)
    await Promise.all(
      rows.slice(start, start + 6).map(async ({ loc }: { loc: string }) => {
        expect(loc).toMatch(
          /^https:\/\/fylogia\.com\/(?:discover(?:\/[a-z0-9-]+)*)?$/,
        );
        const path = new URL(loc).pathname.slice(1);
        const res = await request.get("./" + path);
        expect(res.status(), loc).toBe(200);
        const text = await res.text();
        const { document: d } = parseHTML(text);
        expect(d.querySelector("#root")!.textContent!.length).toBeGreaterThan(
          200,
        );
        expect(
          d.querySelector('link[rel="canonical"]')!.getAttribute("href"),
        ).toBe(loc);
        expect(
          d.querySelector('meta[name="robots"]')!.getAttribute("content"),
        ).toContain("index,follow");
        expect(res.headers()["x-robots-tag"] || "").not.toContain("noindex");
        expect(d.documentElement.lang).toBe("en");
        const title = d.title,
          desc = d
            .querySelector('meta[name="description"]')!
            .getAttribute("content");
        expect(titles.has(title)).toBe(false);
        expect(descriptions.has(desc)).toBe(false);
        titles.add(title);
        descriptions.add(desc);
        expect(
          d.querySelector('meta[property="og:url"]')!.getAttribute("content"),
        ).toBe(loc);
        expect(
          d.querySelector('meta[property="og:image"]')!.getAttribute("content"),
        ).toBe("https://fylogia.com/brand/social-card.png");
        const schema = JSON.parse(
          d.querySelector('script[type="application/ld+json"]')!.textContent!,
        );
        expect(schema["@context"]).toBe("https://schema.org");
        expect(JSON.stringify(schema)).not.toMatch(
          /"(?:Article|NewsArticle)"|articleBody/,
        );
        if (path) {
          expect(d.querySelectorAll('script[type="module"]').length).toBe(0);
          expect(
            schema["@graph"].some((n: any) => n["@type"] === "CollectionPage"),
          ).toBe(true);
        }
      }),
    );
});
test("public collections are readable without JavaScript at desktop and mobile sizes", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  try {
    for (const [path, title] of [
      ["discover/news/technology", "Technology news & sources"],
      ["discover/news/apple", "Apple news & sources"],
      ["discover/news/local", "Local News"],
      ["discover/magazines", "Magazines & original editions"],
    ]) {
      await page.goto(new URL(path, baseURL).href);
      await expect(
        page.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
      // Decorative slogan stays outside the Home link's visible label so voice
      // control and its accessible name refer to the same Fylogia target.
      await expect(
        page
          .locator(".discovery-header")
          .getByRole("link", { name: "Fylogia — Go to homepage", exact: true }),
      ).toHaveText("Fylogia");
      await expect(
        page.getByRole("link", {
          name: /Read in Fylogia|Open the magazine library/,
        }),
      ).toBeVisible();
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(new URL("discover/news/fashion", baseURL).href);
    await expect(
      page.getByRole("heading", { name: "Fashion news & sources" }),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});
test("collection entry opens the existing category reader without changing preferences or progress", async ({
  page,
}) => {
  const prefs = {
    ...defaults,
    complete: true,
    interests: ["Space"],
    sourceIds: ["nasa"],
    theme: "dark",
  };
  await page.addInitScript((p) => {
    if (!localStorage.getItem("folio.v1.preferences")) {
      localStorage.setItem("folio.v1.preferences", JSON.stringify(p));
      localStorage.setItem(
        "folio.v1.progress",
        JSON.stringify({ "https://example.org/kept": 0.4 }),
      );
    }
  }, prefs);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let locationRequests = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/location")) locationRequests++;
  });
  await page.goto("./discover/news/local");
  await expect(
    page.getByRole("heading", { name: "Local News", exact: true }),
  ).toBeVisible();
  expect(locationRequests).toBe(0);
  await page.goto("./discover/news/technology");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(consoleErrors).toEqual([]);
  await page.getByRole("link", { name: /^Read in Fylogia/ }).click();
  await expect(
    page.getByRole("heading", { name: "Explore", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator(".filter-tabs")
      .getByRole("button", { name: "Technology", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("folio.v1.preferences")!),
    ),
  ).toEqual(prefs);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("folio.v1.progress")!),
    ),
  ).toEqual({ "https://example.org/kept": 0.4 });
  expect(errors).toEqual([]);
  await page
    .getByRole("button", { name: "Fylogia — Go to homepage", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://fylogia.com/",
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /Your World, One Page at a Time/,
  );
});
test("private app routes and caches are excluded, while real missing pages stay 404", async ({
  request,
  page,
}) => {
  for (const path of [
    "settings",
    "saved",
    "offline",
    "history",
    "sources",
    "explore",
    "magazines",
  ]) {
    const r = await request.get("./" + path);
    expect(r.status()).toBe(200);
    expect(r.headers()["x-robots-tag"]).toContain("noindex");
    expect(await r.text()).not.toContain('"@type":"CollectionPage"');
  }
  const data = await request.get("./data/source-index.json");
  expect(data.headers()["x-robots-tag"]).toContain("noindex");
  const robots = await (await request.get("./robots.txt")).text();
  expect(robots).toContain("Disallow: /data/");
  expect(robots).toContain("Sitemap: https://fylogia.com/sitemap.xml");
  await page.goto("./");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const r = await page.goto("./not-a-real-fylogia-collection");
  expect(r!.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "That page isn't here." }),
  ).toBeVisible();
});
test("public collection prerenders remain readable offline without clearing the personal library", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.evaluate(() =>
    localStorage.setItem("fylogia.seo.preservation", "kept"),
  );
  await page.goto("./discover/news/apple");
  await expect
    .poll(() =>
      page.evaluate(async () => !!(await caches.match(location.pathname))),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Apple news & sources", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("fylogia.seo.preservation")),
  ).toBe("kept");
  await context.setOffline(false);
});
