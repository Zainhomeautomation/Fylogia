import { test, expect } from "@playwright/test";
import { defaults } from "../src/catalog";
test.use({ trace: "off" });
test("an older open tab can edit preferences after a cloud update without losing its intent", async ({
  context,
  page,
  baseURL,
}) => {
  test.skip(
    process.env.FYLOGIA_PAGES_RUNTIME === "0",
    "Requires private Pages backend",
  );
  const endpoint = new URL("api/sync", baseURL!).href,
    origin = new URL(baseURL!).origin;
  let profileId = "";
  const rpc = async (action: string, data: Record<string, unknown> = {}) => {
    const r = await context.request.post(endpoint, {
      headers: { Origin: origin },
      data: {
        action,
        ...(profileId ? { expectedProfileId: profileId } : {}),
        ...data,
      },
    });
    return { status: r.status(), data: await r.json() };
  };
  async function sync() {
    await page.getByRole("button", { name: "Sync now", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Sync now", exact: true }),
    ).toBeEnabled();
    await expect(page.getByRole("dialog")).toContainText(
      "Library synchronized",
    );
  }
  try {
    await page.addInitScript(
      (p) => {
        if (!localStorage.getItem("folio.v1.preferences"))
          localStorage.setItem("folio.v1.preferences", JSON.stringify(p));
      },
      {
        ...defaults,
        complete: true,
        interests: ["Space"],
        sourceIds: ["nasa"],
      },
    );
    await page.goto(new URL("settings", baseURL!).href);
    await page.getByRole("button", { name: "Sync my devices" }).click();
    await page
      .getByRole("button", { name: "Enable private sync", exact: true })
      .click();
    await page
      .getByRole("button", { name: "I have saved my key", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "Library synchronized",
    );
    profileId = (await rpc("status")).data.profileId;
    const older = await context.newPage();
    await older.goto(new URL("settings", baseURL!).href);
    await expect(
      older.getByRole("button", { name: "Sync my devices" }),
    ).toBeVisible();
    const state = (await rpc("status")).data;
    expect(
      (
        await rpc("exchange", {
          cursor: 0,
          sequence: state.sequence + 1,
          batchId: crypto.randomUUID(),
          mutations: [
            {
              key: "setting:theme",
              value: "dark",
              changedAt: state.now + 1,
              baseRevision: state.revision,
              opId: crypto.randomUUID(),
            },
          ],
        })
      ).status,
    ).toBe(200);
    await page.bringToFront();
    await sync();
    await expect
      .poll(() =>
        page.evaluate(() =>
          localStorage.getItem("folio.local.origin.preferences"),
        ),
      )
      .toBe("cloud");
    // Pre-sync versions write the original JSON key without a provenance sidecar.
    await older.evaluate(() => {
      const key = "folio.v1.preferences",
        p = JSON.parse(localStorage.getItem(key)!);
      p.region = "Europe";
      localStorage.setItem(key, JSON.stringify(p));
    });
    await expect
      .poll(() =>
        page
          .getByRole("dialog")
          .evaluate(
            () =>
              JSON.parse(localStorage.getItem("folio.v1.preferences")!).region,
          ),
      )
      .toBe("Europe");
    await sync();
    const result = await rpc("exchange", { cursor: 0 });
    expect(
      result.data.records.find((r: any) => r.key === "setting:region").value,
    ).toBe("Europe");
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("folio.v1.preferences")!).region,
      ),
    ).toBe("Europe");
  } finally {
    const status = await context.request
      .post(endpoint, {
        headers: { Origin: origin },
        data: { action: "status" },
      })
      .catch(() => undefined);
    if (status?.ok()) {
      const id = (await status.json()).profileId;
      await context.request
        .post(endpoint, {
          headers: { Origin: origin },
          data: { action: "delete", expectedProfileId: id, confirm: "DELETE" },
        })
        .catch(() => {});
    }
  }
});
