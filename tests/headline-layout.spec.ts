import { test, mockEdition } from "./edition-fixture";
import { expect, type Page } from "@playwright/test";
import { defaults } from "../src/catalog";
test.use({ hasTouch: true, storageState: { cookies: [], origins: [] } });
const titles = [
  "Singapore updates",
  "Singapore announces new transport connections and improvements for daily commuters across the city",
  "Singapore unveils a comprehensive programme for communities, transport, science and education as local leaders explain how a series of long-term investments will improve everyday life for families, students, businesses and visitors across the region without leaving smaller neighbourhoods behind",
  "An extraordinarily detailed international news headline: " +
    "communities share their plans for a more connected and resilient future "
      .repeat(15)
      .trim(),
  "A headline with an exceptionally long identifier " +
    "SingaporeInfrastructure".repeat(16),
];
async function seed(page: Page) {
  const edition = await (await page.request.get("data/edition.json")).json();
  await mockEdition(page, {
    ...edition,
    articles: titles.map((title, i) => ({
      id: `headline-layout-${i}`,
      title,
      sourceId: "nasa",
      source: "Layout regression publisher",
      url: `https://example.test/headline/${i}`,
      categories: ["Technology"],
      region: "Worldwide",
      published: new Date(Date.now() - i * 60000).toISOString(),
      excerpt:
        i === 1
          ? ""
          : "This is a complete introductory sentence. " +
            "A detailed publisher description with additional context for readers. ".repeat(
              30,
            ),
      content: "<p>Publisher preview used only by this layout regression.</p>",
      full: false,
    })),
  });
  await page.addInitScript(
    (prefs) => {
      localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
    },
    {
      ...defaults,
      complete: true,
      interests: ["Technology"],
      sourceIds: ["nasa"],
    },
  );
  await page.goto("./");
  await expect(page.locator(".news-book")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
const surface = (page: Page) => page.locator(".news-book > .news-feed-surface");
const active = (page: Page) => surface(page).locator(":scope > .feed-spread");
async function measure(page: Page) {
  const metrics = await active(page)
    .locator(".feed-sheet:not(.feed-end)")
    .evaluateAll((sheets) =>
      sheets.map((sheet) => {
        const heading = sheet.querySelector("h2")!;
        const title = heading.getBoundingClientRect();
        const box = sheet.getBoundingClientRect();
        const surface = sheet
          .closest(".news-feed-surface")!
          .getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(heading);
        const lines = [...range.getClientRects()];
        const paragraph = sheet.querySelector(".story-open p");
        const controls = sheet
          .querySelector(".story-meta")!
          .getBoundingClientRect();
        return {
          text: heading.textContent,
          fullLinesVisible: lines.every(
            (r) =>
              r.left >= title.left - 1 &&
              r.right <= title.right + 1 &&
              r.top >= title.top - 1 &&
              r.bottom <= title.bottom + 1 &&
              r.left >= box.left - 1 &&
              r.right <= box.right + 1 &&
              r.bottom <= box.bottom + 1 &&
              r.bottom <= surface.bottom + 1,
          ),
          clamp: getComputedStyle(heading).webkitLineClamp,
          overflow: getComputedStyle(heading).overflow,
          fontSize: parseFloat(getComputedStyle(heading).fontSize),
          widthFits: sheet.scrollWidth <= sheet.clientWidth + 1,
          widths: [sheet.scrollWidth, sheet.clientWidth, box.width],
          overflowingChildren: [...sheet.querySelectorAll("*")]
            .filter((n) => n.getBoundingClientRect().right > box.right + 1)
            .map((n) => ({
              tag: n.tagName,
              text: n.textContent?.slice(0, 40),
              right: n.getBoundingClientRect().right,
              boundary: box.right,
            })),
          scrollingChildren: [...sheet.querySelectorAll("*")]
            .filter((n) => n.scrollWidth > n.clientWidth + 1)
            .map((n) => ({
              class: n.className,
              sw: n.scrollWidth,
              cw: n.clientWidth,
              rect: n.getBoundingClientRect().width,
              text: n.textContent?.slice(0, 30),
            })),
          heightFits: sheet.scrollHeight <= sheet.clientHeight + 1,
          controlsFit:
            controls.bottom <= box.bottom + 1 && controls.top >= title.bottom,
          paragraphFits:
            !paragraph ||
            (paragraph.scrollHeight <= paragraph.clientHeight + 1 &&
              paragraph.getBoundingClientRect().bottom <= controls.top + 1),
          preview: paragraph?.textContent || "",
        };
      }),
    );
  for (const m of metrics) {
    expect(titles).toContain(m.text);
    expect(m.fullLinesVisible, JSON.stringify(m)).toBe(true);
    expect(m.clamp).toBe("none");
    expect(m.overflow).not.toBe("hidden");
    expect(m.fontSize).toBeGreaterThanOrEqual(24);
    expect(m.widthFits, JSON.stringify(m)).toBe(true);
    expect(m.heightFits).toBe(true);
    expect(m.controlsFit).toBe(true);
    expect(m.paragraphFits).toBe(true);
    if (m.preview) {
      expect(m.preview.length).toBeLessThanOrEqual(221);
      expect(m.preview).toMatch(/[.!?…]$/);
    }
  }
  return metrics.map((m) => m.text);
}
async function settled(page: Page) {
  await expect(surface(page)).not.toHaveAttribute("data-page-turn", /.+/);
}
const viewports = [
  ["phone/external portrait", 390, 844],
  ["phone landscape", 844, 390],
  ["small external", 320, 740],
  ["unfolded", 844, 740],
  ["iPad mini portrait", 744, 1133],
  ["iPad mini landscape", 1133, 744],
  ["iPad Air portrait", 820, 1180],
  ["iPad Air landscape", 1180, 820],
  ["iPad Pro portrait", 1024, 1366],
  ["iPad Pro landscape", 1366, 1024],
  ["desktop", 1440, 1000],
] as const;
test("complete headlines, natural previews and controls fit across tablet, phone and desktop sizes", async ({
  page,
}) => {
  test.setTimeout(180000);
  await seed(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [name, width, height] of viewports) {
    await page.setViewportSize({ width, height });
    // Return to the first page without replacing the book or its stored library.
    const prev = page.getByRole("button", {
      name: "Previous stories",
      exact: true,
    });
    while (await prev.isEnabled()) {
      await prev.click();
      await settled(page);
    }
    const seen = new Set<string>();
    for (let turn = 0; turn < titles.length; turn++) {
      for (const text of await measure(page)) seen.add(text!);
      const next = page.getByRole("button", {
        name: "Next stories",
        exact: true,
      });
      if (await next.isDisabled()) break;
      await next.click();
      await settled(page);
    }
    expect([...seen].sort(), name).toEqual([...titles].sort());
  }
});
test("enlarged text and browser zoom reflow complete headlines without losing the current story", async ({
  page,
}) => {
  await seed(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Next stories", exact: true }).click();
  await settled(page);
  const id = await active(page)
    .locator("[data-story-id]")
    .first()
    .getAttribute("data-story-id");
  for (const zoom of [1.25, 1.5, 2]) {
    // CSS zoom exercises actual layout scaling in both engines; narrow CSS
    // viewports above separately cover desktop browser zoom's reduced viewport.
    await page.evaluate((z) => {
      document.documentElement.style.zoom = String(z);
    }, zoom);
    await measure(page);
    expect(
      await active(page)
        .locator("[data-story-id]")
        .evaluateAll((n) => n.map((e) => e.getAttribute("data-story-id"))),
    ).toContain(id);
  }
});
test("long-title paper snapshots fit before a real curl and after forward/backward turns", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await seed(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await measure(page);
  await page.getByRole("button", { name: "Next stories", exact: true }).click();
  await expect(surface(page).locator(".paper-fold")).toBeVisible();
  await expect(surface(page).locator(".paper-band").first()).toBeVisible();
  await settled(page);
  await measure(page);
  const long = await active(page).locator("h2").first().innerText();
  await page
    .getByRole("button", { name: /^Save / })
    .first()
    .click();
  const saved = await page.evaluate(() =>
    localStorage.getItem("folio.v1.saved"),
  );
  await active(page).locator(".story-open").first().click();
  await expect(page.locator(".reader")).toBeVisible();
  await page
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  await expect(active(page).locator("h2").first()).toHaveText(long);
  await measure(page);
  expect(
    await page.evaluate(() => localStorage.getItem("folio.v1.saved")),
  ).toBe(saved);
  await page
    .getByRole("button", { name: "Previous stories", exact: true })
    .click();
  await expect(surface(page).locator(".paper-fold")).toBeVisible();
  await settled(page);
  await measure(page);
});
