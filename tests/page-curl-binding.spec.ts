import { test, expect, type Locator, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { defaults } from "../src/catalog";
import { magazineFixture } from "./pdf-fixture";

async function open(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.addInitScript(
    (prefs) => {
      localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
    },
    { ...defaults, complete: true, reading: "pages" },
  );
  await page.goto("./magazines");
  await page.locator("input[type=file]").setInputFiles({
    name: "Binding regression.pdf",
    mimeType: "application/pdf",
    buffer: magazineFixture(15),
  });
  await page.getByRole("button", { name: /Open Binding regression/ }).click();
  const spreadCount = Number(
    await page.locator(".pdf-spread").getAttribute("data-spread"),
  );
  expect([1, 2]).toContain(spreadCount);
  await expect(
    page.locator(".pdf-spread > .pdf-pages canvas[aria-busy=false]"),
  ).toHaveCount(spreadCount);
  return page.locator(".pdf-spread");
}

async function assertBoundGeometry(spread: Locator) {
  const measurement = await spread.locator(".paper-fold").evaluate((leaf) => {
    const surface = leaf.parentElement!;
    const direction = (leaf as HTMLElement).dataset.direction;
    const pages = [
      ...surface.querySelectorAll<HTMLCanvasElement>(".pdf-page canvas"),
    ];
    const page = direction === "forward" ? pages.at(-1)! : pages[0];
    const pageRect = page.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    const facing = surface.dataset.spread === "2";
    const expectedHinge = facing
      ? surface.clientWidth / 2
      : (direction === "forward" ? pageRect.left : pageRect.right) -
        surfaceRect.left;
    const fold = JSON.parse((leaf as HTMLElement).dataset.crease!);
    return {
      distance: Number((leaf as HTMLElement).dataset.distance),
      hinge: Number((leaf as HTMLElement).dataset.hinge),
      expectedHinge,
      sheetWidth: pageRect.width,
      creaseDrift: Math.abs(fold.ny / fold.nx) * surface.clientHeight,
      overflow: getComputedStyle(leaf).overflow,
    };
  });
  expect(measurement.hinge).toBeCloseTo(measurement.expectedHinge, 0);
  expect(measurement.distance).toBeGreaterThanOrEqual(0);
  expect(measurement.distance).toBeLessThanOrEqual(2);
  expect(measurement.creaseDrift).toBeLessThanOrEqual(
    measurement.sheetWidth * 0.031,
  );
  expect(measurement.overflow).toBe("hidden");
}

async function beginGeometrySampling(page: Page) {
  await page.evaluate(() => {
    const browser = window as any;
    browser.__bindingSamples = [];
    browser.__bindingSampling = true;
    const sample = () => {
      if (!browser.__bindingSampling) return;
      const leaf = document.querySelector<HTMLElement>(".paper-fold");
      if (leaf) {
        const surface = leaf.parentElement!;
        const pages = [
          ...surface.querySelectorAll<HTMLCanvasElement>(".pdf-page canvas"),
        ];
        const direction = leaf.dataset.direction;
        const page = direction === "forward" ? pages.at(-1)! : pages[0];
        const pageRect = page.getBoundingClientRect();
        const surfaceRect = surface.getBoundingClientRect();
        const facing = surface.dataset.spread === "2";
        const expectedHinge = facing
          ? surface.clientWidth / 2
          : (direction === "forward" ? pageRect.left : pageRect.right) -
            surfaceRect.left;
        const crease = JSON.parse(leaf.dataset.crease!);
        browser.__bindingSamples.push({
          distance: Number(leaf.dataset.distance),
          hinge: Number(leaf.dataset.hinge),
          expectedHinge,
          driftRatio:
            (Math.abs(crease.ny / crease.nx) * surface.clientHeight) /
            pageRect.width,
          overflow: getComputedStyle(leaf).overflow,
        });
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}

async function captureFrame(page: Page, info: any, name: string) {
  const path = process.env.FYLOGIA_SCREENSHOTS
    ? `${process.env.FYLOGIA_SCREENSHOTS}/${name}`
    : info.outputPath(name);
  await page.screenshot({ path });
}

async function finishGeometrySampling(page: Page, info: any, name: string) {
  const samples = await page.evaluate(async () => {
    const browser = window as any;
    browser.__bindingSampling = false;
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    return browser.__bindingSamples;
  });
  const geometry = JSON.stringify(samples, null, 2);
  await info.attach(`${name}-binding-frames.json`, {
    body: geometry,
    contentType: "application/json",
  });
  if (process.env.FYLOGIA_SCREENSHOTS)
    await writeFile(
      `${process.env.FYLOGIA_SCREENSHOTS}/${name}-binding-frames.json`,
      geometry,
    );
  expect(
    samples.length,
    "sampled held-drag and settling animation frames",
  ).toBeGreaterThan(20);
  for (const frame of samples) {
    expect(frame.distance).toBeGreaterThanOrEqual(0);
    expect(frame.distance).toBeLessThanOrEqual(2);
    expect(frame.hinge).toBeCloseTo(frame.expectedHinge, 0);
    expect(frame.driftRatio).toBeLessThanOrEqual(0.030001);
    expect(frame.overflow).toBe("hidden");
  }
}

test("slow full-width mouse over-drag keeps the moving sheet bound to the center spine", async ({
  page,
}, info) => {
  const viewport =
    info.project.name === "ipad-webkit"
      ? { width: 1024, height: 768 }
      : info.project.name === "iphone-webkit"
        ? { width: 900, height: 412 }
        : { width: 1180, height: 820 };
  const spread = await open(page, viewport.width, viewport.height);
  const pageSpread = Number(await spread.getAttribute("data-spread"));
  const pageCanvas = (await spread.locator("canvas").last().boundingBox())!;
  const start = {
    x: pageCanvas.x + pageCanvas.width - 10,
    y: pageCanvas.y + pageCanvas.height - 22,
  };
  const leafWidth = pageCanvas.width;
  await beginGeometrySampling(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();

  for (const fraction of [0.25, 0.5, 0.9, 1.4, 1.95, 2.3]) {
    await page.mouse.move(start.x - leafWidth * fraction, start.y, {
      steps: 8,
    });
    // Hold at each drag position so WebKit can paint and sample the live curl
    // instead of coalescing the whole gesture into a handful of RAF callbacks.
    await page.waitForTimeout(120);
    await expect(spread.locator(".paper-fold")).toBeVisible();
    await assertBoundGeometry(spread);
    if ([0.5, 0.9, 1.4, 1.95, 2.3].includes(fraction))
      await captureFrame(
        page,
        info,
        `mid-turn-${info.project.name}-${fraction}.png`,
      );
  }
  await page.mouse.up();
  await expect(page.locator(".reader-footer")).toContainText(
    pageSpread === 2 ? "Page 3–4 of 15" : "Page 2 of 15",
  );
  await expect(page.locator(".paper-fold,.curl-underlay")).toHaveCount(0);
  await finishGeometrySampling(page, info, "forward-mouse");

  const previousPage = (await spread.locator("canvas").first().boundingBox())!;
  const reverseStart = { x: previousPage.x + 10, y: previousPage.y + 22 };
  await beginGeometrySampling(page);
  await page.mouse.move(reverseStart.x, reverseStart.y);
  await page.mouse.down();
  for (const fraction of [0.4, 0.95, 1.8, 2.25]) {
    await page.mouse.move(
      reverseStart.x + previousPage.width * fraction,
      reverseStart.y,
      {
        steps: 8,
      },
    );
    await page.waitForTimeout(120);
    await assertBoundGeometry(spread);
    if ([0.95, 1.8, 2.25].includes(fraction))
      await captureFrame(
        page,
        info,
        `mid-turn-backward-${info.project.name}-${fraction}.png`,
      );
  }
  await page.mouse.up();
  await expect(page.locator(".reader-footer")).toContainText(
    pageSpread === 2 ? "Page 1–2 of 15" : "Page 1 of 15",
  );
  await expect(page.locator(".paper-fold,.curl-underlay")).toHaveCount(0);
  await finishGeometrySampling(page, info, "backward-mouse");
});

test("touch full-width turn follows the finger without allowing hinge shear", async ({
  page,
}, info) => {
  const spread = await open(page, 1024, 768);
  const pageSpread = Number(await spread.getAttribute("data-spread"));
  const canvas = (await spread.locator("canvas").last().boundingBox())!;
  const start = {
    x: canvas.x + canvas.width - 10,
    y: canvas.y + canvas.height - 24,
  };
  const width = canvas.width;
  await beginGeometrySampling(page);

  const touch = async (
    type: "touchstart" | "touchmove" | "touchend",
    x: number,
    y: number,
  ) => {
    await spread.evaluate(
      (surface, input) => {
        const point = {
          identifier: 17,
          target: surface,
          clientX: input.x,
          clientY: input.y,
        };
        const event = new Event(input.type, {
          bubbles: true,
          cancelable: true,
        });
        Object.assign(event, {
          touches: input.type === "touchend" ? [] : [point],
          targetTouches: input.type === "touchend" ? [] : [point],
          changedTouches: [point],
        });
        surface.dispatchEvent(event);
      },
      { type, x, y },
    );
  };

  await touch("touchstart", start.x, start.y);
  for (const fraction of [0.2, 0.45, 0.7, 0.95, 1.25, 1.65, 2.2]) {
    await touch("touchmove", start.x - width * fraction, start.y);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    if (fraction >= 0.45) {
      await expect(spread.locator(".paper-fold")).toBeVisible();
      await assertBoundGeometry(spread);
      if ([0.45, 0.95, 1.65, 2.2].includes(fraction))
        await captureFrame(
          page,
          info,
          `mid-turn-touch-${info.project.name}-${fraction}.png`,
        );
    }
  }
  await touch("touchend", start.x - width * 2.2, start.y);
  await expect(page.locator(".reader-footer")).toContainText(
    pageSpread === 2 ? "Page 3–4 of 15" : "Page 2 of 15",
  );
  await expect(page.locator(".paper-fold,.curl-underlay")).toHaveCount(0);
  await finishGeometrySampling(page, info, "forward-touch");
});
