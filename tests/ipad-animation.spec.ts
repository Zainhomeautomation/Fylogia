import { test, expect, type Page, type CDPSession } from "@playwright/test";
import { defaults } from "../src/catalog";
import { magazineFixture } from "./pdf-fixture";

const trusted = new WeakMap<Page, CDPSession>();

async function open(page: Page, kind: "article" | "pdf", landscape: boolean) {
  await page.setViewportSize(
    landscape ? { width: 1180, height: 820 } : { width: 820, height: 1180 },
  );
  if (page.context().browser()?.browserType().name() === "chromium") {
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 2,
    });
    trusted.set(page, session);
  }
  const edition = await (await page.request.get("data/edition.json")).json();
  const sample = edition.articles.find((a: any) => a.full);
  const article = {
    ...sample,
    id: "animation-regression-fixture",
    title: "Original reader animation test fixture",
    content: Array.from(
      { length: 55 },
      (_, i) =>
        `<p>Paragraph ${i + 1}. This original test document checks readable paper surfaces, preserved page order and reliable navigation. A reader can turn the sheet in either direction without losing the text or moving the reading controls.</p>`,
    ).join(""),
    full: true,
    image: undefined,
  };
  await page.addInitScript(
    ({ prefs, article, standalone }) => {
      localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
      localStorage.setItem("folio.v1.saved", JSON.stringify([article]));
      // Only tests the application with the standalone flag, not a real iOS PWA.
      if (standalone)
        Object.defineProperty(navigator, "standalone", { value: true });
    },
    {
      prefs: { ...defaults, complete: true, reading: "pages", fontSize: 22 },
      article,
      standalone: landscape,
    },
  );
  await page.goto(kind === "article" ? "./saved" : "./magazines");
  if (kind === "article") await page.locator(".story-open").click();
  else {
    await page.locator("input[type=file]").setInputFiles({
      name: "Animation fixture.pdf",
      mimeType: "application/pdf",
      buffer: magazineFixture(15),
    });
    await page
      .getByRole("button", { name: "Open Animation fixture", exact: true })
      .click();
    await expect(
      page.locator(".pdf-page canvas[aria-busy=false]").first(),
    ).toBeVisible();
  }
  const guide = page.getByRole("button", { name: "Got it", exact: true });
  if (await guide.isVisible()) await guide.click();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );
  });
  return kind === "article" ? ".reader-viewport" : ".pdf-spread";
}

async function contact(
  page: Page,
  selector: string,
  phase: string,
  dx = 0,
  dy = 0,
) {
  const session = trusted.get(page);
  if (session) {
    const r = (await page.locator(selector).boundingBox())!;
    await session.send("Input.dispatchTouchEvent", {
      type: (
        {
          touchstart: "touchStart",
          touchmove: "touchMove",
          touchend: "touchEnd",
          touchcancel: "touchCancel",
        } as const
      )[phase as "touchstart"],
      touchPoints:
        phase === "touchend" || phase === "touchcancel"
          ? []
          : [
              {
                x: r.x + r.width * 0.55 + dx,
                y: r.y + r.height * 0.5 + dy,
                id: 19,
              },
            ],
    });
    return;
  }
  await page.locator(selector).evaluate(
    (surface, { phase, dx, dy }) => {
      const rect = surface.getBoundingClientRect();
      const target = surface; // Stable listener target, including during PDF canvas replacement.
      const t = {
        identifier: 19,
        target,
        clientX: rect.left + rect.width * 0.55 + dx,
        clientY: rect.top + rect.height * 0.5 + dy,
      };
      const event = new Event(phase, { bubbles: true, cancelable: true });
      Object.assign(event, {
        touches: phase === "touchend" || phase === "touchcancel" ? [] : [t],
        changedTouches: [t],
        targetTouches: [t],
      });
      surface.dispatchEvent(event);
    },
    { phase, dx, dy },
  );
}
for (const kind of ["article", "pdf"] as const)
  for (const landscape of [false, true]) {
    test(`${kind}: visible horizontal and vertical paper animation in ${landscape ? "landscape simulated standalone" : "portrait browser"}`, async ({
      page,
      context,
    }, info) => {
      const selector = await open(page, kind, landscape),
        surface = page.locator(selector),
        status = page.locator(".reader-footer [role=status]");
      const initial = await status.innerText();
      for (const axis of ["horizontal", "vertical"] as const) {
        for (const forward of [true, false]) {
          const before = await surface.screenshot();
          const start = await status.innerText();
          const delta = forward ? -115 : 115;
          await contact(page, selector, "touchstart");
          for (let i = 1; i <= 5; i++) {
            await contact(
              page,
              selector,
              "touchmove",
              axis === "horizontal" ? (delta * i) / 5 : 0,
              axis === "vertical" ? (delta * i) / 5 : 0,
            );
            await page.evaluate(
              () => new Promise<void>((r) => requestAnimationFrame(() => r())),
            );
          }
          const fold = page.locator(".paper-fold");
          await expect(fold).toHaveAttribute("data-axis", axis);
          await expect(fold).toHaveAttribute(
            "data-direction",
            forward ? "forward" : "backward",
          );
          await expect(surface).toHaveAttribute("data-page-turn", "folding");
          await expect(status).toHaveText(start); // Pixels must move before the page number changes.
          const geometry = await fold.evaluate((n) =>
            [...n.querySelectorAll<HTMLElement>(".paper-band")].map((e) => ({
              matrix: getComputedStyle(e).transform,
              clip: getComputedStyle(e.firstElementChild!).clipPath,
              visible: getComputedStyle(e).visibility,
            })),
          );
          expect(new Set(geometry.map((g) => g.matrix)).size).toBe(12);
          expect(
            geometry.filter((g) => g.visible === "visible").length,
          ).toBeGreaterThan(1);
          expect(
            geometry.every((g) => g.clip.startsWith("polygon(")),
          ).toBeTruthy();
          const during = await surface.screenshot({
            path: info.outputPath(
              `${kind}-${landscape ? "landscape" : "portrait"}-${axis}-${forward ? "forward" : "backward"}.png`,
            ),
          });
          const pigment = await page.evaluate(
            async ({ before, during, kind }) => {
              const measure = async (src: string) => {
                const image = new Image();
                image.src = "data:image/png;base64," + src;
                await image.decode();
                const c = document.createElement("canvas");
                c.width = image.width;
                c.height = image.height;
                const ctx = c.getContext("2d")!;
                ctx.drawImage(image, 0, 0);
                const pixels = ctx.getImageData(0, 0, c.width, c.height).data;
                let ink = 0;
                for (
                  let y = Math.floor(c.height * 0.1);
                  y < c.height * 0.9;
                  y++
                )
                  for (
                    let x = Math.floor(c.width * 0.1);
                    x < c.width * 0.9;
                    x++
                  ) {
                    const i = (y * c.width + x) * 4,
                      r = pixels[i],
                      g = pixels[i + 1],
                      b = pixels[i + 2];
                    if (
                      kind === "article"
                        ? r > 150 && g > 140 && b > 100
                        : g - r > 8 && g - b > 8
                    )
                      ink++;
                  }
                return ink;
              };
              return {
                before: await measure(before),
                during: await measure(during),
              };
            },
            {
              before: before.toString("base64"),
              during: during.toString("base64"),
              kind,
            },
          );
          expect(pigment.before).toBeGreaterThan(20);
          expect(
            pigment.during,
            "printed content remains visible while the page bends",
          ).toBeGreaterThan(pigment.before * 0.4);
          expect(
            before.equals(during),
            "visible pixels change during a held paper fold",
          ).toBe(false);
          if (axis === "vertical" && forward)
            await info.attach(
              `${kind}-${landscape ? "landscape" : "portrait"}-vertical-fold`,
              { body: during, contentType: "image/png" },
            );
          const distance = Number(await fold.getAttribute("data-distance"));
          await contact(
            page,
            selector,
            "touchend",
            axis === "horizontal" ? delta : 0,
            axis === "vertical" ? delta : 0,
          );
          const frames = await page.evaluate(async () => {
            const values: number[] = [];
            const intervals: number[] = [];
            let previous = performance.now();
            const start = previous;
            await new Promise<void>((resolve) => {
              const sample = (now: number) => {
                const leaf = document.querySelector<HTMLElement>(".paper-fold");
                if (!leaf || now - start > 2000) {
                  resolve();
                  return;
                }
                values.push(Number(leaf.dataset.distance));
                intervals.push(now - previous);
                previous = now;
                requestAnimationFrame(sample);
              };
              requestAnimationFrame(sample);
            });
            return { values, intervals };
          });
          expect(Math.max(...frames.values)).toBeGreaterThan(distance);
          expect(
            new Set(frames.values.map((n) => n.toFixed(3))).size,
            "multiple rendered animation frames, not an immediate page switch",
          ).toBeGreaterThan(3);
          await info.attach(
            `${kind}-${axis}-${forward ? "next" : "previous"}-frames`,
            { body: JSON.stringify(frames), contentType: "application/json" },
          );

          await expect(status).not.toHaveText(start);
          await expect(fold).toHaveCount(0);
        }
        await expect(status).toHaveText(initial);
      }
      // Partial vertical contact cancels, instead of silently completing a page.
      await contact(page, selector, "touchstart");
      await contact(page, selector, "touchmove", 0, -25);
      await expect(page.locator(".paper-fold")).toBeVisible();
      await contact(page, selector, "touchcancel", 0, -25);
      await expect(page.locator(".paper-fold")).toHaveCount(0);
      await expect(status).toHaveText(initial);
      await context.setOffline(true);
      await contact(page, selector, "touchstart");
      await contact(page, selector, "touchmove", 0, -110);
      await expect(page.locator(".paper-fold")).toHaveAttribute(
        "data-axis",
        "vertical",
      );
      await contact(page, selector, "touchend", 0, -110);
      await expect(status).not.toHaveText(initial);
      await expect(page.locator(".paper-fold")).toHaveCount(0);
      const progressed = await status.innerText();
      await page.keyboard.press("Escape");
      if (kind === "article") await page.locator(".story-open").click();
      else
        await page
          .getByRole("button", { name: "Open Animation fixture", exact: true })
          .click();
      await expect(status).toHaveText(progressed);
    });
  }

test("reduced motion explains intentional animation suppression while navigation remains functional", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "pdf", false);
  await expect(
    page.getByText("Reduced motion is on · Page animation is off"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Next magazine page", exact: true })
    .click();
  await expect(page.locator(".reader-footer")).toContainText("Page 3");
  await expect(page.locator(".paper-fold")).toHaveCount(0);
});
