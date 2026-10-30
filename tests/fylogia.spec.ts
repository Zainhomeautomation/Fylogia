import { readerOption } from "./reader-controls";
import { test, expect, type Page } from "@playwright/test";
async function setup(page: Page) {
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
  await expect(page.locator(".story").first()).toBeVisible();
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
test("onboarding, real stories, saves, history, theme and persistent preferences", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await expect(page).toHaveTitle("Fylogia — Read your world");
  await expect
    .poll(
      () =>
        page
          .locator(".story.lead img")
          .evaluate(
            (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
          ),
      { timeout: 25000 },
    )
    .toBeTruthy();
  if (process.env.FYLOGIA_SCREENSHOTS)
    await page.screenshot({
      animations: "disabled",
      scale: "css",
      path:
        process.env.FYLOGIA_SCREENSHOTS +
        "/" +
        test.info().project.name +
        "-home.png",
    });
  await expect(page.locator(".story img").first()).toHaveAttribute(
    "src",
    /^https:\/\//,
  );
  const headline = await page.locator(".story h2").first().innerText();
  await page
    .locator(".story")
    .first()
    .getByRole("button", { name: /^Save / })
    .click();
  await page.locator(".story-open").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Read original/ }),
  ).toHaveAttribute("href", /^https:\/\//);
  await page
    .getByRole("button", { name: "Save article", exact: true })
    .count()
    .then(async (n) => {
      if (n)
        await page
          .getByRole("button", { name: "Save article", exact: true })
          .click();
    });
  await page.getByRole("button", { name: "Back to previous section" }).click();
  await nav(page, "Saved Articles");
  await expect(
    page.getByRole("heading", { name: headline, exact: true }),
  ).toBeVisible();
  await nav(page, "History");
  await expect(
    page.getByRole("heading", { name: headline, exact: true }),
  ).toBeVisible();
  await nav(page, "Settings");
  await page
    .getByRole("button", { name: "Editorial Green", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await nav(page, "Saved Articles");
  await expect(
    page.getByRole("heading", { name: headline, exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("full article pagination, resize, summaries and scrolling", async ({
  page,
}) => {
  await setup(page);
  await nav(page, "Explore");
  const data = await (await page.request.get("data/edition.json")).json();
  const article = data.articles
    .filter((a: any) => a.full)
    .sort((a: any, b: any) => b.content.length - a.content.length)[0];
  await page
    .getByRole("textbox", { name: "Search stories", exact: true })
    .fill(article.title);
  await page.locator(".story-open").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".reader-footer")).toContainText(
    /(?:Page|Spread) 1 of/,
  );
  const total = Number(
    (await page.locator(".reader-footer").innerText()).match(/of (\d+)/)?.[1],
  );
  expect(total).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.locator(".reader-footer")).toContainText(
    /(?:Page|Spread) 2 of/,
  );
  await page.setViewportSize({ width: 360, height: 740 });
  await expect(page.locator(".reader-footer")).toContainText("Page");
  await expect(page.locator(".reader-content")).toHaveCSS("column-count", "1");
  if (process.env.FYLOGIA_SCREENSHOTS)
    await page.screenshot({
      animations: "disabled",
      scale: "css",
      path:
        process.env.FYLOGIA_SCREENSHOTS +
        "/" +
        test.info().project.name +
        "-reader-mobile.png",
    });
  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(page.locator(".reader-content")).toHaveCSS("column-count", "2");
  if (process.env.FYLOGIA_SCREENSHOTS)
    await page.screenshot({
      animations: "disabled",
      scale: "css",
      path:
        process.env.FYLOGIA_SCREENSHOTS +
        "/" +
        test.info().project.name +
        "-reader-spread.png",
    });
  await (await readerOption(page, "Switch to scrolling")).click();
  await expect(page.locator(".reader-viewport")).toHaveClass(/scrolling/);
  await page.getByRole("button", { name: "Summarize", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    /summary|AI summarization/,
  );
  await page.getByRole("button", { name: "Back to reading" }).click();
  await page.getByRole("button", { name: "Back to previous section" }).click();
});
test("all category and regional controls, source follow, search and no horizontal overflow", async ({
  page,
}) => {
  await setup(page);
  for (const width of [320, 390, 744, 834, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBeTruthy();
  }
  await nav(page, "Categories");
  await page.getByRole("button", { name: /Cars/ }).click();
  await expect(page.locator(".filter-tabs button.selected")).toHaveText("Cars");
  await expect(page.locator(".story").first()).toBeVisible();
  await nav(page, "My Sources");
  await page.getByLabel("Search sources", { exact: true }).fill("NASA");
  const row = page
    .locator(".source-row")
    .filter({ has: page.getByText("NASA", { exact: true }) });
  await row.getByRole("button", { name: "Following", exact: true }).click();
  await expect(
    row.getByRole("button", { name: "Follow", exact: true }),
  ).toBeVisible();
  await row.getByRole("button", { name: "Follow", exact: true }).click();
  await nav(page, "Settings");
  await page
    .getByRole("combobox", { name: "Regional news", exact: true })
    .selectOption("Middle East");
  await nav(page, "Explore");
  await page
    .getByRole("textbox", { name: "Search stories", exact: true })
    .fill("zzzznotastory");
  await expect(
    page.getByRole("heading", { name: "No stories found." }),
  ).toBeVisible();
});
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
  await expect(page.locator("canvas").first()).toBeVisible({ timeout: 60000 });
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
          const canvases = [...node.querySelectorAll("canvas")];
          let ink = false;
          for (const canvas of canvases) {
            const ctx = canvas.getContext("2d")!;
            const { data } = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height,
            );
            for (let i = 0; i < data.length; i += 64 * 4)
              if (
                data[i + 3] &&
                Math.min(data[i], data[i + 1], data[i + 2]) < 150
              ) {
                ink = true;
                break;
              }
          }
          const surface = document.querySelector(".pdf-spread")!;
          (window as any).__pdfPaper = {
            hidden: node.inert && node.getAttribute("aria-hidden") === "true",
            ink,
            pixels: canvases.reduce((n, c) => n + c.width * c.height, 0),
            max: surface.clientWidth * surface.clientHeight * 1.1,
          };
          observer.disconnect();
        }
    });
    observer.observe(document.querySelector(".pdf-spread")!, {
      childList: true,
    });
  });
  await page.getByRole("button", { name: "Next magazine page" }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).__pdfPaper))
    .not.toBeNull();
  const paper = await page.evaluate(() => (window as any).__pdfPaper);
  expect(paper.hidden).toBe(true);
  expect(paper.ink).toBe(true);
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
  const previewBounds = (await surface.boundingBox())!;
  expect(previewPixels).toBeLessThanOrEqual(
    previewBounds.width * previewBounds.height,
  );
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
test("install manifest, service worker and offline saved reading", async ({
  page,
  context,
}) => {
  await setup(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page
    .locator(".story")
    .first()
    .getByRole("button", { name: /^Save / })
    .click();
  const manifest = await page.request.get("manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).display).toBe("standalone");
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toBeVisible();
  await nav(page, "Saved Articles");
  await page.locator(".story-open").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".article-body")).not.toBeEmpty();
  await context.setOffline(false);
});

test("custom RSS file, library export/import and sanitized article content", async ({
  page,
}) => {
  await setup(page);
  const edition = await (await page.request.get("data/edition.json")).json();
  const article = edition.articles.find((a: any) => a.full);
  await nav(page, "My Sources");
  await page
    .getByRole("textbox", { name: "Source name" })
    .fill("NASA custom import");
  await page
    .getByRole("textbox", { name: "Feed URL" })
    .fill("https://www.nasa.gov/feed/?fylogia-custom=1");
  const escape = (s: string) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  const xml = `<rss version="2.0"><channel><title>NASA</title><item><title>${escape(article.title)}</title><link>${escape(article.url + "?fylogia-import=1")}</link><description>${escape(article.excerpt)}</description></item></channel></rss>`;
  await page.locator("input[type=file]").setInputFiles({
    name: "nasa.xml",
    mimeType: "application/xml",
    buffer: Buffer.from(xml),
  });
  await expect(
    page.getByRole("status").filter({ hasText: "Added NASA custom import" }),
  ).toHaveText("Added NASA custom import with 1 articles.");
  await nav(page, "Settings");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export library" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("fylogia-library.json");
  const exported = await page.evaluate(() => ({
    version: 1,
    preferences: JSON.parse(localStorage.getItem("folio.v1.preferences")!),
    saved: [],
    history: [],
    custom: JSON.parse(localStorage.getItem("folio.v1.custom")!),
  }));
  exported.saved = [
    {
      ...article,
      content:
        article.content +
        '<script>window.fylogiaUnsafe=true</script><img src="x" onerror="window.fylogiaUnsafe=true"><a href="javascript:alert(1)">Unsafe test link</a>',
    },
  ];
  await page.locator("input[type=file]").setInputFiles({
    name: "library.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await expect(page.getByRole("status")).toContainText(
    "Library imported successfully.",
  );
  await nav(page, "Saved Articles");
  await page.locator(".story-open").click();
  await expect(page.locator(".article-body script")).toHaveCount(0);
  await expect(page.locator(".article-body [onerror]")).toHaveCount(0);
  expect(
    await page.evaluate(() => Boolean((window as any).fylogiaUnsafe)),
  ).toBeFalsy();
});

test("private PDF import survives reload and opens original page layout", async ({
  page,
}) => {
  await setup(page);
  await nav(page, "Magazines");
  const content = "BT /F1 24 Tf 50 700 Td (Fylogia PDF import test) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((o) => String(o).padStart(10, "0") + " 00000 n ")
    .join(
      "\n",
    )}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  await page.locator("input[type=file]").setInputFiles({
    name: "Fylogia local PDF test.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(pdf),
  });
  await expect(
    page.getByRole("button", { name: /Fylogia local PDF test/ }),
  ).toBeVisible();
  await page.reload();
  await nav(page, "Magazines");
  await page.getByRole("button", { name: /Fylogia local PDF test/ }).click();
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".reader-footer")).toContainText("Page 1 of 1");
  await page.getByRole("button", { name: "Back to previous section" }).click();
  await expect(
    page.getByRole("button", { name: /Fylogia local PDF test/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Fylogia local PDF test/ }).click();
  await page.getByRole("button", { name: "Home — For You" }).click();
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Fylogia branding preserves legacy libraries and installation identity", async ({
  page,
}) => {
  const edition = await (await page.request.get("data/edition.json")).json();
  const article = edition.articles.find((a: any) => a.full);
  await page.addInitScript(
    ({ article }) => {
      localStorage.setItem(
        "folio.v1.preferences",
        JSON.stringify({
          complete: true,
          interests: ["Space"],
          topics: [],
          region: "Worldwide",
          sourceIds: ["nasa"],
          customSources: [],
          theme: "light",
          reading: "pages",
          fontSize: 19,
          converter: false,
        }),
      );
      localStorage.setItem("folio.v1.saved", JSON.stringify([article]));
      localStorage.setItem("folio.v1.history", JSON.stringify([article]));
    },
    { article },
  );
  await page.goto("./");
  await expect(page).toHaveTitle("Fylogia — Read your world");
  await expect(
    page.getByRole("heading", { name: "Your daily perspective." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What draws you in?" }),
  ).toHaveCount(0);
  await expect(page.locator('meta[name="application-name"]')).toHaveAttribute(
    "content",
    "Fylogia",
  );
  await expect(
    page.locator('meta[name="apple-mobile-web-app-title"]'),
  ).toHaveAttribute("content", "Fylogia");
  const manifest = await (
    await page.request.get("manifest.webmanifest")
  ).json();
  expect(manifest.name).toBe("Fylogia — Read your world");
  expect(manifest.short_name).toBe("Fylogia");
  const base = new URL("./", page.url()).pathname;
  expect(manifest.id).toBe(base === "/Fylogia/" ? "/Folio/" : base);
  expect(manifest.start_url).toBe(new URL("./", page.url()).pathname);
  expect(await (await page.request.get("icon.svg")).text()).toContain(
    "Fylogia",
  );
  await nav(page, "Saved Articles");
  await expect(
    page.getByRole("heading", { name: article.title, exact: true }),
  ).toBeVisible();
  await page.locator(".story-open").click();
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () =>
        document.querySelector(".reader-toolbar")!.scrollWidth <=
        window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Back to previous section" }).click();
  await nav(page, "History");
  await expect(
    page.getByRole("heading", { name: article.title, exact: true }),
  ).toBeVisible();
});
