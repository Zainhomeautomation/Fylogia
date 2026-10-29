import { test, expect, type BrowserContext, type Page } from "@playwright/test";
test.use({ trace: "off" });
import { defaults } from "../src/catalog";
test("private sync UI pairs two independent devices, queues offline edits, preserves local bodies, and revokes access", async ({
  browser,
  baseURL,
  viewport,
  isMobile,
  hasTouch,
  userAgent,
  deviceScaleFactor,
}) => {
  test.skip(
    process.env.FYLOGIA_PAGES_RUNTIME === "0",
    "Needs actual private Pages backend",
  );
  test.setTimeout(180000);
  const options = {
    viewport,
    isMobile,
    hasTouch,
    userAgent,
    deviceScaleFactor,
  };
  const a = await browser.newContext(options),
    b = await browser.newContext(options),
    other = await browser.newContext(options);
  const endpoint = new URL("api/sync", baseURL!).href,
    origin = new URL(baseURL!).origin;
  let profileId = "";
  const data = await (
    await a.request.get(new URL("data/edition.json", baseURL!).href)
  ).json();
  const article = data.articles.find(
    (x: any) => x.full && x.sourceId === "nasa",
  );
  async function start(context: BrowserContext, theme: string, saved = false) {
    const page = await context.newPage();
    await page.addInitScript(
      ({ p, article, saved }) => {
        if (!localStorage.getItem("folio.v1.preferences")) {
          localStorage.setItem("folio.v1.preferences", JSON.stringify(p));
          if (saved) {
            localStorage.setItem("folio.v1.saved", JSON.stringify([article]));
            localStorage.setItem(
              "folio.v1.progress",
              JSON.stringify({ [article.id]: 0.36 }),
            );
            localStorage.setItem(
              "folio.v1.magazineReading",
              JSON.stringify({
                "nasa-spinoff-2025": { page: 12, bookmark: 8 },
              }),
            );
          }
        }
      },
      {
        p: {
          ...defaults,
          complete: true,
          theme,
          interests: ["Space"],
          sourceIds: ["nasa"],
        },
        article,
        saved,
      },
    );
    await page.goto(new URL("settings", baseURL!).href);
    await page.getByRole("button", { name: "Sync my devices" }).click();
    await expect(
      page.getByRole("dialog", { name: "Your library, everywhere." }),
    ).toBeVisible();
    return page;
  }
  async function sync(page: Page) {
    await page.getByRole("button", { name: "Sync now", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Sync now", exact: true }),
    ).toBeEnabled();
    await expect(page.getByRole("dialog")).toContainText(
      "Library synchronized",
      { timeout: 25000 },
    );
  }
  try {
    console.log("QA: starting independent devices");
    const first = await start(a, "navy", true),
      second = await start(b, "light");
    console.log("QA: enabling sync");
    await first
      .getByRole("button", { name: "Enable private sync", exact: true })
      .click();
    await first.bringToFront();
    await expect(
      first.getByLabel("Saved recovery key", { exact: true }),
    ).toBeVisible();
    console.log("QA: recovery created");
    const recoveryKey = await first
      .getByLabel("Saved recovery key", { exact: true })
      .inputValue();
    expect(recoveryKey?.length).toBe(43);
    await first.getByRole("button", { name: "I have saved my key" }).click();
    await expect(first.getByRole("dialog")).toContainText(
      "Library synchronized",
      { timeout: 25000 },
    );
    console.log("QA: initial upload finished");
    const current = await a.request.post(endpoint, {
      headers: { Origin: origin },
      data: { action: "status" },
    });
    profileId = (await current.json()).profileId;
    expect(profileId).toBeTruthy();
    const unrelated = await other.request.post(endpoint, {
      headers: { Origin: origin },
      data: { action: "create", label: "FYLOGIA QA unrelated private library" },
    });
    expect(unrelated.status()).toBe(201);
    const unrelatedId = (await unrelated.json()).profileId;
    const isolated = await other.request.post(endpoint, {
      headers: { Origin: origin },
      data: { action: "exchange", expectedProfileId: profileId, cursor: 0 },
    });
    expect(isolated.status()).toBe(409);
    const empty = await other.request.post(endpoint, {
      headers: { Origin: origin },
      data: { action: "exchange", expectedProfileId: unrelatedId, cursor: 0 },
    });
    expect((await empty.json()).records).toEqual([]);

    await first.getByRole("button", { name: "Create pairing code" }).click();
    const sibling = await a.newPage();
    await sibling.goto(new URL("settings", baseURL!).href);
    await sibling
      .getByRole("button", { name: "Sync my devices", exact: true })
      .click();
    await expect(
      sibling.getByRole("button", { name: "Sync now", exact: true }),
    ).toBeVisible();
    console.log("QA: pairing started");
    const code = await first
      .getByLabel("Pairing code", { exact: true })
      .textContent();
    await expect(first.locator(".sync-pair img")).toBeVisible();
    await second.getByLabel("Pairing code", { exact: true }).fill(code!);
    await second.getByRole("button", { name: "Request device link" }).click();
    console.log("QA: second device requested pairing");
    const challenge = await second
      .getByLabel("Matching number", { exact: true })
      .textContent();
    await first.bringToFront();
    await expect(
      first.getByLabel("Requested matching number", { exact: true }),
    ).toHaveText(challenge!, { timeout: 15000 });
    await first
      .getByRole("button", { name: "Approve matching device" })
      .click();
    await second.bringToFront();
    console.log("QA: original device approved");
    await second
      .getByRole("button", { name: "Combine libraries and sync" })
      .click({ timeout: 15000 });
    await expect(second.getByRole("dialog")).toContainText(
      "Library synchronized",
      { timeout: 25000 },
    );
    await expect
      .poll(() =>
        second.evaluate(() =>
          JSON.parse(localStorage.getItem("folio.v1.saved") || "[]").map(
            (a: any) => a.id,
          ),
        ),
      )
      .toContain(article.id);
    console.log("QA: metadata arrived on independent device");
    const imported = await second.evaluate(
      () => JSON.parse(localStorage.getItem("folio.v1.saved")!)[0],
    );
    expect(imported.content).toBe("");
    expect(imported.image).toBeUndefined();
    expect(
      await second.evaluate(
        (id) => JSON.parse(localStorage.getItem("folio.v1.progress")!)[id],
        article.id,
      ),
    ).toBe(0.36);
    expect(
      await second.evaluate(
        () =>
          JSON.parse(localStorage.getItem("folio.v1.magazineReading")!)[
            "nasa-spinoff-2025"
          ],
      ),
    ).toEqual({ page: 12, bookmark: 8 });
    expect(
      await first.evaluate(
        () => JSON.parse(localStorage.getItem("folio.v1.saved")!)[0].content,
      ),
    ).toBe(article.content);
    expect(
      await second.evaluate(
        () => JSON.parse(localStorage.getItem("folio.v1.preferences")!).theme,
      ),
    ).toBe("navy");
    // Independent storage: downloads and publisher bodies were never transferred.
    const cookies = await b.cookies();
    expect(
      cookies.find((x) => x.name.endsWith("fylogia-device"))?.httpOnly,
    ).toBe(true);
    await second
      .getByRole("button", { name: "Back to Fylogia", exact: true })
      .click();
    await b.setOffline(true);
    await second
      .getByRole("button", { name: "Editorial Green", exact: true })
      .click();
    await second.getByRole("button", { name: "Sync my devices" }).click();
    await expect(second.getByRole("dialog")).toContainText("changes queued", {
      timeout: 10000,
    });
    await second.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await second.reload();
    await second.getByRole("button", { name: "Sync my devices" }).click();
    await expect(second.getByRole("dialog")).toContainText("changes queued");
    // Inject response loss above the service worker: WebKit does not reliably
    // expose requests from a controlled document to Playwright page routing.
    await second.evaluate(() => {
      const state = window as typeof window & {
        qaLost?: boolean;
        qaFetch?: typeof fetch;
      };
      const original = window.fetch.bind(window);
      state.qaFetch = original;
      window.fetch = async (...args) => {
        const body =
          typeof args[1]?.body === "string" ? JSON.parse(args[1].body) : {};
        if (
          !state.qaLost &&
          body.action === "exchange" &&
          body.mutations?.length
        ) {
          await original(...args);
          state.qaLost = true;
          throw new TypeError("QA simulated response loss after commit");
        }
        return original(...args);
      };
    });
    await b.setOffline(false);
    await expect
      .poll(() => second.evaluate(() => Boolean((window as any).qaLost)), {
        timeout: 15000,
      })
      .toBe(true);
    await expect(
      second.getByRole("button", { name: "Sync now", exact: true }),
    ).toBeEnabled();
    await sync(second);
    await second.evaluate(() => {
      window.fetch = (window as any).qaFetch;
    });
    await sync(first);
    await expect
      .poll(() =>
        first.evaluate(
          () => JSON.parse(localStorage.getItem("folio.v1.preferences")!).theme,
        ),
      )
      .toBe("dark");
    await sibling.bringToFront();
    await expect
      .poll(() =>
        sibling.evaluate(
          () => JSON.parse(localStorage.getItem("folio.v1.preferences")!).theme,
        ),
      )
      .toBe("dark");
    await sync(sibling);
    const secondStatus = await b.request.post(endpoint, {
      headers: { Origin: origin },
      data: { action: "status", expectedProfileId: profileId },
    });
    const secondDevice = (await secondStatus.json()).deviceId;
    const records = await a.request.post(endpoint, {
      headers: { Origin: origin },
      data: { action: "exchange", expectedProfileId: profileId, cursor: 0 },
    });
    expect(
      (await records.json()).records.find((r: any) => r.key === "setting:theme")
        .writer,
    ).toBe(secondDevice);
    await sibling.close();
    // A background sync does not replace the local publisher body.
    expect(
      await first.evaluate(
        () => JSON.parse(localStorage.getItem("folio.v1.saved")!)[0].content,
      ),
    ).toBe(article.content);
    await first
      .getByRole("button", { name: "Revoke device", exact: true })
      .click();
    await second.getByRole("button", { name: "Sync now", exact: true }).click();
    await expect(second.getByRole("alert")).toContainText(
      /disconnected|device|connect/i,
    );
    // Recovery rotates the secret, retains library metadata, and invalidates the previous trusted cookie.
    await second.getByText("Recover a library", { exact: true }).click();
    await second.getByLabel("Recovery key", { exact: true }).fill(recoveryKey!);
    await second
      .getByRole("button", { name: "Recover and review library" })
      .click();
    await expect(
      second.getByLabel("Saved recovery key", { exact: true }),
    ).toBeVisible();
    await second
      .getByRole("button", { name: "I have saved my key", exact: true })
      .click();
    await expect(
      second.getByRole("button", { name: "Combine libraries and sync" }),
    ).toBeVisible();
    await second
      .getByRole("button", { name: "Combine libraries and sync" })
      .click();
    await expect(second.getByRole("dialog")).toContainText(
      "Library synchronized",
      { timeout: 25000 },
    );
    await first.getByRole("button", { name: "Sync now", exact: true }).click();
    await expect(first.getByRole("alert")).toContainText(
      /disconnected|device|connect/i,
    );
    await second
      .getByText("Recovery and cloud deletion", { exact: true })
      .click();
    await second
      .getByLabel("Type DELETE to remove the private cloud library")
      .fill("DELETE");
    await second
      .getByRole("button", { name: "Delete cloud library", exact: true })
      .click();
    await expect(second.getByRole("status")).toContainText(
      "Cloud library deleted",
    );
    expect(
      await second.evaluate(
        () => JSON.parse(localStorage.getItem("folio.v1.saved")!).length,
      ),
    ).toBe(1);
  } finally {
    for (const context of [a, b, other]) {
      const status = await context.request
        .post(endpoint, {
          headers: { Origin: origin },
          data: { action: "status" },
        })
        .catch(() => undefined);
      if (status?.ok()) {
        const ownId = (await status.json()).profileId;
        await context.request
          .post(endpoint, {
            headers: { Origin: origin },
            data: {
              action: "delete",
              expectedProfileId: ownId,
              confirm: "DELETE",
            },
          })
          .catch(() => {});
      }
      await context.close();
    }
  }
});
