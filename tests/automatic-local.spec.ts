import { test, mockEdition } from "./edition-fixture";
import { expect, type Page } from "@playwright/test";
import { defaults } from "../src/catalog";
test.use({
  serviceWorkers: "block",
  storageState: { cookies: [], origins: [] },
});
const examples = [
  ["OM", "oman-observer", "Oman domestic news", "Middle East"],
  ["CY", "cyprus-mail", "Cyprus domestic news", "Europe"],
  ["DE", "bmas-germany", "Germany government news", "Europe"],
  ["US", "npr-us-national", "US national news", "United States"],
  ["world", "bbc-world", "International news", "Worldwide"],
  [
    "not-local",
    "times-of-oman",
    "International football from an Oman publisher",
    "Middle East",
  ],
];
async function seed(page: Page, country: string | null) {
  const edition = await (await page.request.get("data/edition.json")).json();
  await mockEdition(page, {
    ...edition,
    articles: examples.map(([id, sourceId, title, region], i) => ({
      id,
      url: "https://example.test/local/" + id,
      title,
      sourceId,
      source: sourceId,
      categories: ["World News"],
      region,
      publisherTags: sourceId === "cyprus-mail" ? ["Cyprus News"] : [],
      published: new Date(Date.now() - i * 60000).toISOString(),
      excerpt: "Local news regression fixture.",
      content: "<p>Preview for this controlled test.</p>",
      full: false,
    })),
  });
  await page.route("**/api/location", (r) =>
    r.fulfill({
      json: { country },
      headers: { "Cache-Control": "private, no-store" },
    }),
  );
  await page.addInitScript(
    (p) => {
      if (!localStorage.getItem("folio.v1.preferences"))
        localStorage.setItem("folio.v1.preferences", JSON.stringify(p));
      Object.defineProperty(navigator, "languages", { value: ["en-US"] });
    },
    {
      ...defaults,
      complete: true,
      interests: ["World News"],
      sourceIds: examples.map((a) => a[1]),
    },
  );
}
async function nav(page: Page, name: string) {
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name, exact: true })
    .click();
}
const active = (page: Page) =>
  page.locator(".news-book > .news-feed-surface > .feed-spread");
test("trusted-country responses drive Oman, Cyprus, Germany and US local news independently of locale", async ({
  page,
}) => {
  await seed(page, "OM");
  for (const [country, , headline] of examples.slice(0, 4)) {
    await page.unroute("**/api/location");
    await page.route("**/api/location", (r) =>
      r.fulfill({ json: { country } }),
    );
    await page.goto("./local");
    await expect(active(page).locator("h2")).toHaveText(headline);
    await expect(active(page)).not.toContainText("International football");
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("folio.v1.preferences")!).country,
      ),
    ).toBeUndefined();
  }
});
test("regional choices persist through travel and changing region does not change detected local news", async ({
  page,
}) => {
  await seed(page, "OM");
  await page.goto("./settings");
  const select = page.getByRole("combobox", {
    name: "Regional news",
    exact: true,
  });
  await expect(select.locator("option")).toHaveText([
    "Worldwide",
    "Middle East",
    "EU",
    "North America",
    "Asia",
    "India",
  ]);
  await select.selectOption("EU");
  await expect(page.getByRole("combobox", { name: /country/i })).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: /recommended local sources|locale suggestion/i,
    }),
  ).toHaveCount(0);
  await nav(page, "Local News");
  await expect(active(page).locator("h2")).toHaveText("Oman domestic news");
  await nav(page, "Regional News");
  const regional = [...(await active(page).locator("h2").allTextContents())];
  const next = page.getByRole("button", { name: "Next stories", exact: true });
  if (await next.isEnabled()) {
    await next.click();
    await expect(
      page.locator(".news-book > .news-feed-surface"),
    ).not.toHaveAttribute("data-page-turn", /.+/);
    regional.push(...(await active(page).locator("h2").allTextContents()));
  }
  expect(regional).toEqual(["Cyprus domestic news", "Germany government news"]);
  await page.unroute("**/api/location");
  await page.route("**/api/location", (r) =>
    r.fulfill({ json: { country: "DE" } }),
  );
  await page.goto("./local");
  await expect(active(page).locator("h2")).toHaveText(
    "Germany government news",
  );
  await nav(page, "Settings");
  await expect(select).toHaveValue("EU");
  await page.reload();
  await expect(select).toHaveValue("EU");
});
test("unknown or failed detection offers a clearly labelled Worldwide fallback without inventing local coverage", async ({
  page,
}) => {
  await seed(page, null);
  for (const failure of [false, true]) {
    await page.unroute("**/api/location");
    await page.route("**/api/location", (r) =>
      failure ? r.abort() : r.fulfill({ json: { country: null } }),
    );
    await page.goto("./local");
    await expect(
      page.getByText(
        "Country unavailable · Worldwide coverage is available in World News.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.locator(".news-book")).toHaveCount(0);
    await page
      .locator(".empty")
      .getByRole("button", { name: "World News", exact: true })
      .click();
    await expect(active(page).locator("h2").first()).toHaveText(
      "International news",
    );
  }
});
test("country lookup is only requested for Local News, omits identity cookies and is not saved in the library", async ({
  page,
  context,
}) => {
  await seed(page, "OM");
  const seen: string[] = [];
  await page.unroute("**/api/location");
  await page.route("**/api/location", async (r) => {
    seen.push((await r.request().allHeaders()).cookie || "");
    await r.fulfill({ json: { country: "OM" } });
  });
  const origin = new URL(
    (test.info().project.use.baseURL as string) || "http://127.0.0.1:8788",
  ).origin;
  await context.addCookies([
    {
      name: "private-test-cookie",
      value: "identity-fixture",
      url: origin + "/api/location",
    },
  ]);
  await page.goto("./settings");
  await expect(
    page.getByRole("combobox", { name: "Regional news", exact: true }),
  ).toBeVisible();
  expect(seen).toHaveLength(0);
  const before = await page.evaluate(() =>
    localStorage.getItem("folio.v1.preferences"),
  );
  await nav(page, "Local News");
  await expect(active(page).locator("h2")).toHaveText("Oman domestic news");
  expect(seen).toEqual([""]);
  expect(
    await page.evaluate(() => localStorage.getItem("folio.v1.preferences")),
  ).toBe(before);
  await active(page)
    .getByRole("button", { name: "Save Oman domestic news", exact: true })
    .click();
  await active(page).locator(".story-open").click();
  await expect(page.locator(".reader")).toBeVisible();
  await page
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  await expect(active(page).locator("h2")).toHaveText("Oman domestic news");
  await page.reload();
  await expect(
    active(page).getByRole("button", {
      name: "Unsave Oman domestic news",
      exact: true,
    }),
  ).toBeVisible();
});

test.describe("uncached country endpoint with installed worker", () => {
  test.use({ serviceWorkers: "allow" });
  test("the actual Pages endpoint does not expose IPs or cache location, and offline library stays independent", async ({
    page,
    context,
  }) => {
    await seed(page, "OM");
    await page.unroute("**/api/location");
    await page.goto("./");
    await expect(active(page).locator("h2").first()).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const result = await page.evaluate(async () => {
      const r = await fetch("api/location", {
        credentials: "omit",
        cache: "no-store",
      });
      return {
        status: r.status,
        headers: r.headers.get("cache-control"),
        body: await r.json(),
      };
    });
    expect(result.status).toBe(200);
    expect(result.headers).toContain("no-store");
    expect(Object.keys(result.body)).toEqual(["country"]);
    expect(
      result.body.country === null || /^[A-Z]{2}$/.test(result.body.country),
    ).toBe(true);
    await active(page)
      .getByRole("button", { name: "Save Oman domestic news", exact: true })
      .click();
    await active(page)
      .getByRole("button", {
        name: "Download offline Oman domestic news",
        exact: true,
      })
      .click();
    await expect(page.locator(".download-notice")).toContainText(
      "1 article downloaded.",
    );
    await nav(page, "Offline Library");
    await expect(page.locator(".offline-row")).toHaveCount(1);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator(".offline-row")).toHaveCount(1);
    expect(
      await page.evaluate(async () => {
        try {
          await fetch("api/location", {
            credentials: "omit",
            cache: "no-store",
          });
          return false;
        } catch {
          return true;
        }
      }),
    ).toBe(true);
    expect(
      await page.evaluate(async () => {
        for (const k of await caches.keys()) {
          if (
            (await (await caches.open(k)).keys()).some((r) =>
              new URL(r.url).pathname.endsWith("/api/location"),
            )
          )
            return true;
        }
        return false;
      }),
    ).toBe(false);
    await page
      .getByRole("button", {
        name: "Open downloaded Oman domestic news",
        exact: true,
      })
      .click();
    await expect(page.locator(".reader-content h1")).toHaveText(
      "Oman domestic news",
    );
    await context.setOffline(false);
  });
});
