import { test, expect, type Page } from "@playwright/test";
// Snapshotting full PDF canvases competes with printed-animation sampling.
// Retain action traces and the existing pixel, order, memory and bookmark assertions.
test.use({
  trace: { mode: "retain-on-failure", screenshots: false, snapshots: false },
});
async function setup(page: Page, waitForStories = true) {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "What draws you in?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Good reading starts here." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create My Fylogia" }).click();
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toBeVisible();
  // Source slices can arrive after the shell on a busy WebKit CI runner.
  if (waitForStories)
    await expect(page.locator(".story").first()).toBeVisible({
      timeout: 15000,
    });
}
async function nav(page: Page, label: string) {
  // IndexedDB restoration may finish after the document load event.
  await expect(page.locator(".mobile-header")).toBeAttached();
  if (await page.getByRole("button", { name: "Open navigation" }).isVisible())
    await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name: label, exact: true })
    .click();
}
test("real original PDF renders, turns pages, bookmarks and persists", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).fylogiaPolicyViolations = [];
    window.addEventListener("securitypolicyviolation", (event) =>
      (window as any).fylogiaPolicyViolations.push(event.violatedDirective),
    );
  });
  const decodeWarnings: string[] = [];
  page.on("console", (message) => {
    if (
      /Unable to decode image|OpenJPEG failed|wasmUrl.*provided/.test(
        message.text(),
      )
    )
      decodeWarnings.push(message.text());
  });
  test.setTimeout(120000);
  await setup(page);
  await nav(page, "Magazines");
  await page.getByRole("button", { name: /NASA Spinoff 2025/ }).click();
  await expect(page.locator("canvas").first()).toBeVisible({
    timeout: 60000,
  });
  await expect(page.locator(".reader-footer")).toContainText(/of \d+/);
  await page.getByRole("button", { name: "Enter immersive reading" }).click();
  await expect(
    page.getByRole("button", { name: "Bookmark page" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Exit immersive reading" }).click();
  await expect(
    page.getByRole("button", { name: "Bookmark page" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("canvas")
        .first()
        .evaluate((canvas: HTMLCanvasElement) => canvas.style.width),
    )
    .not.toBe("");
  await expect(page.locator(".pdf-page canvas[aria-busy=true]")).toHaveCount(
    0,
    { timeout: 30000 },
  );
  await page.evaluate(() => {
    (window as any).__pdfPaper = null;
    const observer = new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes) {
          if (
            !(node instanceof HTMLElement) ||
            !node.classList.contains("turn-leaf")
          )
            continue;
          // Each face shares one decoded image; inspect its real pixels rather
          // than requiring the previous implementation's per-strip canvases.
          void (async () => {
            const images = [...node.querySelectorAll<HTMLImageElement>("img")];
            await Promise.all(images.map((img) => img.decode()));
            const unique = [
              ...new Map(images.map((img) => [img.src, img])).values(),
            ];
            const scratch = document.createElement("canvas");
            scratch.width = scratch.height = 128;
            const ctx = scratch.getContext("2d")!;
            let ink = false;
            for (const img of unique) {
              ctx.clearRect(0, 0, 128, 128);
              ctx.drawImage(img, 0, 0, 128, 128);
              const { data } = ctx.getImageData(0, 0, 128, 128);
              for (let i = 0; i < data.length; i += 4)
                if (
                  data[i + 3] &&
                  Math.min(data[i], data[i + 1], data[i + 2]) < 150
                ) {
                  ink = true;
                  break;
                }
            }
            (window as any).__pdfPaper = {
              hidden: node.inert && node.getAttribute("aria-hidden") === "true",
              ink,
              sharedImages: unique.length,
              pixels: unique.reduce(
                (n, img) => n + img.naturalWidth * img.naturalHeight,
                0,
              ),
              max: 4_001_000,
            };
          })();
          observer.disconnect();
        }
    });
    observer.observe(document.querySelector(".pdf-spread")!, {
      childList: true,
    });
  });
  await page.getByRole("button", { name: "Next magazine page" }).click();
  // PDF preparation is bounded at ten seconds by the reader. Five seconds
  // can expire before raster decoding finishes on a busy CI runner; keep the
  // pixel/memory assertions below and allow preparation plus paint to finish.
  await expect
    .poll(() => page.evaluate(() => (window as any).__pdfPaper), {
      timeout: 15000,
    })
    .not.toBeNull();
  const paper = await page.evaluate(() => (window as any).__pdfPaper);
  expect(paper.hidden).toBe(true);
  expect(paper.ink).toBe(true);
  expect(paper.sharedImages).toBeGreaterThan(0);
  expect(paper.sharedImages).toBeLessThanOrEqual(2);
  expect(paper.pixels).toBeLessThanOrEqual(paper.max);
  await expect(page.locator(".turn-leaf")).toHaveCount(0);
  await expect(page.locator(".reader-footer")).not.toContainText("Page 1 ");
  await page.getByRole("button", { name: "Bookmark page" }).click();
  await expect(
    page.getByRole("button", { name: "Bookmark page" }),
  ).toHaveAttribute("aria-pressed", "true");
  const corner = page.getByRole("button", {
    name: "Drag or tap to turn forward",
  });
  const edge = (await corner.boundingBox())!;
  const surface = page.locator(".pdf-spread");
  const dragWidth =
    (await surface.boundingBox())!.width /
    Number(await surface.getAttribute("data-spread"));
  await page.mouse.move(edge.x + 24, edge.y + 24);
  await page.mouse.down();
  await page.mouse.move(edge.x + 24 - dragWidth * 0.5, edge.y, { steps: 8 });
  await expect(page.locator(".curl-strip")).toHaveCount(12);
  await expect(page.locator(".curl-underlay canvas").first()).toBeVisible({
    timeout: 15000,
  });
  const previewPixels = await page
    .locator(".curl-underlay canvas")
    .evaluateAll((nodes) =>
      nodes.reduce(
        (sum, n) =>
          sum +
          (n as HTMLCanvasElement).width * (n as HTMLCanvasElement).height,
        0,
      ),
    );
  // Up to two adjacent PDF pages, each bounded at two megapixels.
  expect(previewPixels).toBeLessThanOrEqual(4_001_000);
  await page.mouse.up();
  await expect(page.locator(".turn-leaf")).toHaveCount(0);
  await page.getByRole("button", { name: "Bookmark page" }).click();
  const text = await page.locator(".reader-footer [role=status]").innerText();
  await page.getByRole("button", { name: "Back to previous section" }).click();
  await page.getByRole("button", { name: /NASA Spinoff 2025/ }).click();
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.locator(".reader-footer [role=status]")).toHaveText(text);
  expect(decodeWarnings).toEqual([]);
  expect(
    await page.evaluate(() => (window as any).fylogiaPolicyViolations),
  ).toEqual([]);
});
