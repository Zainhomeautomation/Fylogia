import { expect, type Page } from "@playwright/test";
import { test } from "./edition-fixture";
import { defaults } from "../src/catalog";
import {
  appleSections,
  classifyApple,
  appleSearchMatches,
} from "../src/apple-taxonomy";
const nav = (page: Page) =>
  page.getByRole("navigation", { name: "Apple navigation", exact: true });
async function seed(page: Page) {
  await page.addInitScript(
    (p) => {
      if (localStorage.getItem("folio.v1.preferences")) return;
      localStorage.setItem("folio.v1.preferences", JSON.stringify(p));
      localStorage.setItem(
        "folio.v1.progress",
        JSON.stringify({ "existing-progress": 0.42 }),
      );
    },
    {
      ...defaults,
      complete: true,
      theme: "dark",
      interests: ["Apple", "Space"],
      sourceIds: ["apple", "nasa"],
      topics: ["iPhone"],
      fontSize: 21,
    },
  );
  await page.goto("./explore");
  await page
    .locator('.filter-tabs[aria-label="Filter stories"]')
    .getByRole("button", { name: "Apple", exact: true })
    .click();
  await expect(nav(page)).toBeVisible();
  await expect(page.locator(".story-open").first()).toBeVisible({
    timeout: 20000,
  });
}
test("all 28 Apple sections and grouped software/service navigation are accessible without duplicate choices", async ({
  page,
}) => {
  await seed(page);
  const select = page.getByRole("combobox", {
    name: "Choose an Apple section",
    exact: true,
  });
  const values = await select
    .locator("option")
    .evaluateAll((options) =>
      options.map((o) => (o as HTMLOptionElement).value),
    );
  expect(values.length).toBe(new Set(values).size);
  for (const section of appleSections) {
    await select.selectOption(section.id);
    await expect(select).toHaveValue(section.id);
    if (section.group !== "products")
      await expect(
        page
          .getByRole("navigation", { name: "Apple subcategories", exact: true })
          .getByRole("button", { name: section.name, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
  }
  await nav(page)
    .getByRole("button", { name: "Software", exact: true })
    .click();
  await expect(
    page
      .getByRole("navigation", { name: "Apple subcategories", exact: true })
      .getByRole("button", { name: "iPadOS", exact: true }),
  ).toBeVisible();
  await nav(page)
    .getByRole("button", { name: "Services", exact: true })
    .click();
  await expect(
    page
      .getByRole("navigation", { name: "Apple subcategories", exact: true })
      .getByRole("button", { name: "Apple TV+", exact: true }),
  ).toBeVisible();
});
test("real product stories, term search, reader Back and responsive layouts retain the Apple filter", async ({
  page,
}) => {
  await seed(page);
  const edition = await (await page.request.get("data/edition.json")).json();
  const select = page.getByRole("combobox", {
    name: "Choose an Apple section",
    exact: true,
  });
  for (const id of ["iphone", "ipad", "mac", "home", "intelligence"]) {
    await select.selectOption(id);
    const first = page.locator(".story-open").first();
    await expect(first).toBeVisible({ timeout: 20000 });
    const title = await first.locator("h2").innerText(),
      article = edition.articles.find((a: any) => a.title === title);
    expect(article).toBeTruthy();
    expect(classifyApple(article).topics).toContain(id);
  }
  await select.selectOption("iphone");
  const search = page.getByRole("textbox", {
    name: "Search stories",
    exact: true,
  });
  await search.fill("iPhone camera");
  const matching = edition.articles.filter(
    (a: any) =>
      classifyApple(a).topics.includes("iphone") &&
      appleSearchMatches(a, "iPhone camera"),
  );
  expect(matching.length).toBeGreaterThan(0);
  await expect(page.locator(".story-open").first()).toBeVisible();
  const title = await page.locator(".story-open h2").first().innerText();
  expect(matching.some((a: any) => a.title === title)).toBeTruthy();
  await page.locator(".story-open").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Continue reading/i }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(select).toHaveValue("iphone");
  await expect(search).toHaveValue("iPhone camera");
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
    await expect(select).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Reset Apple filters", exact: true })
    .click();
  await expect(select).toHaveValue("all");
  await expect(search).toHaveValue("");
});
test("individual Apple follows persist without resetting sources, theme or reading progress", async ({
  page,
}) => {
  await seed(page);
  await nav(page)
    .getByRole("button", { name: "TV & Home", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Follow Apple TV & Home", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Following Apple TV & Home",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  const prefs = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("folio.v1.preferences")!),
  );
  expect(prefs.topics).toEqual(
    expect.arrayContaining(["iPhone", "Apple TV & Home"]),
  );
  expect(prefs.sourceIds).toEqual(expect.arrayContaining(["apple", "nasa"]));
  expect(prefs.theme).toBe("dark");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("folio.v1.progress")!)[
          "existing-progress"
        ],
    ),
  ).toBe(0.42);
  await page
    .locator('.filter-tabs[aria-label="Filter stories"]')
    .getByRole("button", { name: "Apple", exact: true })
    .click();
  await nav(page)
    .getByRole("button", { name: "TV & Home", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Following Apple TV & Home", exact: true })
    .click();
  expect(
    (
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("folio.v1.preferences")!),
      )
    ).topics,
  ).not.toContain("Apple TV & Home");
});
test("Apple publications are publisher articles or official magazine links, never fabricated issues", async ({
  page,
}) => {
  await seed(page);
  await nav(page).getByRole("button", { name: "Mac", exact: true }).click();
  await page
    .getByRole("button", { name: "Apple publications →", exact: true })
    .click();
  await expect(page.locator(".magazine-grid .magazine")).toHaveCount(0);
  await expect(
    page.getByRole("combobox", {
      name: "Choose an Apple section",
      exact: true,
    }),
  ).toHaveValue("mac");
  for (const id of ["macworld", "mac-life", "icreate", "imore-archive"])
    await expect(
      page
        .locator(`[data-publication-id="${id}"]`)
        .getByRole("link", { name: "Official publication", exact: true }),
    ).toBeVisible();
  await expect(
    page.locator('[data-publication-id="imore-archive"]'),
  ).toContainText("Archive");
  await page
    .locator('[data-publication-id="macworld"]')
    .getByRole("button", { name: "Browse articles", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", {
      name: "Choose an Apple section",
      exact: true,
    }),
  ).toHaveValue("mac");
  await expect(page.locator(".publication-selection")).toContainText(
    "Macworld",
  );
  await expect(page.locator(".story-open").first()).toBeVisible({
    timeout: 20000,
  });
});
test("Apple preview saves and offline downloads retain the existing reader and progress records", async ({
  page,
  context,
}) => {
  await seed(page);
  await nav(page).getByRole("button", { name: "iPhone", exact: true }).click();
  const card = page.locator(".story").first();
  const title = await card.locator("h2").innerText();
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
  const main = () =>
    page.getByRole("navigation", { name: "Main navigation", exact: true });
  if (!(await main().isVisible()))
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
  await main()
    .getByRole("button", { name: "Offline Library", exact: true })
    .click();
  // A fresh browser must finish the initial PWA installation and claim this
  // page before Airplane Mode. Downloads can finish while shell caching runs.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(
      () => page.evaluate(() => navigator.serviceWorker.controller !== null),
      { timeout: 30000 },
    )
    .toBeTruthy();
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("button", { name: "Open downloaded " + title, exact: true })
    .click();
  await expect(page.locator(".reader-content h1")).toHaveText(title);
  await expect(
    page.getByRole("link", { name: /Continue reading/i }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Home — For You", exact: true })
    .click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("folio.v1.progress")!)[
          "existing-progress"
        ],
    ),
  ).toBe(0.42);
  await context.setOffline(false);
});
test("Apple onboarding offers every product once while legacy selections remain selected", async ({
  page,
}) => {
  await page.addInitScript(
    (p) => localStorage.setItem("folio.v1.preferences", JSON.stringify(p)),
    {
      ...defaults,
      complete: false,
      interests: ["Apple", "Computing"],
      topics: ["Mac", "macOS", "Apple Home"],
    },
  );
  await page.goto("./");
  await page.getByText("Fine-tune your interests", { exact: true }).click();
  for (const section of appleSections)
    await expect(
      page
        .locator(".topics")
        .getByRole("button", { name: section.name, exact: true }),
    ).toHaveCount(1);
  await expect(
    page
      .locator(".topics")
      .getByRole("button", { name: "Apple TV & Home", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator(".topics").getByRole("button", { name: "Mac", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("Apple source discovery includes verified requested publishers without turning every general-tech story into Apple news", async ({
  page,
}) => {
  await seed(page);
  const main = page.getByRole("navigation", {
    name: "Main navigation",
    exact: true,
  });
  if (!(await main.isVisible()))
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
  await main.getByRole("button", { name: "My Sources", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Source category", exact: true })
    .selectOption("Apple");
  const search = page.getByRole("textbox", {
    name: "Search sources",
    exact: true,
  });
  for (const name of [
    "MacRumors",
    "Macworld",
    "Daring Fireball",
    "512 Pixels",
    "The Verge",
    "Ars Technica",
  ]) {
    await search.fill(name);
    await expect(page.locator(".source-row")).toHaveCount(1);
    await expect(page.locator(".source-row strong")).toHaveText(name);
  }
  await search.fill("iMore");
  await expect(page.locator(".source-row")).toHaveCount(0);
});
test("following Apple Arcade subscribes to its specific feed and fills the personalized service section", async ({
  page,
}) => {
  await seed(page);
  await nav(page)
    .getByRole("button", { name: "Services", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Apple subcategories", exact: true })
    .getByRole("button", { name: "Apple Arcade", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Follow Apple Arcade", exact: true })
    .click();
  expect(
    (
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("folio.v1.preferences")!),
      )
    ).sourceIds,
  ).toContain("9to5mac-arcade");
  const main = page.getByRole("navigation", {
    name: "Main navigation",
    exact: true,
  });
  if (!(await main.isVisible()))
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
  await main.getByRole("button", { name: "For You", exact: true }).click();
  await page
    .locator('.filter-tabs[aria-label="Filter stories"]')
    .getByRole("button", { name: "Apple", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Choose an Apple section", exact: true })
    .selectOption("arcade");
  await expect(page.locator(".story-open").first()).toBeVisible({
    timeout: 20000,
  });
});
