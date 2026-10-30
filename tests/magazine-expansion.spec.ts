import { test, expect } from "@playwright/test";
import { defaults, sources } from "../src/catalog";
import { magazineFixture } from "./pdf-fixture";
// Route-only PDF fixtures must not be intercepted by the installed worker. Offline worker behavior has separate tests.
test.use({ serviceWorkers: "block" });
test("new public issue reuses the existing PDF reader and preserves independent progress and bookmarks", async ({
  page,
}) => {
  await page.addInitScript(
    (p) => localStorage.setItem("folio.v1.preferences", JSON.stringify(p)),
    { ...defaults, complete: true },
  );
  // Deterministic pages verify reader identity, not upstream publication content.
  // The real 100-page PDF and publisher range delivery are verified separately.
  await page.context().route("**/editions/hackspace-75.pdf", (route) =>
    route.fulfill({
      contentType: "application/pdf",
      body: magazineFixture(100),
    }),
  );
  await page.goto("./magazines");
  await page
    .getByRole("button", { name: "Open HackSpace 75", exact: true })
    .click();
  await expect(
    page.locator(".pdf-page canvas[aria-busy=false]").first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Next magazine page", exact: true })
    .click();
  await expect(
    page.locator(".pdf-reader .reader-footer [role=status]"),
  ).not.toContainText(/^Page 1(?:–2)? of/);
  await page
    .getByRole("button", { name: "Bookmark page", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("folio.v1.magazineReading") || "{}")[
            "hackspace-75"
          ]?.page || 0,
      ),
    )
    .toBeGreaterThan(1);
  const position = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("folio.v1.magazineReading")!)[
        "hackspace-75"
      ],
  );
  expect(position.bookmark).toBe(position.page);
  await page
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open HackSpace 75", exact: true })
    .click();
  await expect(
    page.locator(".pdf-page canvas[aria-busy=false]").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bookmark page", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".reader-footer [role=status]")).toContainText(
    new RegExp(`Page ${position.page}(?:–\\d+)? of 100`),
  );
});
test("fashion onboarding recommends actual publications and personalized For You excludes unfollowed sources", async ({
  page,
}) => {
  await page.goto("./");
  // Leave all previous defaults unselected so this is an explicit opt-in library.
  for (const name of defaults.interests)
    await page.getByRole("button", { name, exact: true }).click();
  for (const name of ["Men’s Fashion", "Women’s Fashion"])
    await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const choices = page.locator('.source-checks input[type="checkbox"]');
  await expect(choices.first()).toBeVisible();
  expect(await choices.count()).toBeGreaterThanOrEqual(2);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create My Fylogia" }).click();
  await expect(page.locator(".story-open").first()).toBeVisible();
  const prefs = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("folio.v1.preferences")!),
  );
  expect(prefs.interests.sort()).toEqual(
    ["Men’s Fashion", "Women’s Fashion"].sort(),
  );
  const edition = await (await page.request.get("data/edition.json")).json();
  const fashionIds = sources
    .filter((source) =>
      source.categories.some((category) => prefs.interests.includes(category)),
    )
    .map((source) => source.id);
  const allowed = new Set(
    edition.articles
      .filter(
        (a: any) =>
          fashionIds.includes(a.sourceId) ||
          a.alsoIn?.some((id: string) => fashionIds.includes(id)),
      )
      .map((a: any) => a.source),
  );
  for (const source of await page
    .locator(".story-meta > span")
    .allTextContents())
    expect([...allowed].some((a) => source.includes(String(a)))).toBeTruthy();
});
