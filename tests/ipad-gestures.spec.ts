import { test, expect, type Page } from "@playwright/test";
import { defaults } from "../src/catalog";
import { magazineFixture } from "./pdf-fixture";
async function ready(page: Page, kind: "article" | "pdf") {
  await page.setViewportSize({ width: 1024, height: 900 });
  const edition = await (await page.request.get("data/edition.json")).json();
  const article = edition.articles
    .filter(
      (a: any) =>
        a.full &&
        a.content.length > 6000 &&
        !/<(?:img|figure)\b/i.test(a.content),
    )
    .sort((a: any, b: any) => b.content.length - a.content.length)[0];
  article.image = undefined;
  await page.addInitScript(
    ({ prefs, article }) => {
      localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
      localStorage.setItem("folio.v1.saved", JSON.stringify([article]));
    },
    { prefs: { ...defaults, complete: true, fontSize: 24 }, article },
  );
  await page.goto(kind === "article" ? "./saved" : "./magazines");
  if (kind === "article") await page.locator(".story-open").click();
  else {
    await page.locator("input[type=file]").setInputFiles({
      name: "iPad gestures.pdf",
      mimeType: "application/pdf",
      buffer: magazineFixture(15),
    });
    await page
      .getByRole("button", { name: "Open iPad gestures", exact: true })
      .click();
    await expect(page.locator(".pdf-page canvas[aria-busy=false]")).toHaveCount(
      2,
    );
  }
  await page.evaluate(() => document.fonts.ready);
  return page.locator(kind === "article" ? ".reader-viewport" : ".pdf-spread");
}
async function touchSwipe(
  page: Page,
  selector: string,
  dx: number,
  dy = 0,
  paired = false,
) {
  // Let pending orientation/offline/zoom layout settle before starting a new
  // finger contact. Real input moves arrive across frames, not in one JS task.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.evaluate(
    async ({ selector, dx, dy, paired }) => {
      const element = document.querySelector(selector)!;
      const r = element.getBoundingClientRect();
      const x = r.left + r.width * 0.65,
        y = r.top + r.height * 0.45;
      const target = document.elementFromPoint(x, y)!;
      const touch = (id: number, x: number, y: number) => ({
        identifier: id,
        target,
        clientX: x,
        clientY: y,
        pageX: x,
        pageY: y,
        screenX: x,
        screenY: y,
      });
      // WebKit does not expose a constructible Touch. Exercise the native
      // listener contract with DOM events and explicit TouchList-shaped data.
      const fire = (type: string, values: Touch[], changed: Touch[]) => {
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.assign(event, {
          touches: values,
          targetTouches: values,
          changedTouches: changed,
        });
        return target.dispatchEvent(event);
      };
      if (paired)
        target.dispatchEvent(
          new PointerEvent("pointerdown", {
            bubbles: true,
            pointerId: 7,
            pointerType: "touch",
            isPrimary: true,
            button: 0,
            clientX: x,
            clientY: y,
          }),
        );
      fire("touchstart", [touch(7, x, y)], [touch(7, x, y)]);
      for (let i = 1; i <= 5; i++) {
        const t = touch(7, x + (dx * i) / 5, y + (dy * i) / 5);
        if (paired)
          target.dispatchEvent(
            new PointerEvent("pointermove", {
              bubbles: true,
              cancelable: true,
              pointerId: 7,
              pointerType: "touch",
              isPrimary: true,
              button: 0,
              clientX: t.clientX,
              clientY: t.clientY,
            }),
          );
        fire("touchmove", [t], [t]);
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      }
      // Safari may cancel the pointer stream while native TouchEvents continue.
      if (paired)
        target.dispatchEvent(
          new PointerEvent("pointercancel", {
            bubbles: true,
            pointerId: 7,
            pointerType: "touch",
            isPrimary: true,
          }),
        );
      fire("touchend", [], [touch(7, x + dx, y + dy)]);
      if (paired)
        target.dispatchEvent(
          new PointerEvent("pointerup", {
            bubbles: true,
            pointerId: 7,
            pointerType: "touch",
            isPrimary: true,
            button: 0,
            clientX: x + dx,
            clientY: y + dy,
          }),
        );
    },
    { selector, dx, dy, paired },
  );
}
for (const kind of ["article", "pdf"] as const) {
  test(`${kind}: short tablet swipe turns once with native touch plus pointer cancellation`, async ({
    page,
  }) => {
    await ready(page, kind);
    const status = page.locator(".reader-footer [role=status]");
    const initial = (await status.textContent())!;
    if (page.context().browser()?.browserType().name() === "chromium") {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setTouchEmulationEnabled", {
        enabled: true,
        maxTouchPoints: 2,
      });
      const rect = await page
        .locator(kind === "article" ? ".reader-viewport" : ".pdf-spread")
        .boundingBox();
      const x = rect!.x + rect!.width * 0.65,
        y = rect!.y + rect!.height * 0.45;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y, id: 1 }],
      });
      for (let i = 1; i <= 5; i++)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: x - (75 * i) / 5, y, id: 1 }],
        });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await expect(status).not.toHaveText(initial);
      await expect(page.locator(".paper-fold")).toHaveCount(0);
      await page
        .getByRole("button", {
          name: kind === "article" ? "Previous page" : "Previous magazine page",
          exact: true,
        })
        .click();
      await expect(status).toHaveText(initial);
      await expect(page.locator(".paper-fold")).toHaveCount(0);
      await cdp.detach();
    }
    await touchSwipe(
      page,
      kind === "article" ? ".reader-viewport" : ".pdf-spread",
      -75,
      0,
      true,
    );
    await expect(status).not.toHaveText(initial);
    await expect(page.locator(".paper-fold")).toHaveCount(0);
    const after = await status.textContent();
    await page.waitForTimeout(150);
    expect(await status.textContent()).toBe(after);
    await touchSwipe(
      page,
      kind === "article" ? ".reader-viewport" : ".pdf-spread",
      75,
    );
    await expect(status).toHaveText(initial);
  });
  test(`${kind}: vertical touch, cancellation and two fingers never change pages`, async ({
    page,
  }) => {
    await ready(page, kind);
    const selector = kind === "article" ? ".reader-viewport" : ".pdf-spread";
    const status = page.locator(".reader-footer [role=status]");
    const initial = (await status.textContent())!;
    await touchSwipe(page, selector, 12, 100);
    await expect(status).toHaveText(initial);
    await page.evaluate((selector) => {
      const target = document.querySelector(selector)!;
      const r = target.getBoundingClientRect();
      const t = (id: number, x: number) => ({
        identifier: id,
        target,
        clientX: x,
        clientY: r.top + 100,
      });
      const a = t(1, r.left + 150),
        b = t(2, r.left + 250);
      for (const [type, touches, changed] of [
        ["touchstart", [a], [a]],
        ["touchstart", [a, b], [b]],
        ["touchend", [a], [b]],
        ["touchcancel", [], [a]],
      ] as [string, Touch[], Touch[]][]) {
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.assign(event, {
          touches,
          targetTouches: touches,
          changedTouches: changed,
        });
        target.dispatchEvent(event);
      }
    }, selector);
    await expect(status).toHaveText(initial);
    await touchSwipe(page, selector, -75);
    await expect(status).not.toHaveText(initial);
  });
}
for (const kind of ["article", "pdf"] as const) {
  test(`${kind}: native corner drag bends, cancels and completes; edge taps work after rotation`, async ({
    page,
  }) => {
    const surface = await ready(page, kind);
    const status = page.locator(".reader-footer [role=status]");
    const initial = (await status.textContent())!;
    const corner = page.getByRole("button", {
      name: "Drag or tap to turn forward",
      exact: true,
    });
    async function cornerInput(phase: "start" | "move" | "end", distance = 0) {
      await corner.evaluate(
        (button, { phase, distance }) => {
          const r = button.getBoundingClientRect();
          const t = {
            identifier: 88,
            target: button,
            clientX: r.left + 20 - distance,
            clientY: r.top + 20,
          };
          const event = new Event("touch" + phase, {
            bubbles: true,
            cancelable: true,
          });
          Object.assign(event, {
            touches: phase === "end" ? [] : [t],
            targetTouches: phase === "end" ? [] : [t],
            changedTouches: [t],
          });
          button.dispatchEvent(event);
        },
        { phase, distance },
      );
    }
    await cornerInput("start");
    await cornerInput("move", 18);
    await expect(page.locator(".paper-fold")).toBeVisible();
    await expect(page.locator(".paper-band")).toHaveCount(12);
    await cornerInput("end", 18);
    await expect(page.locator(".paper-fold")).toHaveCount(0);
    await expect(status).toHaveText(initial);
    const width = (await surface.boundingBox())!.width;
    await cornerInput("start");
    await cornerInput("move", width * 0.65);
    await expect(page.locator(".paper-fold")).toBeVisible();
    await cornerInput("end", width * 0.65);
    await expect(status).not.toHaveText(initial);
    await expect(page.locator(".paper-fold")).toHaveCount(0);
    for (const viewport of [
      { width: 768, height: 1024 },
      { width: 1180, height: 820 },
    ]) {
      await page.setViewportSize(viewport);
      if (kind === "pdf")
        await expect(
          page.locator(".pdf-page canvas[aria-busy=true]"),
        ).toHaveCount(0);
      await expect(page.locator(".paper-fold")).toHaveCount(0);
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      const before = (await status.textContent())!;
      await page.evaluate((kind) => {
        const area = document.querySelector(
          kind === "article"
            ? ".reader-viewport"
            : ".pdf-page:last-child canvas",
        )!;
        const r = area.getBoundingClientRect();
        const target = document.elementFromPoint(
          r.right - 20,
          r.top + r.height * 0.45,
        )!;
        const t = {
          identifier: 99,
          target,
          clientX: r.right - 20,
          clientY: r.top + r.height * 0.45,
        };
        for (const type of ["touchstart", "touchend"]) {
          const event = new Event(type, { bubbles: true, cancelable: true });
          Object.assign(event, {
            touches: type === "touchend" ? [] : [t],
            targetTouches: type === "touchend" ? [] : [t],
            changedTouches: [t],
          });
          target.dispatchEvent(event);
        }
      }, kind);
      await expect(status).not.toHaveText(before);
      await expect(page.locator(".paper-fold")).toHaveCount(0);
    }
  });
  test(`${kind}: rapid native swipes queue one turn and offline navigation retains progress`, async ({
    page,
    context,
  }) => {
    await ready(page, kind);
    const selector = kind === "article" ? ".reader-viewport" : ".pdf-spread";
    const status = page.locator(".reader-footer [role=status]");
    const first = Number(
      (await status.innerText()).match(/(?:Page|Spread) (\d+)/)![1],
    );
    const step =
      kind === "pdf"
        ? Number(await page.locator(selector).getAttribute("data-spread"))
        : 1;
    await touchSwipe(page, selector, -75);
    await touchSwipe(page, selector, -75);
    await expect
      .poll(async () =>
        Number((await status.innerText()).match(/(?:Page|Spread) (\d+)/)![1]),
      )
      .toBe(first + 2 * step);
    await expect(page.locator(".paper-fold")).toHaveCount(0);
    if (kind === "pdf")
      await page
        .getByRole("button", { name: "Bookmark page", exact: true })
        .click();
    await context.setOffline(true);
    const before = (await status.textContent())!;
    await touchSwipe(page, selector, -75);
    await expect(status).not.toHaveText(before);
    await expect(page.locator(".paper-fold")).toHaveCount(0);
    if (kind === "pdf")
      await expect(
        page.getByRole("button", { name: "Bookmark page", exact: true }),
      ).toHaveAttribute("aria-pressed", "false");
    const progress = await page.evaluate(
      (kind) =>
        kind === "article"
          ? Object.values(
              JSON.parse(localStorage.getItem("folio.v1.progress") || "{}"),
            )
          : Object.entries(localStorage)
              .filter(([key]) => key.startsWith("fylogia.pdf.progress."))
              .map(([, value]) => Number(value)),
      kind,
    );
    expect(progress.some((value) => Number(value) > 0)).toBeTruthy();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page
      .getByRole("button", { name: "Back to previous section", exact: true })
      .click();
    await page.reload();
    if (kind === "article") await page.locator(".story-open").click();
    else
      await page
        .getByRole("button", { name: "Open iPad gestures", exact: true })
        .click();
    await expect
      .poll(async () =>
        Number(
          (await status.innerText()).match(/(?:Page|Spread) (\d+)/)?.[1] || 0,
        ),
      )
      .toBeGreaterThan(1);
    if (kind === "pdf")
      await expect(
        page.locator(".pdf-page canvas[aria-busy=true]"),
      ).toHaveCount(0);
    const reopened = (await status.textContent())!;
    await touchSwipe(page, selector, 75);
    await expect(status).not.toHaveText(reopened);
    await context.setOffline(false);
  });
}
test("PDF pinch, zoomed panning and first swipe after fit do not conflict", async ({
  page,
}) => {
  await ready(page, "pdf");
  const status = page.locator(".reader-footer [role=status]");
  const initial = (await status.textContent())!;
  await page.evaluate(() => {
    const target = document.querySelector(".pdf-spread")!;
    const r = target.getBoundingClientRect();
    const t = (id: number, x: number) => ({
      identifier: id,
      target,
      clientX: r.left + x,
      clientY: r.top + 200,
    });
    const fire = (type: string, touches: unknown[], changed: unknown[]) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, {
        touches,
        targetTouches: touches,
        changedTouches: changed,
      });
      target.dispatchEvent(event);
    };
    const a = t(1, 200),
      b = t(2, 300),
      c = t(1, 170),
      d = t(2, 330);
    fire("touchstart", [a], [a]);
    fire("touchstart", [a, b], [b]);
    fire("touchmove", [c, d], [c, d]);
    fire("touchend", [], [c, d]);
  });
  await expect(page.locator(".pdf-spread")).toHaveAttribute("data-zoom", "1.6");
  await expect(status).toHaveText(initial);
  await touchSwipe(page, ".pdf-spread", -90);
  await expect(status).toHaveText(initial);
  await page
    .getByRole("button", { name: "Fit magazine pages", exact: true })
    .click();
  await expect(page.locator(".pdf-spread")).toHaveAttribute("data-zoom", "1");
  await touchSwipe(page, ".pdf-spread", -75);
  await expect(status).not.toHaveText(initial);
});
test("linked article text permits swiping without hijacking a normal link click", async ({
  page,
}) => {
  await ready(page, "article");
  await page.evaluate(() => {
    const surface = document.querySelector(".reader-viewport")!;
    const link = document.createElement("a");
    link.textContent = "Gesture regression link";
    link.href = "#publisher-link";
    link.id = "touch-link-contract";
    link.style.cssText =
      "position:absolute;right:20px;top:100px;width:160px;height:44px;z-index:1";
    link.addEventListener("click", (event) => {
      event.preventDefault();
      link.dataset.clicked = "yes";
    });
    surface.append(link);
  });
  const status = page.locator(".reader-footer [role=status]");
  const initial = (await status.textContent())!;
  await page.evaluate(() => {
    const target = document.querySelector("#touch-link-contract")!,
      r = target.getBoundingClientRect();
    const point = (x: number) => ({
      identifier: 90,
      target,
      clientX: x,
      clientY: r.top + 20,
    });
    for (const [type, x] of [
      ["touchstart", r.left + 20],
      ["touchmove", r.left - 70],
      ["touchend", r.left - 70],
    ] as [string, number][]) {
      const t = point(x),
        event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, {
        touches: type === "touchend" ? [] : [t],
        targetTouches: type === "touchend" ? [] : [t],
        changedTouches: [t],
      });
      target.dispatchEvent(event);
    }
  });
  await expect(status).not.toHaveText(initial);
  await expect(page.locator(".paper-fold")).toHaveCount(0);
  const after = (await status.textContent())!;
  await page.locator("#touch-link-contract").click();
  await expect(page.locator("#touch-link-contract")).toHaveAttribute(
    "data-clicked",
    "yes",
  );
  await expect(status).toHaveText(after);
});
for (const kind of ["article", "pdf"] as const) {
  test(`${kind}: pen pointer edge drag follows the same page order`, async ({
    page,
  }) => {
    const surface = await ready(page, kind);
    const status = page.locator(".reader-footer [role=status]");
    const initial = (await status.textContent())!;
    await surface.evaluate((surface) => {
      const canvas = surface.querySelector(".pdf-page:last-child canvas");
      const r = (canvas || surface).getBoundingClientRect();
      const x = r.right - 20,
        y = r.top + r.height * 0.45;
      for (const [type, dx] of [
        ["pointerdown", 0],
        ["pointermove", -r.width * 0.7],
        ["pointerup", -r.width * 0.7],
      ] as [string, number][]) {
        surface.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 66,
            pointerType: "pen",
            isPrimary: true,
            button: 0,
            clientX: x + dx,
            clientY: y,
          }),
        );
      }
    });
    await expect(status).not.toHaveText(initial);
    await expect(page.locator(".paper-fold")).toHaveCount(0);
  });
}
test("PWA visibility interruption releases a held touch without a phantom page turn", async ({
  page,
}) => {
  await ready(page, "article");
  const status = page.locator(".reader-footer [role=status]");
  const initial = (await status.textContent())!;
  await page.evaluate(() => {
    const target = document.querySelector(".reader-viewport")!,
      r = target.getBoundingClientRect();
    const t = {
      identifier: 12,
      target,
      clientX: r.left + 200,
      clientY: r.top + 200,
    };
    for (const [type, touches] of [
      ["touchstart", [t]],
      ["touchstart", [t, { ...t, identifier: 13, clientX: t.clientX + 50 }]],
    ] as [string, unknown[]][]) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, {
        touches,
        targetTouches: touches,
        changedTouches: touches,
      });
      target.dispatchEvent(event);
    }
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    delete (document as any).hidden;
  });
  await expect(status).toHaveText(initial);
  await touchSwipe(page, ".reader-viewport", -75);
  await expect(status).not.toHaveText(initial);
  await expect(page.locator(".paper-fold")).toHaveCount(0);
  const beforeCorner = (await status.textContent())!;
  const corner = page.getByRole("button", {
    name: "Drag or tap to turn forward",
    exact: true,
  });
  await corner.evaluate((button) => {
    const r = button.getBoundingClientRect(),
      t = {
        identifier: 33,
        target: button,
        clientX: r.left + 20,
        clientY: r.top + 20,
      };
    for (const touches of [[t], [t, { ...t, identifier: 34 }]]) {
      const event = new Event("touchstart", {
        bubbles: true,
        cancelable: true,
      });
      Object.assign(event, {
        touches,
        targetTouches: touches,
        changedTouches: touches,
      });
      button.dispatchEvent(event);
    }
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    delete (document as any).hidden;
    for (const type of ["touchstart", "touchend"]) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, {
        touches: type === "touchend" ? [] : [t],
        targetTouches: type === "touchend" ? [] : [t],
        changedTouches: [t],
      });
      button.dispatchEvent(event);
    }
  });
  await expect(status).not.toHaveText(beforeCorner);
});
test("browser-level zoom leaves one-finger panning to the browser and fit restores flipping", async ({
  page,
}) => {
  await ready(page, "article");
  const status = page.locator(".reader-footer [role=status]");
  const initial = (await status.textContent())!;
  await page.evaluate(() => {
    Object.defineProperty(visualViewport!, "scale", {
      configurable: true,
      value: 2,
    });
    visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator(".reader-viewport")).toHaveAttribute(
    "data-browser-zoomed",
    "true",
  );
  await touchSwipe(page, ".reader-viewport", -75);
  await expect(status).toHaveText(initial);
  await page.evaluate(() => {
    delete (visualViewport as any).scale;
    visualViewport!.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator(".reader-viewport")).not.toHaveAttribute(
    "data-browser-zoomed",
    "true",
  );
  await touchSwipe(page, ".reader-viewport", -75);
  await expect(status).not.toHaveText(initial);
});
