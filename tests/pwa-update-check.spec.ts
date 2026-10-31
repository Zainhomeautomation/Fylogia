import { test, expect } from "@playwright/test";
test("worker registration does not race itself with duplicate initial update checks", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const register = ServiceWorkerContainer.prototype.register;
    (window as any).explicitUpdates = 0;
    ServiceWorkerContainer.prototype.register = function (...args) {
      return register.apply(this, args).then((reg) => {
        const update = reg.update.bind(reg);
        reg.update = () => {
          (window as any).explicitUpdates++;
          const result = update();
          (window as any).updateFinished = result.catch(() => {});
          return result;
        };
        return reg;
      });
    };
  });
  await page.goto("./");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBeTruthy();
  expect(await page.evaluate(() => (window as any).explicitUpdates)).toBe(0);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("online"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await page.evaluate(() => (window as any).explicitUpdates)).toBe(0);
  await page.evaluate(() => {
    const original = Date.now;
    Date.now = () => original() + 61000;
    try {
      window.dispatchEvent(new Event("online"));
    } finally {
      Date.now = original;
    }
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).explicitUpdates))
    .toBe(1);
  await page.evaluate(async () => {
    await (window as any).updateFinished;
  });
});
