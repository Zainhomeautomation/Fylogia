import { test, expect, type Page } from "@playwright/test";
async function openFixture(page: Page, full = true, media = false) {
  const edition = await (await page.request.get("data/edition.json")).json();
  const base = edition.articles.find((a: any) => a.full);
  const text = Array.from(
    { length: 24 },
    (_, i) =>
      `<p>Paragraph ${i + 1}. ${"A measured reading fixture preserves every word through changing page dimensions. ".repeat(8)}</p>`,
  ).join("");
  const article = {
    ...base,
    id: "https://reader.example/fixture",
    url: "https://reader.example/fixture",
    title: full
      ? "Pagination regression fixture"
      : "Preview regression fixture",
    sourceId: "nasa",
    image: undefined,
    feedContexts: undefined,
    alsoIn: undefined,
    full,
    content: full
      ? "<h2>Opening</h2>" +
        (media
          ? '<figure><img src="https://reader.example/one.png" alt="Reading test fixture"><figcaption>First credited fixture photograph.</figcaption></figure><figure><img src="https://reader.example/two.png" alt="Second test fixture"><figcaption>Second credited fixture photograph.</figcaption></figure>'
          : "") +
        text +
        "<h2>Final section</h2><p>Final sentence remains readable.</p>"
      : "<p>A concise publisher preview.</p>",
    excerpt: "Reader fixture",
    previewReason:
      "Internal permission diagnostics must remain out of reader UI.",
  };
  await page.route("**/data/edition.json*", (r) =>
    r.fulfill({ json: { ...edition, articles: [article] } }),
  );
  await page.addInitScript(() =>
    localStorage.setItem(
      "folio.v1.preferences",
      JSON.stringify({
        complete: true,
        interests: ["Space"],
        topics: [],
        region: "Worldwide",
        sourceIds: ["nasa"],
        customSources: [],
        theme: "navy",
        reading: "pages",
        fontSize: 19,
        converter: false,
      }),
    ),
  );
  await page.goto("./");
  await page.locator(".story-open").click();
  return article;
}
async function intact(page: Page) {
  const result = await page.locator(".reader-content").evaluate((el) => {
    const bounds = el.closest(".reader-viewport")!.getBoundingClientRect();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const errors: string[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects())
        if (
          r.height > 0 &&
          (r.top < bounds.top - 2 || r.bottom > bounds.bottom + 2)
        )
          errors.push(node.textContent.slice(0, 35));
    }
    return errors;
  });
  expect(result).toEqual([]);
}
test("long article repaginates without losing or clipping text and scroll progress survives reopening", async ({
  page,
}) => {
  await openFixture(page);
  const body = page.locator(".reader-content .article-body");
  const original = await body.innerText();
  await page.setViewportSize({ width: 820, height: 1100 });
  await expect(page.locator(".reader-viewport")).toHaveAttribute(
    "data-spread",
    "2",
  );
  await intact(page);
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".reader-viewport")).toHaveAttribute(
    "data-spread",
    "1",
  );
  await intact(page);
  await page.getByRole("button", { name: "Increase text size" }).click();
  await intact(page);
  expect(await body.innerText()).toBe(original);
  await page.getByRole("button", { name: "Switch to scrolling" }).click();
  await page.locator(".reader-viewport").evaluate((el) => {
    el.scrollTop = (el.scrollHeight - el.clientHeight) * 0.55;
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("folio.v1.progress") || "{}")[
            "https://reader.example/fixture"
          ],
      ),
    )
    .toBeGreaterThan(0.5);
  await page.getByRole("button", { name: "Switch to pages" }).click();
  await expect(page.locator(".reader-footer")).not.toContainText("Page 1 of");
  await page.getByRole("button", { name: "Switch to scrolling" }).click();
  await expect
    .poll(() =>
      page
        .locator(".reader-viewport")
        .evaluate((el) => el.scrollTop / (el.scrollHeight - el.clientHeight)),
    )
    .toBeGreaterThan(0.4);
  await page.getByRole("button", { name: "Back to previous section" }).click();
  await page.locator(".story-open").click();
  await expect
    .poll(() =>
      page
        .locator(".reader-viewport")
        .evaluate((el) => el.scrollTop / (el.scrollHeight - el.clientHeight)),
    )
    .toBeGreaterThan(0.5);
  await page.getByRole("button", { name: "Switch to pages" }).click();
  await expect(page.locator(".reader-footer")).not.toContainText("Page 1 of");
  await intact(page);
  expect(await body.innerText()).toBe(original);
});
test("preview has prominent original-publisher action without technical licensing warnings", async ({
  page,
}) => {
  const article = await openFixture(page, false);
  await expect(page.locator(".preview-note")).toHaveText(
    /Article preview — Continue reading at the original publisher\.\s*Continue Reading/,
  );
  const link = page.getByRole("link", {
    name: "Continue Reading",
    exact: true,
  });
  await expect(link).toHaveAttribute("href", article.url);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(page.getByRole("dialog")).not.toContainText(
    "Internal permission",
  );
  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(page.locator(".reader-viewport")).toHaveAttribute(
    "data-spread",
    "1",
  );
  await expect(page.locator(".page-turn-tutorial")).toHaveCount(0);
});

test("multiple permitted figures and captions remain readable after font and viewport changes", async ({
  page,
}) => {
  await page.route("https://reader.example/*.png", (r) =>
    r.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aLFsAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await openFixture(page, true, true);
  await expect(page.locator(".reader-content .article-body img")).toHaveCount(
    2,
  );
  await expect
    .poll(() =>
      page
        .locator(".reader-content .article-body img")
        .evaluateAll((nodes) =>
          nodes.every(
            (n) =>
              (n as HTMLImageElement).complete &&
              (n as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBeTruthy();
  for (const dimensions of [
    { width: 390, height: 740 },
    { width: 820, height: 1100 },
    { width: 1200, height: 900 },
  ]) {
    await page.setViewportSize(dimensions);
    await page.getByRole("button", { name: "Increase text size" }).click();
    await intact(page);
    await expect(
      page.locator(".reader-content .article-body figcaption"),
    ).toHaveCount(2);
  }
});
