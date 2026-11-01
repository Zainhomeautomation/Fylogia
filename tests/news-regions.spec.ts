import { test, mockEdition } from "./edition-fixture";
import { expect, type Page } from "@playwright/test";
import { defaults } from "../src/catalog";
test.use({
  storageState: { cookies: [], origins: [] },
  hasTouch: true,
  timezoneId: "Asia/Muscat",
});
const now = Date.UTC(2026, 10, 1, 12);
const timestamp = (minutes: number) =>
  new Date(now - minutes * 60000).toISOString();
const items = [
  [
    "yesterday",
    "Yesterday Oman report",
    "oman-observer",
    "Middle East",
    timestamp(1440),
  ],
  [
    "newest",
    "Newest Oman report",
    "oman-observer",
    "Middle East",
    timestamp(1),
  ],
  ["cyprus", "Cyprus local report", "cyprus-mail", "Europe", timestamp(2)],
  ["uk", "UK national report", "bbc-uk-national", "Europe", timestamp(3)],
  ["world", "International report", "bbc-world", "Worldwide", timestamp(4)],
  ["regional", "Middle East report", "aljazeera", "Middle East", timestamp(5)],
  [
    "offset-new",
    "Oman offset newer",
    "oman-observer",
    "Middle East",
    "2026-11-01T09:40:00-02:00",
  ],
  [
    "offset-old",
    "Oman offset older",
    "oman-observer",
    "Middle East",
    "2026-11-01T15:30:00+04:00",
  ],
  ["missing", "Oman undated report", "oman-observer", "Middle East", ""],
  [
    "future",
    "Oman future report",
    "oman-observer",
    "Middle East",
    "2099-11-01T12:00:00Z",
  ],
].map(([id, title, sourceId, region, published]) => ({
  id,
  url: "https://example.test/" + id,
  title,
  sourceId,
  source: sourceId,
  categories: ["World News"],
  region,
  published,
  excerpt: "Chronology regression fixture. Publisher preview.",
  content: "<p>Original publisher preview used only by this test.</p>",
  full: false,
  retrievedAt: timestamp(0),
}));
async function seed(page: Page, view = "explore", country?: string) {
  const edition = await (await page.request.get("data/edition.json")).json();
  await mockEdition(page, { ...edition, articles: items });
  await page.clock.setFixedTime(new Date(now));
  await page.addInitScript(
    (p) => {
      if (!localStorage.getItem("folio.v1.preferences"))
        localStorage.setItem("folio.v1.preferences", JSON.stringify(p));
    },
    {
      ...defaults,
      complete: true,
      country,
      interests: ["World News"],
      sourceIds: [...new Set(items.map((a) => a.sourceId))],
    },
  );
  await page.goto("./" + view);
  await expect(page.locator(".news-book")).toBeVisible();
}
const surface = (page: Page) => page.locator(".news-book > .news-feed-surface");
const active = (page: Page) => surface(page).locator(":scope > .feed-spread");
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
async function settled(page: Page) {
  await expect(surface(page)).not.toHaveAttribute("data-page-turn", /.+/);
}
async function preference(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("folio.v1.preferences")!),
  );
}
test("Latest is the default and page turns retain numerical publication order across time zones", async ({
  page,
}) => {
  await seed(page);
  await expect(
    page.getByRole("combobox", { name: "Sort stories", exact: true }),
  ).toHaveValue("latest");
  const seen: string[] = [];
  for (let i = 0; i < 10; i++) {
    seen.push(...(await active(page).locator("h2").allTextContents()));
    const next = page.getByRole("button", {
      name: "Next stories",
      exact: true,
    });
    if (await next.isDisabled()) break;
    await next.click();
    await settled(page);
  }
  expect(seen).toEqual([
    "Newest Oman report",
    "Cyprus local report",
    "UK national report",
    "International report",
    "Middle East report",
    "Oman offset newer",
    "Oman offset older",
    "Yesterday Oman report",
    "Oman future report",
    "Oman undated report",
  ]);
});
test("Oldest puts unknown and future dates last; relevance is an explicit persisted choice", async ({
  page,
}) => {
  await seed(page);
  const sort = page.getByRole("combobox", {
    name: "Sort stories",
    exact: true,
  });
  await sort.selectOption("oldest");
  await expect(active(page).locator("h2").first()).toHaveText(
    "Yesterday Oman report",
  );
  await sort.selectOption("relevant");
  await expect(sort).toHaveValue("relevant");
  await page.reload();
  await expect(sort).toHaveValue("relevant");
  await nav(page, "Latest News");
  await expect(sort).toHaveValue("latest");
  await expect(sort).toBeDisabled();
  await expect(active(page).locator("h2").first()).toHaveText(
    "Newest Oman report",
  );
});
test("country changes update Local News and travel never replaces a manual selection", async ({
  page,
}) => {
  await seed(page, "local", "OM");
  await expect(active(page).locator("h2").first()).toHaveText(
    "Newest Oman report",
  );
  const before = (await preference(page)).sourceIds;
  await nav(page, "Settings");
  await page
    .getByRole("combobox", { name: "Preferred country", exact: true })
    .selectOption("CY");
  await nav(page, "Local News");
  await expect(active(page).locator("h2")).toHaveText("Cyprus local report");
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "languages", { value: ["en-US"] }),
  );
  await page.reload();
  await expect(active(page).locator("h2")).toHaveText("Cyprus local report");
  expect((await preference(page)).country).toBe("CY");
  await nav(page, "Settings");
  await page
    .getByRole("combobox", { name: "Preferred country", exact: true })
    .selectOption("GB");
  await nav(page, "Local News");
  await expect(active(page).locator("h2")).toHaveText("UK national report");
  expect((await preference(page)).sourceIds).toEqual(before);
});
test("Regional and World News use explicit coverage while keeping other categories available", async ({
  page,
}) => {
  await seed(page, "regional", "CY");
  await expect(active(page).locator("h2")).toHaveText("UK national report");
  await nav(page, "World News");
  await expect(active(page)).toContainText("International report");
  await expect(active(page)).not.toContainText("Cyprus local report");
  await nav(page, "Explore");
  await expect(page.locator(".filter-tabs")).toContainText("Apple");
  await expect(page.locator(".filter-tabs")).toContainText("Sports");
});
test("reader Back keeps the category, country, sort, query and selected news page", async ({
  page,
}) => {
  await seed(page, "explore", "OM");
  await page
    .getByRole("combobox", { name: "Sort stories", exact: true })
    .selectOption("oldest");
  await page
    .getByRole("textbox", { name: "Search stories", exact: true })
    .pressSequentially("Oman");
  await page
    .locator(".filter-tabs")
    .getByRole("button", { name: "World News", exact: true })
    .click();
  await page.getByRole("button", { name: "Next stories", exact: true }).click();
  await settled(page);
  const ids = await active(page)
    .locator(".feed-sheet")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-story-id")));
  await active(page).locator(".story-open").first().tap();
  await expect(page.locator(".reader")).toBeVisible();
  await page
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Search stories", exact: true }),
  ).toHaveValue("Oman");
  await expect(
    page.getByRole("combobox", { name: "Sort stories", exact: true }),
  ).toHaveValue("oldest");
  await expect(page.locator(".filter-tabs button.selected")).toHaveText(
    "World News",
  );
  expect((await preference(page)).country).toBe("OM");
  expect(
    await active(page)
      .locator(".feed-sheet")
      .evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute("data-story-id")),
      ),
  ).toEqual(ids);
});
test("date groups and reader metadata distinguish yesterday publication from today retrieval", async ({
  page,
}) => {
  await seed(page);
  await page.getByRole("button", { name: "Story list", exact: true }).click();
  await expect(
    page.locator(".chronology-section > .section-heading h2"),
  ).toHaveText(["Today", "Yesterday", "Date unavailable"]);
  const yesterday = page.locator(".story").filter({
    has: page.getByRole("heading", {
      name: "Yesterday Oman report",
      exact: true,
    }),
  });
  await expect(yesterday.locator("time")).toContainText("Oct 31, 2026");
  await yesterday.locator(".story-open").click();
  await expect(page.locator(".article-source")).toContainText("Oct 31, 2026");
  await expect(page.locator(".article-retrieved")).toContainText("11/1/2026");
});
test("Daily Edition uses the publication day, and countries without verified feeds get an honest fallback", async ({
  page,
}) => {
  await seed(page, "", "OM");
  await page
    .getByRole("button", { name: "Open Today's Fylogia", exact: true })
    .click();
  const titles = page.locator(".daily-contents-story");
  await expect(titles.first()).toBeVisible();
  await expect(page.locator(".daily-magazine")).not.toContainText(
    "Yesterday Oman report",
  );
  await expect(page.locator(".daily-contents-story strong")).not.toContainText([
    "Oman future report",
  ]);
  await page.keyboard.press("Escape");
  await nav(page, "Settings");
  await page
    .getByRole("combobox", { name: "Preferred country", exact: true })
    .selectOption("AQ");
  await expect(
    page.getByText(/No verified country-focused feed/),
  ).toBeVisible();
  await nav(page, "Local News");
  await expect(
    page.getByRole("heading", {
      name: "No local stories available right now.",
      exact: true,
    }),
  ).toBeVisible();
});
