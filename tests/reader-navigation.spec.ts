import { test, expect, type Page } from "@playwright/test";
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
test("reader Back preserves section, filters and scroll; Home opens For You", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create My Fylogia" }).click();
  for (const section of ["Explore", "Categories"]) {
    await nav(page, section);
    if (section === "Categories")
      await page
        .locator(".category-grid button")
        .filter({
          has: page.getByRole("heading", { name: "Science", exact: true }),
        })
        .click();
    const search = page.getByPlaceholder("Search stories, sources, ideas…");
    await search.fill("NASA");
    const story = page.locator(".story-open").first();
    await expect(story).toBeVisible();
    await story.scrollIntoViewIfNeeded();
    const y = await page.evaluate(() => window.scrollY);
    const url = page.url();
    await story.click();
    const back = page.getByRole("button", {
      name: "Back to previous section",
      exact: true,
    });
    const home = page.getByRole("button", {
      name: "Home — For You",
      exact: true,
    });
    await expect(back).toBeVisible();
    await expect(home).toBeVisible();
    expect((await back.boundingBox())!.width).toBeGreaterThanOrEqual(44);
    await page.getByRole("button", { name: "Enter immersive reading" }).click();
    await expect(home).toBeVisible();
    if (process.env.FYLOGIA_SCREENSHOTS)
      await page.screenshot({
        path: `${process.env.FYLOGIA_SCREENSHOTS}/navigation-${info.project.name}.png`,
      });
    if (section === "Explore") await back.click();
    else await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(url);
    await expect(search).toHaveValue("NASA");
    if (section === "Categories")
      await expect(
        page.getByRole("button", { name: "Science", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeCloseTo(y, 0);
    await story.click();
    await home.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Your daily perspective." }),
    ).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  }
  expect(errors).toEqual([]);
});
