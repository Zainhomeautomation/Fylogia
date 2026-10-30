import { test, expect } from "@playwright/test";
import { defaults } from "../src/catalog";
import { mockEdition } from "./edition-fixture";
test("legacy saved NASA articles hide restricted photographs while retaining text, permitted figures and original stored data", async ({
  page,
}) => {
  const data = await (await page.request.get("data/edition.json")).json();
  const base = data.articles.find((a: any) => a.full && a.sourceId === "nasa");
  const pixel =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aLFsAAAAASUVORK5CYII=";
  const article = {
    ...base,
    id: "https://reader.example/rights",
    title: "Legacy rights regression",
    image: "https://reader.example/restricted.jpg",
    content: `<p>Retained agency text.</p><figure><img src="https://reader.example/restricted.jpg"><figcaption>© External Museum</figcaption></figure><figure><img src="${pixel}"><figcaption>Credit: NASA</figcaption></figure><p>Final agency paragraph.</p>`,
  };
  await mockEdition(page, { ...data, articles: [article] });
  await page.addInitScript(
    ({ article, prefs }) => {
      localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
      localStorage.setItem("folio.v1.saved", JSON.stringify([article]));
    },
    { article, prefs: { ...defaults, complete: true, sourceIds: ["nasa"] } },
  );
  const requested: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("restricted.jpg")) requested.push(r.url());
  });
  await page.goto("saved");
  await expect(page.locator(".story img")).toHaveCount(0);
  await page.locator(".story-open").click();
  await expect(page.locator(".article-body")).toContainText(
    "Final agency paragraph.",
  );
  await expect(page.locator(".article-body")).not.toContainText(
    "External Museum",
  );
  await expect(page.locator(".article-body img")).toHaveCount(1);
  expect(requested).toEqual([]);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("folio.v1.saved")!)[0].content,
    ),
  ).toContain("© External Museum");
});
