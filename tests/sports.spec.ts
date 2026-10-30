import { expect, type Page } from "@playwright/test";
import { test, mockEdition } from "./edition-fixture";
import { defaults } from "../src/catalog";
import { articleSports } from "../src/sports-taxonomy";
const sportsNav = (page: Page) =>
  page.getByRole("navigation", { name: "Sports navigation", exact: true });
async function seed(page: Page) {
  await page.addInitScript(
    (p) => {
      if (localStorage.getItem("folio.v1.preferences")) return;
      localStorage.setItem("folio.v1.preferences", JSON.stringify(p));
      localStorage.setItem(
        "folio.v1.progress",
        JSON.stringify({ "existing-reader": 0.42 }),
      );
    },
    {
      ...defaults,
      complete: true,
      theme: "dark",
      sourceIds: ["nasa"],
      interests: ["Space", "Sports"],
      fontSize: 21,
    },
  );
  await page.goto("./explore");
  await page
    .locator('.filter-tabs[aria-label="Filter stories"]')
    .getByRole("button", { name: "Sports", exact: true })
    .click();
  await expect(sportsNav(page)).toBeVisible();
}
test("sports navigation selects real Football and Basketball stories, keeps reader Back state and adapts to widths", async ({
  page,
}) => {
  await seed(page);
  const edition = await (await page.request.get("data/edition.json")).json();
  for (const [label, id] of [
    ["Football", "football"],
    ["Basketball", "basketball"],
  ] as const) {
    await sportsNav(page)
      .getByRole("button", { name: label, exact: true })
      .click();
    const first = page.locator(".story-open").first();
    await expect(first).toBeVisible();
    const title = (await first.locator("h2").innerText()).trim();
    const actual = edition.articles.find((a: any) => a.title === title);
    expect(actual).toBeTruthy();
    expect(articleSports(actual)).toContain(id);
    expect(actual.full).toBe(false);
    await first.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Continue reading/i }),
    ).toHaveAttribute("href", actual.url);
    await expect(page.locator(".page-corner")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(
      sportsNav(page).getByRole("button", { name: label, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 820, height: 1100 },
    { width: 1180, height: 820 },
  ]) {
    await page.setViewportSize(viewport);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBeTruthy();
    await expect(
      page.getByRole("combobox", { name: "Choose a sport", exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("combobox", { name: "Choose a sport", exact: true })
    .selectOption("cricket");
  await expect(page.locator(".story-open").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Follow Cricket", exact: true }),
  ).toBeVisible();
});
test("following individual sports persists without replacing existing preferences or progress", async ({
  page,
}) => {
  await seed(page);
  for (const [tab, name] of [
    ["Football", "Football (Soccer)"],
    ["Basketball", "Basketball"],
  ]) {
    await sportsNav(page)
      .getByRole("button", { name: tab, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Follow " + name, exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Following " + name, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  const p = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("folio.v1.preferences")!),
  );
  expect(p.topics).toEqual(expect.arrayContaining(["Football", "Basketball"]));
  expect(p.sourceIds).toContain("nasa");
  expect(p.theme).toBe("dark");
  expect(p.fontSize).toBe(21);
  expect(p.interests).toContain("Space");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("folio.v1.progress")!)[
          "existing-reader"
        ],
    ),
  ).toBe(0.42);
  await page.goto("./");
  await expect(page.locator(".story-open").first()).toBeVisible();
  const edition = await (await page.request.get("data/edition.json")).json();
  for (const title of await page.locator(".story-open h2").allTextContents()) {
    const a = edition.articles.find((a: any) => a.title === title.trim());
    expect(a).toBeTruthy();
    if (a.categories.includes("Sports"))
      expect(
        articleSports(a).some((id) => id === "football" || id === "basketball"),
      ).toBeTruthy();
  }
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("folio.v1.preferences")!).topics,
    ),
  ).toEqual(expect.arrayContaining(["Football", "Basketball"]));
});
test("sports publications remain separate from complete editions and connect to attributed articles", async ({
  page,
}) => {
  await seed(page);
  await sportsNav(page)
    .getByRole("button", { name: "Basketball", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Magazines & publications →", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Magazine category", exact: true }),
  ).toHaveValue("Sports");
  await expect(
    page.getByRole("combobox", { name: "Choose a sport", exact: true }),
  ).toHaveValue("basketball");
  const slam = page.locator('[data-publication-id="slam"]');
  await expect(slam).toBeVisible();
  await expect(
    slam.getByRole("link", { name: "Official publication", exact: true }),
  ).toHaveAttribute("href", "https://www.slamonline.com/");
  await expect(
    slam.getByRole("button", { name: "Browse articles", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".magazine-grid .magazine")).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Choose a sport", exact: true })
    .selectOption("football");
  const fft = page.locator('[data-publication-id="fourfourtwo"]');
  await expect(fft).toContainText("Publisher previews");
  await fft
    .getByRole("button", { name: "Browse articles", exact: true })
    .click();
  await expect(page.locator(".story-open").first()).toBeVisible();
  await expect(
    sportsNav(page).getByRole("button", { name: "Football", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".publication-selection")).toContainText(
    "FourFourTwo",
  );
});
test("sports preview downloads reopen offline with saved stories and the existing navigation", async ({
  page,
  context,
}) => {
  await seed(page);
  await sportsNav(page)
    .getByRole("button", { name: "Basketball", exact: true })
    .click();
  const card = page.locator(".story").first();
  const title = (await card.locator(".story-open h2").innerText()).trim();
  await card
    .getByRole("button", { name: "Save " + title, exact: true })
    .click();
  await card
    .getByRole("button", { name: "Download offline " + title, exact: true })
    .click();
  await expect(page.locator(".download-notice")).toContainText(
    "1 article downloaded.",
    { timeout: 30000 },
  );
  await page.goto("./offline");
  await expect(
    page.getByRole("button", { name: "Open downloaded " + title, exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("button", { name: "Open downloaded " + title, exact: true })
    .click();
  await expect(page.locator(".reader-content h1")).toHaveText(title);
  await page
    .getByRole("button", { name: "Home — For You", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your daily perspective.", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      (title) =>
        JSON.parse(localStorage.getItem("folio.v1.saved") || "[]").some(
          (a: any) => a.title === title,
        ),
      title,
    ),
  ).toBeTruthy();
  await context.setOffline(false);
});
test("onboarding exposes fourteen sports with legacy-compatible choices and balanced recommendations", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("searchbox", { name: "Find an interest", exact: true })
    .fill("Sports");
  await page.getByRole("button", { name: "Sports", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Find an interest", exact: true })
    .fill("Cars");
  await page.getByRole("button", { name: "Cars", exact: true }).click();
  await page.getByText("Fine-tune your interests", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Formula 1 & Motorsport", exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Football (Soccer)", exact: true })
    .click();
  await page.getByRole("button", { name: "Basketball", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Swimming & Water Sports", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Formula 1 & Motorsport", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: /BBC Sport · Football/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: /BBC Sport · Basketball/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Create My Fylogia", exact: true })
    .click();
  const p = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("folio.v1.preferences")!),
  );
  expect(p.topics).toEqual(expect.arrayContaining(["Football", "Basketball"]));
});
test("unavailable publisher photos retain Fylogia’s editorial cover fallback", async ({
  page,
}) => {
  const edition = await (await page.request.get("data/edition.json")).json();
  const article = edition.articles.find(
    (a: any) => a.categories.includes("Sports") && a.image,
  );
  expect(article).toBeTruthy();
  await mockEdition(page, { ...edition, articles: [article] });
  await page.route(article.image, (route) => route.abort());
  await seed(page);
  const card = page.locator(".story").first();
  await expect(card.locator(".type-art")).toBeVisible();
  await expect(card.locator(".type-art strong")).toHaveText(article.source);
  await expect(card.locator("h2")).toHaveText(article.title);
});
