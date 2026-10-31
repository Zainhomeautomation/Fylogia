import { test, expect } from "@playwright/test";
import { defaults } from "../src/catalog";
import { magazineFixture } from "./pdf-fixture";
test("installed-shell update is explicit, hidden in a reader and preserves the private library", async ({
  page,
}) => {
  await page.addInitScript(
    (p) => localStorage.setItem("folio.v1.preferences", JSON.stringify(p)),
    { ...defaults, complete: true, theme: "dark", topics: ["iPhone"] },
  );
  await page.goto("./magazines");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBeTruthy();
  // Reload once under the installed shell so this is an update, not installation.
  await page.reload();
  await page.locator("input[type=file]").setInputFiles({
    name: "Update preservation.pdf",
    mimeType: "application/pdf",
    buffer: magazineFixture(8),
  });
  await page
    .getByRole("button", { name: "Open Update preservation", exact: true })
    .click();
  await expect(
    page.locator(".pdf-page canvas[aria-busy=false]").first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Next magazine page", exact: true })
    .click();
  await expect(page.locator(".paper-fold")).toHaveCount(0);
  const position = await page
    .locator(".reader-footer [role=status]")
    .innerText();
  await page.evaluate(() =>
    navigator.serviceWorker.dispatchEvent(new Event("controllerchange")),
  );
  await expect(
    page.getByRole("complementary", { name: "Application update" }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("complementary", { name: "Application update" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Update Fylogia", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Open Update preservation", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("folio.v1.preferences")!).theme,
    ),
  ).toBe("dark");
  await page
    .getByRole("button", { name: "Open Update preservation", exact: true })
    .click();
  await expect(page.locator(".reader-footer [role=status]")).toHaveText(
    position,
  );
});

test("accepting a PWA update waits for PDF imports and offline image downloads", async ({
  page,
}) => {
  const edition = await (await page.request.get("data/edition.json")).json();
  const article = edition.articles.find(
    (a: any) =>
      a.sourceId === "nasa" && a.full && a.image && a.offlineImagesAllowed,
  );
  expect(article).toBeTruthy();
  await page.addInitScript(
    ({ prefs, article }) => {
      if (!localStorage.getItem("folio.v1.preferences")) {
        localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
        localStorage.setItem("folio.v1.saved", JSON.stringify([article]));
      }
      const read = File.prototype.arrayBuffer;
      File.prototype.arrayBuffer = function () {
        if (this.name === "Pending import.pdf")
          return new Promise<ArrayBuffer>((resolve, reject) => {
            (window as any).releasePdf = () =>
              read.call(this).then(resolve, reject);
          });
        return read.call(this);
      };
      const originalFetch = window.fetch;
      window.fetch = (input, init) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        if (url === article.image)
          return new Promise<Response>((resolve) => {
            (window as any).releaseDownload = () =>
              resolve(
                new Response(
                  Uint8Array.from(
                    atob(
                      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6nrAAAAAASUVORK5CYII=",
                    ),
                    (c) => c.charCodeAt(0),
                  ),
                  { headers: { "Content-Type": "image/png" } },
                ),
              );
          });
        return originalFetch(input, init);
      };
    },
    {
      prefs: { ...defaults, complete: true },
      article: {
        ...article,
        content: "<p>Original pending-download regression fixture.</p>",
      },
    },
  );
  await page.goto("./magazines");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBeTruthy();
  await page.reload();
  await page.locator("input[type=file]").setInputFiles({
    name: "Pending import.pdf",
    mimeType: "application/pdf",
    buffer: magazineFixture(8),
  });
  await expect
    .poll(() =>
      page.evaluate(() => typeof (window as any).releasePdf === "function"),
    )
    .toBeTruthy();
  await page.evaluate(() =>
    navigator.serviceWorker.dispatchEvent(new Event("controllerchange")),
  );
  await page
    .getByRole("button", { name: "Update Fylogia", exact: true })
    .click();
  await expect(
    page.getByText("Wait for your library to finish saving, then try again."),
  ).toBeVisible();
  await page.evaluate(() => (window as any).releasePdf());
  await expect(
    page.getByRole("button", { name: "Open Pending import", exact: true }),
  ).toBeVisible();
  const nav = async (name: string) => {
    const menu = page.getByRole("button", {
      name: "Open navigation",
      exact: true,
    });
    if (await menu.isVisible()) await menu.click();
    await page
      .getByRole("navigation", { name: "Main navigation", exact: true })
      .getByRole("button", { name, exact: true })
      .click();
  };
  await nav("Saved Articles");
  await page
    .getByRole("button", {
      name: "Download offline " + article.title,
      exact: true,
    })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () => typeof (window as any).releaseDownload === "function",
      ),
    )
    .toBeTruthy();
  await page
    .getByRole("button", { name: "Update Fylogia", exact: true })
    .click();
  await expect(
    page.getByText("Wait for your library to finish saving, then try again."),
  ).toBeVisible();
  await page.evaluate(() => (window as any).releaseDownload());
  await expect(page.locator(".download-notice")).toContainText(
    "1 article downloaded.",
  );
  await page
    .getByRole("button", { name: "Update Fylogia", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Update Fylogia", exact: true }),
  ).toHaveCount(0);
  await nav("Offline Library");
  await expect(page.locator(".offline-row")).toHaveCount(1);
  await nav("Magazines");
  await expect(
    page.getByRole("button", { name: "Open Pending import", exact: true }),
  ).toBeVisible();
});
