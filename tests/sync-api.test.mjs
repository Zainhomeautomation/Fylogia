import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { createSyncHandler } from "../server/sync.mjs";
import { validateSyncValue } from "../src/sync-protocol.ts";
class DB {
  constructor() {
    this.db = new DatabaseSync(":memory:");
    this.db.exec("PRAGMA foreign_keys=ON");
    for (const file of readdirSync(new URL("../migrations/", import.meta.url))
      .filter((s) => s.endsWith(".sql"))
      .sort())
      this.db.exec(
        readFileSync(new URL("../migrations/" + file, import.meta.url), "utf8"),
      );
  }
  prepare(sql) {
    const db = this.db;
    const execute = (args = []) => {
      const statement = db.prepare(sql);
      const results = statement.columns().length
        ? statement.all(...args)
        : (statement.run(...args), []);
      return {
        results,
        success: true,
        meta: { changes: Number(db.prepare("SELECT changes() AS n").get().n) },
      };
    };
    // D1 batches carry bound statements; execute with those same bindings.
    const wrap = (args = []) => ({
      bind: (...a) => wrap(a),
      first: async () => db.prepare(sql).get(...args) || null,
      all: async () => ({ results: db.prepare(sql).all(...args) }),
      run: async () => execute(args),
      execute: () => execute(args),
    });
    return wrap();
  }
  async batch(statements) {
    this.db.exec("BEGIN");
    try {
      const out = statements.map((s) => s.execute());
      this.db.exec("COMMIT");
      return out;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  close() {
    this.db.close();
  }
}
function fixture() {
  const db = new DB();
  let now = Date.UTC(2026, 9, 29, 12);
  const handler = createSyncHandler({ now: () => now });
  const device = () => {
    let cookie = "",
      profileId;
    return {
      async call(action, values = {}, options = {}) {
        const headers = {
          "Content-Type": "application/json",
          Origin: "https://fylogia.com",
          Cookie: cookie,
          "CF-Connecting-IP": options.ip || "192.0.2.1",
          ...options.headers,
        };
        const response = await handler({
          env: { FYLOGIA_SYNC_DB: db },
          request: new Request("https://fylogia.com/api/sync", {
            method: "POST",
            headers,
            body: JSON.stringify({
              action,
              ...(![
                "availability",
                "create",
                "join",
                "pending",
                "recover",
                "recover-confirm",
              ].includes(action) && profileId
                ? { expectedProfileId: profileId }
                : {}),
              ...values,
            }),
          }),
        });
        for (const c of response.headers.getSetCookie()) {
          const pair = c.split(";")[0];
          const n = pair.split("=")[0];
          const existing = cookie
            .split("; ")
            .filter((s) => s && !s.startsWith(n + "="));
          if (!c.includes("Max-Age=0")) existing.push(pair);
          cookie = existing.join("; ");
        }
        const data = await response.json();
        if (data.profileId) profileId = data.profileId;
        return {
          status: response.status,
          data,
          headers: response.headers,
        };
      },
      get cookie() {
        return cookie;
      },
      set cookie(v) {
        cookie = v;
      },
    };
  };
  return {
    db,
    device,
    handler,
    now: () => now,
    advance: (ms) => {
      now += ms;
    },
    close: () => db.close(),
  };
}
async function owner(f) {
  const a = f.device();
  const r = await a.call("create", { label: "Original device" });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return { a, info: r.data };
}
async function pair(f, a) {
  const b = f.device(),
    code = await a.call("pair");
  assert.equal(code.status, 200);
  const join = await b.call("join", {
    code: code.data.code,
    label: "Second device",
  });
  assert.equal(join.status, 202);
  const req = await a.call("requests");
  const pending = req.data.requests.find(
    (r) => r.challenge === join.data.challenge,
  );
  assert.ok(pending);
  const approval = await a.call("approve", { requestId: pending.id });
  assert.equal(approval.status, 200);
  const done = await b.call("pending");
  assert.equal(done.data.approved, true);
  return b;
}
const mutation = (key, value, changedAt, baseRevision = 0) => ({
  key,
  value,
  changedAt,
  baseRevision,
  opId: crypto.randomUUID(),
});
async function push(device, mutations, cursor = 0) {
  const s = await device.call("status");
  return device.call("exchange", {
    cursor,
    sequence: s.data.sequence + 1,
    batchId: crypto.randomUUID(),
    mutations,
  });
}

test("private API rejects unauthenticated, cross-origin, preview-host and non-POST requests and never caches private replies", async () => {
  const f = fixture();
  try {
    const a = f.device();
    const r = await a.call("exchange", { cursor: 0 });
    assert.equal(r.status, 401);
    assert.match(r.headers.get("Cache-Control"), /no-store/);
    assert.equal(
      (
        await a.call(
          "create",
          { label: "bad" },
          { headers: { Origin: "https://attacker.example" } },
        )
      ).status,
      403,
    );
    for (const [url, method, status] of [
      ["https://fylogia.com/api/sync", "GET", 405],
      ["https://branch.fylogia.pages.dev/api/sync", "POST", 503],
    ]) {
      const res = await f.handler({
        env: { FYLOGIA_SYNC_DB: f.db },
        request: new Request(url, {
          method,
          headers: {
            Origin: new URL(url).origin,
            "Content-Type": "application/json",
          },
          ...(method === "POST" ? { body: '{"action":"availability"}' } : {}),
        }),
      });
      assert.equal(res.status, status);
      assert.match(res.headers.get("Cache-Control"), /no-store/);
    }
  } finally {
    f.close();
  }
});
test("anonymous profile uses private hashed device credentials, secure HttpOnly cookies and no email/password", async () => {
  const f = fixture();
  try {
    const { a, info } = await owner(f);
    const status = await a.call("status");
    assert.equal(status.data.profileId, info.profileId);
    assert.ok(!("recoveryKey" in status.data));
    const stored = f.db.db.prepare("SELECT * FROM sync_devices").get();
    const token = a.cookie.split("=")[1];
    assert.notEqual(stored.secret_hash, token);
    assert.equal(stored.secret_hash.length, 64);
    assert.ok(!JSON.stringify(stored).includes(info.recoveryKey));
    const r = await a.call("rotate-recovery");
    assert.match(r.headers.get("Cache-Control"), /no-store/);
  } finally {
    f.close();
  }
});
test("pairing needs matching trusted-device approval, single-use code, and cannot authenticate pending credentials", async () => {
  const f = fixture();
  try {
    const { a } = await owner(f);
    const b = f.device();
    const code = await a.call("pair");
    const join = await b.call("join", { code: code.data.code, label: "Phone" });
    assert.equal(join.status, 202);
    assert.equal((await b.call("pending")).data.approved, false);
    assert.equal((await b.call("exchange", { cursor: 0 })).status, 401);
    const pendingToken = b.cookie.split("=")[1];
    const forged = f.device();
    forged.cookie = "__Host-fylogia-device=" + pendingToken;
    assert.equal((await forged.call("status")).status, 401);
    const list = await a.call("requests");
    const id = list.data.requests[0].id;
    assert.equal((await b.call("approve", { requestId: id })).status, 401);
    assert.equal((await a.call("approve", { requestId: id })).status, 200);
    assert.equal((await forged.call("status")).status, 401);
    assert.equal((await b.call("pending")).data.approved, true);
    assert.equal((await b.call("status")).status, 200);
    assert.equal(
      (
        await f
          .device()
          .call("join", { code: code.data.code, label: "Replayed" })
      ).status,
      410,
    );
    const devices = await a.call("devices");
    assert.equal(devices.data.devices.length, 2);
  } finally {
    f.close();
  }
});
test("expired pairing sessions cannot be joined, approved or redeemed", async () => {
  const f = fixture();
  try {
    const { a } = await owner(f);
    const b = f.device();
    const code = await a.call("pair");
    await b.call("join", { code: code.data.code, label: "Phone" });
    const list = await a.call("requests");
    f.advance(300001);
    assert.equal(
      (await a.call("approve", { requestId: list.data.requests[0].id })).status,
      410,
    );
    assert.equal((await b.call("pending")).status, 410);
    assert.equal(
      (await f.device().call("join", { code: code.data.code, label: "Late" }))
        .status,
      410,
    );
  } finally {
    f.close();
  }
});
test("metadata sync is private across profiles and device revocation blocks queued writes", async () => {
  const f = fixture();
  try {
    const { a } = await owner(f),
      b = await pair(f, a);
    const stranger = f.device();
    assert.equal(
      (
        await stranger.call(
          "create",
          { label: "Other library" },
          { ip: "192.0.2.2" },
        )
      ).status,
      201,
    );
    const r = await push(a, [mutation("setting:theme", "dark", f.now())]);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(
      (await b.call("exchange", { cursor: 0 })).data.records[0].value,
      "dark",
    );
    assert.equal(
      (await stranger.call("exchange", { cursor: 0 })).data.records.length,
      0,
    );
    const info = await b.call("status");
    await a.call("revoke", { deviceId: info.data.deviceId });
    assert.equal((await b.call("status")).status, 401);
    assert.equal(
      (await push(b, [mutation("setting:theme", "light", f.now())])).status,
      401,
    );
  } finally {
    f.close();
  }
});
test("batch retries are idempotent, stale sequences are rejected and timestamps resolve simultaneous edits", async () => {
  const f = fixture();
  try {
    const { a } = await owner(f),
      b = await pair(f, a);
    const batch = {
      cursor: 0,
      sequence: 1,
      batchId: crypto.randomUUID(),
      mutations: [mutation("setting:theme", "navy", f.now())],
    };
    const first = await a.call("exchange", batch),
      again = await a.call("exchange", batch);
    assert.equal(first.status, 200, JSON.stringify(first.data));
    assert.equal(again.data.revision, first.data.revision);
    assert.equal(
      f.db.db.prepare("SELECT count(*) AS n FROM sync_records").get().n,
      1,
    );
    assert.equal(
      (await a.call("exchange", { ...batch, batchId: crypto.randomUUID() }))
        .status,
      409,
    );
    f.advance(10);
    await push(b, [
      mutation("setting:theme", "light", f.now(), first.data.revision),
    ]);
    const records = (await a.call("exchange", { cursor: 0 })).data.records;
    assert.equal(records[0].value, "light");
  } finally {
    f.close();
  }
});
test("saved tombstones suppress stale offline resurrection but explicit observed re-saving is allowed", async () => {
  const f = fixture();
  try {
    const { a } = await owner(f),
      b = await pair(f, a);
    const value = {
      id: "https://example.org/story",
      url: "https://example.org/story",
      title: "Story",
      source: "Publisher",
      sourceId: "test",
      published: "",
      categories: ["Science"],
      region: "Worldwide",
    };
    const key = "saved:" + value.id;
    await push(a, [mutation(key, value, f.now())]);
    f.advance(10);
    const removed = await push(a, [mutation(key, null, f.now(), 1)]);
    f.advance(10);
    await push(b, [mutation(key, value, f.now(), 1)]);
    let records = (await a.call("exchange", { cursor: 0 })).data.records;
    assert.equal(records[0].value, null);
    f.advance(10);
    await push(b, [mutation(key, value, f.now(), removed.data.revision)]);
    records = (await a.call("exchange", { cursor: 0 })).data.records;
    assert.equal(records[0].value.title, "Story");
  } finally {
    f.close();
  }
});
test("publisher bodies, images, unsupported root fields, oversized requests and future clocks are rejected without writes", async () => {
  const f = fixture();
  try {
    const { a } = await owner(f);
    const v = {
      id: "https://example.org/story",
      url: "https://example.org/story",
      title: "Story",
      source: "Publisher",
      sourceId: "test",
      published: "",
      categories: ["Science"],
      region: "Worldwide",
      content: "Copyrighted body",
    };
    assert.throws(() => validateSyncValue("saved:" + v.id, v));
    const bad = await push(a, [mutation("saved:" + v.id, v, f.now())]);
    assert.equal(bad.status, 400);
    assert.equal(
      (await a.call("status", { content: "Forbidden upload" })).status,
      400,
    );
    assert.equal(
      (await push(a, [mutation("progress:story", 0.5, f.now() + 600000)]))
        .status,
      400,
    );
    assert.equal(
      (await a.call("status", { padding: "x".repeat(150000) })).status,
      413,
    );
    assert.equal(
      f.db.db.prepare("SELECT count(*) AS n FROM sync_records").get().n,
      0,
    );
  } finally {
    f.close();
  }
});
test("recovery rotates the key and revokes prior devices; cloud deletion cascades while unrelated libraries survive", async () => {
  const f = fixture();
  try {
    const { a, info } = await owner(f),
      b = await pair(f, a);
    await push(a, [mutation("progress:story", 0.5, f.now())]);
    const recovered = f.device();
    const r = await recovered.call("recover", {
      recoveryKey: info.recoveryKey,
      label: "Recovered",
    });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.notEqual(r.data.recoveryKey, info.recoveryKey);
    assert.equal((await a.call("status")).status, 200);
    assert.equal((await recovered.call("status")).status, 401);
    assert.equal((await recovered.call("recover-confirm")).status, 200);
    assert.equal((await a.call("status")).status, 401);
    assert.equal((await b.call("status")).status, 401);
    assert.equal(
      (
        await f
          .device()
          .call(
            "recover",
            { recoveryKey: info.recoveryKey, label: "Replay" },
            { ip: "192.0.2.4" },
          )
      ).status,
      403,
    );
    assert.equal(
      (await recovered.call("exchange", { cursor: 0 })).data.records[0].value,
      0.5,
    );
    const other = f.device();
    await other.call("create", { label: "Unrelated" }, { ip: "192.0.2.5" });
    assert.equal(
      (await recovered.call("delete", { confirm: "DELETE" })).status,
      200,
    );
    assert.equal((await recovered.call("status")).status, 401);
    assert.equal((await other.call("status")).status, 200);
    assert.equal(
      f.db.db.prepare("SELECT count(*) AS n FROM sync_records").get().n,
      0,
    );
    assert.equal(
      f.db.db.prepare("SELECT bytes FROM sync_budget WHERE key='storage'").get()
        .bytes,
      0,
    );
  } finally {
    f.close();
  }
});
test("code brute-force attempts are rate limited and device sessions expire server-side", async () => {
  const f = fixture();
  try {
    const { a } = await owner(f);
    const b = f.device();
    for (let i = 0; i < 10; i++)
      assert.equal(
        (await b.call("join", { code: "23456-789AB", label: "No code" }))
          .status,
        410,
      );
    assert.equal(
      (await b.call("join", { code: "23456-789AB", label: "Too many" })).status,
      429,
    );
    f.advance(366 * 86400000);
    assert.equal((await a.call("status")).status, 401);
  } finally {
    f.close();
  }
});

test("pair requests are bounded, other requests cannot use the consumed code, and approvals can be cancelled", async () => {
  const f = fixture();
  try {
    const { a } = await owner(f);
    const code = await a.call("pair"),
      clients = [f.device(), f.device(), f.device(), f.device()];
    for (let i = 0; i < 3; i++)
      assert.equal(
        (
          await clients[i].call(
            "join",
            { code: code.data.code, label: "Request " + i },
            { ip: "192.0.2." + (10 + i) },
          )
        ).status,
        202,
      );
    assert.equal(
      (
        await clients[3].call(
          "join",
          { code: code.data.code, label: "Over limit" },
          { ip: "192.0.2.15" },
        )
      ).status,
      429,
    );
    const list = await a.call("requests"),
      chosen = list.data.requests[0];
    await a.call("approve", { requestId: chosen.id });
    const approvedIndex = await Promise.all(
      clients
        .slice(0, 3)
        .map(async (b, i) => ({ i, r: await b.call("pending") })),
    );
    assert.equal(
      approvedIndex.filter((x) => x.r.status === 200 && x.r.data.approved)
        .length,
      1,
    );
    assert.equal(approvedIndex.filter((x) => x.r.status === 410).length, 2);
    await a.call("reject", { requestId: chosen.id });
    const joined = clients[approvedIndex.find((x) => x.r.status === 200).i];
    assert.equal((await joined.call("status")).status, 401);
  } finally {
    f.close();
  }
});
test("quota errors roll back the whole metadata batch, including sequence and revision", async () => {
  const f = fixture();
  try {
    const { a, info } = await owner(f);
    f.db.db
      .prepare("UPDATE sync_profiles SET bytes=5242879 WHERE id=?")
      .run(info.profileId);
    const result = await push(a, [
      mutation("setting:theme", "navy", f.now()),
      mutation("setting:fontSize", 20, f.now()),
    ]);
    assert.equal(result.status, 429);
    const status = await a.call("status");
    assert.equal(status.data.sequence, 0);
    assert.equal(status.data.revision, 0);
    assert.equal(
      f.db.db.prepare("SELECT COUNT(*) AS n FROM sync_records").get().n,
      0,
    );
  } finally {
    f.close();
  }
});
test("creating again with the same authenticated browser keeps its existing private profile", async () => {
  const f = fixture();
  try {
    const { a, info } = await owner(f);
    const again = await a.call("create", { label: "Retry" });
    assert.equal(again.status, 200);
    assert.equal(again.data.profileId, info.profileId);
    assert.equal(
      f.db.db.prepare("SELECT COUNT(*) AS n FROM sync_profiles").get().n,
      1,
    );
  } finally {
    f.close();
  }
});

test("identity changes in another tab cannot upload the old library into the newly selected profile", async () => {
  const f = fixture();
  try {
    const { a, info } = await owner(f);
    const other = f.device();
    const r = await other.call(
      "create",
      { label: "Other identity" },
      { ip: "192.0.2.20" },
    );
    assert.equal(r.status, 201);
    a.cookie = other.cookie;
    const result = await a.call("exchange", {
      cursor: 0,
      sequence: 1,
      batchId: crypto.randomUUID(),
      mutations: [mutation("setting:theme", "dark", f.now())],
      expectedProfileId: info.profileId,
    });
    assert.equal(result.status, 409);
    assert.equal(
      f.db.db.prepare("SELECT COUNT(*) AS n FROM sync_records").get().n,
      0,
    );
    assert.equal(
      (
        await a.call("delete", {
          confirm: "DELETE",
          expectedProfileId: info.profileId,
        })
      ).status,
      409,
    );
    assert.equal((await other.call("status")).status, 200);
  } finally {
    f.close();
  }
});
test("a revoked cookie does not prevent securely pairing this browser again", async () => {
  const f = fixture();
  try {
    const { a } = await owner(f),
      b = await pair(f, a);
    const old = await b.call("status");
    await a.call("revoke", { deviceId: old.data.deviceId });
    const code = await a.call("pair");
    assert.equal(
      (await b.call("join", { code: code.data.code, label: "Reconnected" }))
        .status,
      202,
    );
    const req = await a.call("requests");
    await a.call("approve", { requestId: req.data.requests[0].id });
    assert.equal((await b.call("pending")).data.approved, true);
    assert.equal((await b.call("status")).status, 200);
  } finally {
    f.close();
  }
});

test("lost recovery responses cannot invalidate the only key before replacement acknowledgement", async () => {
  const f = fixture();
  try {
    const { a, info } = await owner(f);
    const lost = f.device();
    await lost.call("recover", {
      recoveryKey: info.recoveryKey,
      label: "Lost response",
    });
    lost.cookie = ""; // The entire response, including its cookie and key, was lost.
    assert.equal((await a.call("status")).status, 200);
    f.advance(301000); // An expired unacknowledged attempt does not consume the old key.
    const retry = f.device();
    const prepared = await retry.call(
      "recover",
      { recoveryKey: info.recoveryKey, label: "Retry" },
      { ip: "192.0.2.21" },
    );
    assert.equal(prepared.status, 200);
    assert.equal(prepared.data.requiresConfirmation, true);
    const pendingCookie = retry.cookie;
    assert.equal((await retry.call("status")).status, 401);
    assert.equal((await retry.call("recover-confirm")).status, 200);
    retry.cookie = pendingCookie; // Confirmation committed, but its response was lost.
    const repaired = await retry.call("recover-confirm");
    assert.equal(repaired.status, 200);
    assert.equal((await retry.call("status")).status, 200);
    assert.equal((await a.call("status")).status, 401);
    assert.equal(
      f.db.db.prepare("SELECT count(*) AS n FROM sync_devices").get().n,
      1,
    );
    const recovery = f.device();
    assert.equal(
      (
        await recovery.call(
          "recover",
          { recoveryKey: prepared.data.recoveryKey, label: "Saved new key" },
          { ip: "192.0.2.22" },
        )
      ).status,
      200,
    );
  } finally {
    f.db.close();
  }
});

test("country and news ordering sync to capable devices without breaking older clients", async () => {
  const f = fixture();
  try {
    const { a } = await owner(f),
      b = await pair(f, a);
    const uploaded = await push(a, [
      mutation("setting:country", "OM", f.now()),
      mutation("setting:newsSort", "oldest", f.now()),
      mutation("setting:theme", "dark", f.now()),
    ]);
    assert.equal(uploaded.status, 200);
    const legacy = await b.call("exchange", { cursor: 0 });
    assert.equal(legacy.status, 200);
    assert.ok(legacy.data.records.some((r) => r.key === "setting:theme"));
    assert.ok(
      !legacy.data.records.some((r) =>
        ["setting:country", "setting:newsSort"].includes(r.key),
      ),
    );
    const modern = await b.call("exchange", {
      cursor: 0,
      preferenceVersion: 2,
    });
    assert.equal(
      modern.data.records.find((r) => r.key === "setting:country").value,
      "OM",
    );
    assert.equal(
      modern.data.records.find((r) => r.key === "setting:newsSort").value,
      "oldest",
    );
    f.advance(1000);
    await push(b, [
      mutation("setting:theme", "light", f.now(), modern.data.revision),
    ]);
    const kept = await a.call("exchange", { cursor: 0, preferenceVersion: 2 });
    assert.equal(
      kept.data.records.find((r) => r.key === "setting:country").value,
      "OM",
    );
    assert.equal(
      (await a.call("exchange", { cursor: 0, preferenceVersion: 999 })).status,
      400,
    );
    f.advance(1000);
    await push(a, [
      mutation("setting:country", null, f.now(), kept.data.revision),
    ]);
    const cleared = await b.call("exchange", {
      cursor: 0,
      preferenceVersion: 2,
    });
    assert.equal(
      cleared.data.records.find((r) => r.key === "setting:country").value,
      null,
    );
  } finally {
    f.close();
  }
});
