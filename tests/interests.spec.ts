import { mockEdition } from "./edition-fixture";
import { test, expect, type Page } from "@playwright/test";
async function nav(page: Page, name: string) {
  await expect(page.locator(".mobile-header")).toBeAttached();
  if (
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name, exact: true })
    .click();
}
test("grouped searchable interests select niche topics and recommend relevant sources across layouts", async ({
  page,
}) => {
  const data = await (await page.request.get("data/edition.json")).json();
  // Stable recommendation inputs; actual feed validation is tested separately.
  await mockEdition(page, {
    ...data,
    statuses: data.statuses.map((s: any) =>
      ["padi-blog", "fedora-magazine"].includes(s.id)
        ? { ...s, ok: true, freshness: "fresh" }
        : s,
    ),
  });
  await page.goto("./");
  for (const dimensions of [
    { width: 390, height: 844 },
    { width: 820, height: 1100 },
  ]) {
    await page.setViewportSize(dimensions);
    await expect(
      page.getByRole("heading", {
        name: "Technology & Computing",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  const search = page.getByLabel("Find an interest", { exact: true });
  for (const [query, category] of [
    ["operating systems", "Computing"],
    ["diving", "Marine"],
    ["archaeology", "History & Culture"],
  ]) {
    await search.fill(query);
    const button = page.getByRole("button", { name: category, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  await search.fill("");
  await page.getByText("Fine-tune your interests", { exact: true }).click();
  for (const topic of ["Linux", "Diving", "Archaeology"])
    await page.getByRole("button", { name: topic, exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: /Fedora Magazine/ }),
  ).toBeChecked();
  await expect(page.getByRole("checkbox", { name: /PADI Blog/ })).toBeChecked();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Create My Fylogia", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your daily perspective.", exact: true }),
  ).toBeVisible();
  const prefs = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("folio.v1.preferences")!),
  );
  expect(prefs.interests).toEqual(
    expect.arrayContaining(["Computing", "Marine", "History & Culture"]),
  );
  expect(prefs.topics).toEqual(
    expect.arrayContaining(["Linux", "Diving", "Archaeology"]),
  );
  await nav(page, "My Sources");
  await page
    .getByRole("textbox", { name: "Search sources", exact: true })
    .fill("Linux");
  await expect(
    page.locator(".source-row").filter({ hasText: "Fedora Magazine" }),
  ).toBeVisible();
});
test("editing existing interests preserves explicit source choices, themes, progress and saved article data", async ({
  page,
}) => {
  const data = await (await page.request.get("data/edition.json")).json();
  const article = {
    ...data.articles.find((a: any) => a.sourceId === "fedora-magazine"),
    categories: ["Technology"],
  };
  await page.addInitScript((article) => {
    if (localStorage.getItem("folio.v1.preferences")) return;
    localStorage.setItem(
      "folio.v1.preferences",
      JSON.stringify({
        complete: true,
        interests: ["Computing"],
        topics: ["Linux"],
        region: "Europe",
        sourceIds: ["fedora-magazine"],
        customSources: [],
        theme: "dark",
        reading: "scroll",
        fontSize: 21,
        converter: false,
      }),
    );
    localStorage.setItem("folio.v1.saved", JSON.stringify([article]));
    localStorage.setItem(
      "folio.v1.progress",
      JSON.stringify({ [article.id]: 0.4 }),
    );
  }, article);
  await page.goto("./");
  await nav(page, "Settings");
  await page
    .getByRole("button", { name: "Edit interests & sources", exact: true })
    .click();
  await page.getByLabel("Find an interest", { exact: true }).fill("Diving");
  await page.getByRole("button", { name: "Marine", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: /Fedora Magazine/ }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Create My Fylogia", exact: true })
    .click();
  const prefs = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("folio.v1.preferences")!),
  );
  expect(prefs).toMatchObject({
    theme: "dark",
    reading: "scroll",
    fontSize: 21,
    region: "Europe",
    sourceIds: ["fedora-magazine"],
    topics: ["Linux"],
  });
  expect(prefs.interests).toEqual(["Computing", "Marine"]);
  await nav(page, "Saved Articles");
  await page.getByRole("button", { name: "Computing", exact: true }).click();
  await expect(page.locator(".story-open")).toContainText(article.title);
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("folio.v1.saved")!),
  );
  expect(stored[0].categories).toEqual(["Technology"]);
  expect(stored[0].content).toBe(article.content);
  expect(
    await page.evaluate(
      (id) => JSON.parse(localStorage.getItem("folio.v1.progress")!)[id],
      article.id,
    ),
  ).toBe(0.4);
  await page.reload();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("folio.v1.preferences")!).theme,
    ),
  ).toBe("dark");
});
test("authorized OSI feed text opens as a complete paginated article with attribution and no third-party images", async ({
  page,
}) => {
  const data = await (await page.request.get("data/edition.json")).json();
  const article = data.articles
    .filter((a: any) => a.sourceId === "open-source-initiative" && a.full)
    .sort((a: any, b: any) => b.content.length - a.content.length)[0];
  expect(
    article,
    "committed edition includes permitted OSI staff text",
  ).toBeTruthy();
  await mockEdition(page, { ...data, articles: [article] });
  await page.addInitScript(() =>
    localStorage.setItem(
      "folio.v1.preferences",
      JSON.stringify({
        complete: true,
        interests: ["Computing"],
        topics: [],
        region: "Worldwide",
        sourceIds: ["open-source-initiative"],
        customSources: [],
        theme: "navy",
        reading: "pages",
        fontSize: 19,
        converter: false,
      }),
    ),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await expect(page.locator(".story-open")).toContainText("Full article");
  await page.locator(".story-open").click();
  await expect(page.locator(".article-body")).toContainText("CC BY 4.0");
  expect(
    (await page.locator(".article-body").textContent())!.length,
  ).toBeGreaterThan(1000);
  await expect(page.locator(".article-body img")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Next page", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.locator(".reader-footer")).toContainText("Page 2 of");
});
test("unavailable images fail gracefully while offline reading and page navigation remain functional", async ({
  page,
  context,
}) => {
  const data = await (await page.request.get("data/edition.json")).json();
  const item = data.articles
    .filter((a: any) => a.full && a.sourceId === "nasa")
    .sort((a: any, b: any) => b.content.length - a.content.length)[0];
  const article = {
    ...item,
    image: undefined,
    content: item.content.replace(/<img\b[^>]*>/gi, ""),
  };
  await mockEdition(page, { ...data, articles: [article] });
  await page.addInitScript(
    (id) =>
      localStorage.setItem(
        "folio.v1.preferences",
        JSON.stringify({
          complete: true,
          interests: ["Science"],
          topics: [],
          region: "Worldwide",
          sourceIds: [id],
          customSources: [],
          theme: "navy",
          reading: "pages",
          fontSize: 19,
          converter: false,
        }),
      ),
    article.sourceId,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.locator(".story-open").click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.setOffline(true);
  expect(
    await page.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          const image = new Image();
          image.onerror = () => resolve(true);
          image.onload = () => resolve(false);
          image.src = new URL(
            "missing-offline-image-regression.jpg",
            location.origin,
          ).href;
        }),
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.locator(".reader-footer")).toContainText("Page 2 of");
  expect(errors).toEqual([]);
  await context.setOffline(false);
});
