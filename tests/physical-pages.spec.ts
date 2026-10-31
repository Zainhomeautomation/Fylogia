import { test, expect, type Page } from "@playwright/test";
import { defaults } from "../src/catalog";
import { magazineFixture } from "./pdf-fixture";

async function open(page: Page, width = 1180) {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(
    (prefs) => {
      localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
    },
    { ...defaults, complete: true },
  );
  await page.goto("./magazines");
  await page.locator("input[type=file]").setInputFiles({
    name: "Physical pages.pdf",
    mimeType: "application/pdf",
    buffer: magazineFixture(15),
  });
  await page.getByRole("button", { name: /Open Physical pages/ }).click();
  await expect(
    page.locator(".pdf-spread > .pdf-pages canvas[aria-busy=false]"),
  ).toHaveCount(width >= 780 ? 2 : 1);
  return page.locator(".pdf-spread");
}
async function drag(page: Page, fraction: number) {
  const canvas = await page
    .locator(".pdf-spread > .pdf-pages canvas")
    .last()
    .boundingBox();
  const x = canvas!.x + canvas!.width - 10,
    y = canvas!.y + canvas!.height - 35;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - canvas!.width * fraction, y - 35, { steps: 10 });
  await expect(page.locator(".paper-fold")).toHaveAttribute(
    "data-direction",
    "forward",
  );
  await expect(page.locator(".paper-fold [data-face=back] img")).toHaveCount(7);
  return canvas!;
}

test("actual PDF edge folds about a fixed spine with a readable reverse, then turns backward", async ({
  page,
}) => {
  const surface = await open(page);
  const before = await page
    .locator(".pdf-spread > .pdf-pages canvas")
    .first()
    .boundingBox();
  await drag(page, 0.8);
  const geometry = await page.locator(".paper-fold").evaluate((n) => ({
    hinge: Number((n as HTMLElement).dataset.hinge),
    matrices: [...n.querySelectorAll<HTMLElement>(".paper-band")].map(
      (e) => e.style.transform,
    ),
    clips: [...n.querySelectorAll<HTMLElement>(".paper-band")].map(
      (e) => (e.firstElementChild as HTMLElement).style.clipPath,
    ),
    hidden: n.getAttribute("aria-hidden"),
    inert: (n as HTMLElement).inert,
  }));
  expect(new Set(geometry.matrices).size).toBe(12);
  expect(new Set(geometry.clips).size).toBeGreaterThan(4);
  expect(geometry.hinge).toBeCloseTo(
    (await surface.boundingBox())!.width / 2,
    0,
  );
  expect(geometry.hidden).toBe("true");
  expect(geometry.inert).toBe(true);
  expect(
    await page.locator(".pdf-spread > .pdf-pages canvas").first().boundingBox(),
  ).toEqual(before);
  await expect(page.locator(".reader-footer")).toContainText("Page 1–2 of 15");
  await page.mouse.up();
  await expect(page.locator(".reader-footer")).toContainText("Page 3–4 of 15");
  await expect(page.locator(".paper-fold,.curl-underlay")).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".reader-footer")).toContainText("Page 5–6 of 15");
  await expect(page.locator(".paper-fold")).toHaveCount(0);
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".reader-footer")).toContainText("Page 3–4 of 15");
});

test("partial native-edge drag cancels and resizing releases an unfinished paper layer", async ({
  page,
}) => {
  await open(page);
  await drag(page, 0.15);
  await page.mouse.up();
  await expect(page.locator(".paper-fold,.curl-underlay")).toHaveCount(0);
  await expect(page.locator(".reader-footer")).toContainText("Page 1–2 of 15");
  await drag(page, 0.7);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.mouse.up();
  await expect(page.locator(".paper-fold,.curl-underlay")).toHaveCount(0);
  await expect(page.locator(".pdf-spread")).toHaveAttribute("data-spread", "1");
  await expect(page.locator(".reader-footer")).toContainText("Page 1 of 15");
  await page
    .getByRole("button", { name: "Next magazine page", exact: true })
    .click();
  await expect(page.locator(".reader-footer")).toContainText("Page 2 of 15");
});

test("single physical edge tap, offline turns and reduced motion retain native PDF progress", async ({
  page,
  context,
}) => {
  await open(page, 390);
  const canvas = (await page
    .locator(".pdf-spread > .pdf-pages canvas")
    .boundingBox())!;
  await page.mouse.click(
    canvas.x + canvas.width - 10,
    canvas.y + canvas.height / 2,
  );
  await expect(page.locator(".reader-footer")).toContainText("Page 2 of 15");
  await expect(page.locator(".paper-fold")).toHaveCount(0);
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Next magazine page", exact: true })
    .click();
  await expect(page.locator(".reader-footer")).toContainText("Page 3 of 15");
  await expect(page.locator(".paper-fold")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".reader-footer")).toContainText("Page 2 of 15");
  await expect(page.locator(".paper-fold")).toHaveCount(0);
  await page.getByRole("button", { name: "Back to previous section" }).click();
  await page.getByRole("button", { name: /Open Physical pages/ }).click();
  await expect(page.locator(".reader-footer")).toContainText("Page 2 of 15");
  await context.setOffline(false);
});

test("interruptions cancel native drags and release every temporary PDF image", async ({
  page,
}) => {
  const surface = await open(page);
  await page.evaluate(() => {
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    const active = new Set<string>();
    (window as any).paperImages = active;
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      if (blob instanceof Blob && blob.type === "image/png") active.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      active.delete(url);
      revoke(url);
    };
  });
  await drag(page, 0.7);
  expect(await page.evaluate(() => (window as any).paperImages.size)).toBe(2);
  await surface.dispatchEvent("pointerdown", {
    pointerId: 4,
    pointerType: "touch",
    isPrimary: false,
    button: 0,
  });
  await page.mouse.up();
  await surface.dispatchEvent("pointercancel", { pointerId: 4 });
  await expect(page.locator(".paper-fold,.curl-underlay")).toHaveCount(0);
  await expect(page.locator(".reader-footer")).toContainText("Page 1–2 of 15");
  await expect
    .poll(() => page.evaluate(() => (window as any).paperImages.size))
    .toBe(0);
  await drag(page, 0.7);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.up();
  await expect(page.locator(".paper-fold,.curl-underlay")).toHaveCount(0);
  await expect(page.locator(".reader-footer")).toContainText("Page 1–2 of 15");
  await expect
    .poll(() => page.evaluate(() => (window as any).paperImages.size))
    .toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await drag(page, 0.7);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator(".reader")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => (window as any).paperImages.size))
    .toBe(0);
});

test("a second pointer or motion change cancels a held corner without a late page advance", async ({
  page,
}) => {
  await open(page);
  const corner = page.getByRole("button", {
    name: "Drag or tap to turn forward",
    exact: true,
  });
  const box = (await corner.boundingBox())!;
  const width = (await page
    .locator(".pdf-spread > .pdf-pages canvas")
    .last()
    .boundingBox())!.width;
  const hold = async () => {
    await page.mouse.move(box.x + 24, box.y + 24);
    await page.mouse.down();
    await page.mouse.move(box.x + 24 - width * 0.7, box.y, { steps: 8 });
    await expect(page.locator(".paper-fold")).toHaveCount(1);
  };
  await hold();
  await page.locator(".pdf-spread").dispatchEvent("pointerdown", {
    pointerId: 4,
    pointerType: "touch",
    isPrimary: false,
    button: 0,
  });
  await expect(page.locator(".paper-fold")).toHaveCount(0);
  await page.mouse.up();
  await page
    .locator(".pdf-spread")
    .dispatchEvent("pointercancel", { pointerId: 4 });
  await expect(page.locator(".reader-footer")).toContainText("Page 1–2 of 15");
  await hold();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".paper-fold")).toHaveCount(0);
  await page.mouse.up();
  await expect(page.locator(".reader-footer")).toContainText("Page 1–2 of 15");
});

test("queued turns cannot escape the last original PDF page", async ({
  page,
}) => {
  const surface = await open(page);
  const footer = page.locator(".reader-footer");
  for (let n = 3; n <= 13; n += 2) {
    await page
      .getByRole("button", { name: "Next magazine page", exact: true })
      .click();
    await expect(footer).toContainText(`Page ${n}–${n + 1} of 15`);
    await expect(page.locator(".pdf-spread[data-page-turn]")).toHaveCount(0);
  }
  const next = page.getByRole("button", {
    name: "Next magazine page",
    exact: true,
  });
  await next.click();
  await next.click();
  await expect(page.locator(".pdf-spread[data-page-turn]")).toHaveCount(0);
  await expect(footer).toContainText("Page 15 of 15");
  await expect(next).toBeDisabled();
  await expect(
    surface.locator(":scope > .pdf-pages canvas[aria-busy=false]"),
  ).toHaveCount(1);
});

test("reduced motion keeps completed and cancelled corner drags functional without paper layers", async ({
  page,
}) => {
  await open(page, 390);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const gesture = async (forward: boolean, fraction: number) => {
    const b = (await page
      .getByRole("button", {
        name: forward
          ? "Drag or tap to turn forward"
          : "Drag or tap to turn backward",
        exact: true,
      })
      .boundingBox())!;
    const width = (await page
      .locator(".pdf-spread > .pdf-pages canvas")
      .boundingBox())!.width;
    await page.mouse.move(b.x + 24, b.y + 24);
    await page.mouse.down();
    await page.mouse.move(
      b.x + 24 + width * fraction * (forward ? -1 : 1),
      b.y,
      { steps: 8 },
    );
    await expect(page.locator(".paper-fold,.curl-underlay")).toHaveCount(0);
    await page.mouse.up();
  };
  await gesture(true, 0.7);
  await expect(page.locator(".reader-footer")).toContainText("Page 2 of 15");
  await gesture(true, 0.15);
  await expect(page.locator(".reader-footer")).toContainText("Page 2 of 15");
  await gesture(false, 0.7);
  await expect(page.locator(".reader-footer")).toContainText("Page 1 of 15");
});
