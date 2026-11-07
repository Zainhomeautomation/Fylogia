import { test, mockEdition } from "./edition-fixture";
import { expect, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { defaults } from "../src/catalog";

const viewports = [
  ["iPhone", 390, 844],
  ["iPhone Pro Max", 430, 932],
  ["Duo folded compact", 320, 740],
  ["Duo folded wide", 884, 708],
  ["Duo unfolded wide", 884, 832],
  ["Duo unfolded square", 720, 720],
  ["Duo unfolded tall", 832, 884],
  ["iPad mini portrait", 744, 1133],
  ["iPad mini landscape", 1133, 744],
  ["iPad Air portrait", 820, 1180],
  ["iPad Air landscape", 1180, 820],
  ["iPad Pro portrait", 1024, 1366],
  ["iPad Pro landscape", 1366, 1024],
  ["desktop", 1440, 1000],
] as const;

const headlines = [
  "A clear view of the day",
  "How thoughtful design is changing the way people live and work",
  "The long view: researchers share new findings from an international study",
];

async function seed(page: Page) {
  const edition = await (await page.request.get("data/edition.json")).json();
  await mockEdition(page, {
    ...edition,
    articles: headlines.map((title, i) => ({
      id: `premium-design-${i}`,
      title,
      sourceId: "nasa",
      source: "A Thoughtfully Named Independent Publisher",
      url: `https://example.test/premium-design/${i}`,
      categories: ["Technology"],
      region: "Worldwide",
      published: new Date(Date.now() - i * 60_000).toISOString(),
      excerpt: "A short publisher preview with useful context for readers.",
      content: "<p>Design regression fixture.</p>",
      full: false,
      ...(i === 0 ? { image: "https://images.example.test/cover.png" } : {}),
    })),
  });
  await page.addInitScript(
    (prefs) => {
      localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
      localStorage.setItem("fylogia.news.view", "list");
    },
    {
      ...defaults,
      complete: true,
      theme: "navy",
      interests: ["Technology"],
      sourceIds: ["nasa"],
    },
  );
  await page.route("https://images.example.test/cover.png", async (route) =>
    route.fulfill({
      body: await readFile("public/icons/icon-192.png"),
      contentType: "image/png",
    }),
  );
  await page.goto("./");
  await expect(page.locator(".editorial-grid .story")).toHaveCount(3);
  await page.evaluate(() => document.fonts.ready);
}

test("homepage keeps editorial hierarchy, permitted imagery and compact publisher fallbacks across device widths", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);

  for (const [name, width, height] of viewports) {
    await page.setViewportSize({ width, height });
    const lead = page.locator(".editorial-grid .story.lead");
    const photo = lead.locator(".story-open img");
    await expect(photo).toBeVisible();
    await expect(photo).toHaveAttribute("alt", "");
    await expect(lead.locator("h2")).toHaveText(headlines[0]);
    const layout = await page.evaluate(() => {
      const main = document.querySelector("main")!;
      const story = document.querySelector(".editorial-grid .story")!;
      const image = story.querySelector("img")!;
      const title = story.querySelector("h2")!;
      const fallback = document.querySelector(
        ".editorial-grid .story:not(.lead) .story-placeholder",
      )!;
      const fallbackName = fallback.querySelector("strong")!;
      return {
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        firstStoryTop: story.getBoundingClientRect().top,
        imageWidth: image.getBoundingClientRect().width,
        imageHeight: image.getBoundingClientRect().height,
        headlineHeight: title.getBoundingClientRect().height,
        headlineScrollHeight: title.scrollHeight,
        fallbackHeight: fallback.getBoundingClientRect().height,
        fallbackRatio:
          fallback.getBoundingClientRect().width /
          fallback.getBoundingClientRect().height,
        fallbackNameFont: parseFloat(getComputedStyle(fallbackName).fontSize),
        fallbackNameLines: fallbackName.getBoundingClientRect().height,
        storyText: main.innerText.includes("A clear view of the day"),
      };
    });
    expect(layout.documentWidth, name).toBeLessThanOrEqual(
      layout.viewportWidth + 1,
    );
    expect(layout.firstStoryTop, name).toBeLessThan(height * 0.8);
    expect(layout.imageWidth, name).toBeGreaterThan(120);
    expect(layout.imageHeight, name).toBeGreaterThan(80);
    expect(layout.headlineHeight, name).toBeGreaterThan(0);
    expect(layout.headlineScrollHeight, name).toBeLessThanOrEqual(
      layout.headlineHeight + 2,
    );
    expect(layout.fallbackHeight, name).toBeGreaterThan(50);
    expect(layout.fallbackRatio, name).toBeGreaterThan(
      width <= 440 ? 0.8 : 1.4,
    );
    expect(layout.fallbackNameFont, name).toBeLessThanOrEqual(14);
    expect(layout.fallbackNameLines, name).toBeLessThan(42);
    expect(layout.storyText, name).toBe(true);
    if (
      process.env.FYLOGIA_SCREENSHOTS &&
      ["iPhone", "iPad Pro landscape", "desktop"].includes(name)
    ) {
      await mkdir(process.env.FYLOGIA_SCREENSHOTS, { recursive: true });
      await page.screenshot({
        path: path.join(
          process.env.FYLOGIA_SCREENSHOTS,
          `homepage-${testInfo.project.name}-${name.replaceAll(" ", "-")}.png`,
        ),
      });
    }
  }
});

test("Settings stays compact while every existing preference remains accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Settings", exact: true })
    .click();

  await expect(page.locator(".appearance-options button")).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "Magazine pages" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continuous scroll" }),
  ).toBeVisible();
  await expect(page.getByLabel("Reading text size")).toBeVisible();
  await expect(
    page.locator(".settings select[aria-label='Regional news']"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Export library" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Offline reading" }),
  ).toBeVisible();
  const measurements = await page
    .locator(".settings section")
    .evaluateAll((sections) =>
      sections.map((section) => {
        const rect = section.getBoundingClientRect();
        return { height: rect.height, top: rect.top, bottom: rect.bottom };
      }),
    );
  expect(measurements.length).toBeGreaterThan(3);
  expect(measurements[0].height).toBeLessThan(180);
  for (const [index, section] of measurements.entries()) {
    if (index)
      expect(section.top - measurements[index - 1].bottom).toBeLessThan(28);
  }
  for (const button of await page.locator(".appearance-options button").all()) {
    await button.focus();
    await expect(button).toBeFocused();
  }
  expect(await page.locator("html").getAttribute("data-theme")).toBe("navy");
});
