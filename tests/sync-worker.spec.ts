import { test, expect } from "@playwright/test";
test.use({ trace: "off" });
// This exercises actual Pages Functions and D1, independently of the SQLite unit adapter.
test("private worker pairs independent browser profiles and stores only authorized library metadata", async ({
  browser,
  baseURL,
}) => {
  test.skip(
    process.env.FYLOGIA_PAGES_RUNTIME === "0",
    "Cloudflare Functions require the Pages runtime.",
  );
  const origin = new URL(baseURL!).origin,
    endpoint = new URL("api/sync", baseURL!).href;
  const a = await browser.newContext(),
    b = await browser.newContext(),
    other = await browser.newContext();
  let aId = "",
    bId = "",
    otherId = "";
  async function rpc(
    context: typeof a,
    action: string,
    data: Record<string, unknown> = {},
    expected = "",
  ) {
    const response = await context.request.post(endpoint, {
      headers: { Origin: origin },
      data: {
        action,
        ...(expected ? { expectedProfileId: expected } : {}),
        ...data,
      },
    });
    return { response, data: await response.json() };
  }
  try {
    const first = await rpc(a, "create", { label: "FYLOGIA QA original" });
    expect(first.response.status()).toBe(201);
    aId = first.data.profileId;
    const third = await rpc(other, "create", { label: "FYLOGIA QA unrelated" });
    expect(third.response.status()).toBe(201);
    otherId = third.data.profileId;
    const code = await rpc(a, "pair", {}, aId);
    expect(code.response.ok()).toBe(true);
    const request = await rpc(b, "join", {
      code: code.data.code,
      label: "FYLOGIA QA second",
    });
    expect(request.response.status()).toBe(202);
    const waiting = await rpc(b, "pending");
    expect(waiting.data.approved).toBe(false);
    expect((await rpc(b, "exchange", { cursor: 0 })).response.status()).toBe(
      401,
    );
    const pending = await rpc(a, "requests", {}, aId);
    const own = pending.data.requests.find(
      (r: any) => r.challenge === request.data.challenge,
    );
    expect(!!own).toBe(true);
    expect(
      (await rpc(a, "approve", { requestId: own.id }, aId)).response.ok(),
    ).toBe(true);
    const connected = await rpc(b, "pending");
    expect(connected.data.approved).toBe(true);
    bId = connected.data.profileId;
    expect(bId).toBe(aId);
    const change = await rpc(
      a,
      "exchange",
      {
        cursor: 0,
        sequence: 1,
        batchId: crypto.randomUUID(),
        mutations: [
          {
            key: "setting:theme",
            value: "dark",
            changedAt: Date.now(),
            baseRevision: 0,
            opId: crypto.randomUUID(),
          },
        ],
      },
      aId,
    );
    expect(change.response.ok()).toBe(true);
    expect(change.response.headers()["cache-control"]).toContain("no-store");
    const received = await rpc(b, "exchange", { cursor: 0 }, bId);
    expect(
      received.data.records.some(
        (r: any) => r.key === "setting:theme" && r.value === "dark",
      ),
    ).toBe(true);
    expect(
      (await rpc(other, "exchange", { cursor: 0 }, otherId)).data.records,
    ).toEqual([]);
    const cookies = await b.cookies(origin);
    expect(
      cookies
        .filter((c) => c.name.includes("fylogia"))
        .every((c) => c.httpOnly && c.sameSite === "Strict"),
    ).toBe(true);
    const page = await b.newPage();
    await page.goto(baseURL!);
    expect(
      (await page.evaluate(() => document.cookie)).includes("fylogia"),
    ).toBe(false);
    expect(
      (
        await rpc(
          a,
          "exchange",
          {
            cursor: 0,
            sequence: 2,
            batchId: crypto.randomUUID(),
            mutations: [
              {
                key: "saved:story",
                value: { id: "story", content: "Copyrighted body" },
                changedAt: Date.now(),
                baseRevision: 1,
                opId: crypto.randomUUID(),
              },
            ],
          },
          aId,
        )
      ).response.status(),
    ).toBe(400);
  } finally {
    for (const [context, id] of [
      [a, aId],
      [b, bId],
      [other, otherId],
    ] as const) {
      if (id)
        await rpc(context, "delete", { confirm: "DELETE" }, id).catch(() => {});
      await context.close();
    }
  }
});
