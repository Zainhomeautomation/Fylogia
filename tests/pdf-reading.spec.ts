import { test, expect } from "@playwright/test";
import { magazineFixture } from "./pdf-fixture";
test("original PDF covers, fitting, zoom, automatic progress and offline reading survive resizing", async ({
  page,
  context,
  browserName,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Create My Fylogia" }).click();
  const magazines = page.getByRole("button", {
    name: "Magazines",
    exact: true,
  });
  if (await page.getByRole("button", { name: "Open navigation" }).isVisible())
    await page.getByRole("button", { name: "Open navigation" }).click();
  await magazines.click();
  await expect(
    page.getByAltText("NASA Spinoff 2025 — original publication cover"),
  ).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    name: "Portrait magazine.pdf",
    mimeType: "application/pdf",
    buffer: magazineFixture(),
  });
  const edition = page.getByRole("button", { name: /Portrait magazine/ });
  await expect(edition.locator("img")).toHaveAttribute("src", /^data:image\//);
  await edition.click();
  const surface = page.locator(".pdf-spread");
  for (const size of [
    { width: 390, height: 844 },
    { width: 820, height: 1100 },
    { width: 1180, height: 850 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(size);
    await expect(
      page.locator(".pdf-page canvas[aria-busy=false]").first(),
    ).toBeVisible();
    await expect
      .poll(async () =>
        page.locator(".pdf-page canvas").evaluateAll((nodes) => {
          const bounds = document
            .querySelector(".pdf-spread")!
            .getBoundingClientRect();
          return nodes.every((n) => {
            const r = n.getBoundingClientRect();
            return (
              r.top >= bounds.top &&
              r.bottom <= bounds.bottom + 1 &&
              r.left >= bounds.left &&
              r.right <= bounds.right + 1
            );
          });
        }),
      )
      .toBeTruthy();
  }
  await page.setViewportSize({ width: 820, height: 1100 });
  await expect(surface).toHaveAttribute("data-spread", "2");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(surface).toHaveAttribute("data-zoom", "1.5");
  await expect(page.locator(".page-corner")).toHaveCount(0);
  await expect(page.locator(".pdf-page canvas[aria-busy=true]")).toHaveCount(0);
  expect(
    await page
      .locator(".pdf-page canvas")
      .evaluateAll((nodes) =>
        nodes.every(
          (n) =>
            (n as HTMLCanvasElement).width * (n as HTMLCanvasElement).height <=
            5_001_000,
        ),
      ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Fit magazine pages", exact: true })
    .click();
  const canvas = page.locator(".pdf-page canvas").first();
  const b = (await canvas.boundingBox())!;
  if (browserName === "chromium")
    await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2);
  else {
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
    await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
  }
  await expect(surface).toHaveAttribute("data-zoom", "2");
  await page
    .getByRole("button", { name: "Fit magazine pages", exact: true })
    .click();
  if (browserName === "chromium") {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 2,
    });
    const bounds = (await canvas.boundingBox())!;
    const x = bounds.x + bounds.width / 2,
      y = bounds.y + bounds.height / 2;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: x - 35, y, id: 1 },
        { x: x + 35, y, id: 2 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: x - 70, y, id: 1 },
        { x: x + 70, y, id: 2 },
      ],
    });
    await expect
      .poll(async () => Number(await surface.getAttribute("data-zoom")))
      .toBeGreaterThan(1.8);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await page
      .getByRole("button", { name: "Fit magazine pages", exact: true })
      .click();
  }
  await page
    .getByRole("button", { name: "Next magazine page", exact: true })
    .click();
  await expect(page.locator(".reader-footer")).toContainText("Page 3–4 of 5");
  await page
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  await edition.click();
  await expect(page.locator(".reader-footer")).toContainText("Page 3–4 of 5");
  await page
    .getByRole("button", { name: "Bookmark page", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".reader-footer")).toContainText("Page 3 of 5");
  await page
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  // Simulate a pre-upgrade record with its original file but no thumbnail.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("folio-magazines", 1);
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction("pdfs", "readwrite"),
            store = tx.objectStore("pdfs");
          const read = store.getAll();
          read.onsuccess = () => {
            const record = read.result.find(
              (m: any) => m.title === "Portrait magazine",
            );
            delete record.cover;
            store.put(record);
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
        request.onerror = () => reject(request.error);
      }),
  );
  await page.reload();
  await edition.click();
  await expect(page.locator(".pdf-page canvas[aria-busy=false]")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<boolean>((resolve, reject) => {
            const request = indexedDB.open("folio-magazines", 1);
            request.onsuccess = () => {
              const db = request.result;
              const read = db.transaction("pdfs").objectStore("pdfs").getAll();
              read.onsuccess = () => {
                resolve(
                  !!read.result.find(
                    (m: any) => m.title === "Portrait magazine",
                  )?.cover,
                );
                db.close();
              };
              read.onerror = () => reject(read.error);
            };
            request.onerror = () => reject(request.error);
          }),
      ),
    )
    .toBeTruthy();
  await page
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Magazines", exact: true }),
  ).toBeVisible();
  await expect(edition.locator("img")).toHaveAttribute("src", /^data:image\//);
  await edition.click();
  await expect(page.locator(".pdf-page canvas[aria-busy=false]")).toBeVisible();
  await expect(page.locator(".reader-footer")).toContainText("Page 3 of 5");
  await page
    .getByRole("button", { name: "Next magazine page", exact: true })
    .click();
  await expect(page.locator(".reader-footer")).toContainText("Page 4 of 5");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("folio.v1.pdf.Portrait magazine"),
    ),
  ).toBe("3");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("fylogia.pdf.progress.Portrait magazine"),
    ),
  ).toBe("4");
  await context.setOffline(false);
  await page
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator("input[type=file]").setInputFiles({
    name: "Mixed orientation.pdf",
    mimeType: "application/pdf",
    buffer: magazineFixture(3, true),
  });
  await page
    .getByRole("button", { name: "Open Mixed orientation", exact: true })
    .click();
  await expect(page.locator(".pdf-page canvas[aria-busy=false]")).toBeVisible();
  const corner = page.getByRole("button", {
    name: "Drag or tap to turn forward",
    exact: true,
  });
  const edge = (await corner.boundingBox())!,
    area = (await surface.boundingBox())!;
  await page.mouse.move(edge.x + 24, edge.y + 22);
  await page.mouse.down();
  await page.mouse.move(edge.x + 24 - area.width * 0.2, edge.y + 12, {
    steps: 8,
  });
  await expect(page.locator(".curl-underlay canvas")).toBeVisible();
  expect(
    await page
      .locator(".curl-underlay canvas")
      .evaluate((n: HTMLCanvasElement) => n.height),
  ).toBeLessThanOrEqual(area.height - 39);
  await page.mouse.up();
  await expect(page.locator(".reader-footer")).toContainText("Page 1 of 3");
});
