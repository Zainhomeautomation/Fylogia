import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { testNewsProxy } from "../scripts/test-news-proxy.mjs";
async function setup(run) {
  const upstream = createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    res.writeHead(200, {
      "Content-Type": "application/json",
      "X-Fylogia-Index": "1",
      "Set-Cookie": "test_device=disposable; Path=/; HttpOnly; SameSite=Strict",
    });
    res.end(
      JSON.stringify({
        actual: true,
        origin: req.headers.origin,
        cookie: req.headers.cookie,
        body: Buffer.concat(chunks).toString(),
      }),
    );
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const target = `http://127.0.0.1:${upstream.address().port}`;
  const proxy = testNewsProxy(target, 0);
  await once(proxy, "listening");
  const origin = `http://127.0.0.1:${proxy.address().port}`;
  try {
    await run({ target, origin });
  } finally {
    proxy.closeAllConnections();
    upstream.closeAllConnections();
    await Promise.all([
      new Promise((r) => proxy.close(r)),
      new Promise((r) => upstream.close(r)),
    ]);
  }
}
const edition = {
  generatedAt: "2026-10-29T00:00:00Z",
  statuses: [],
  articles: [],
};
test("worker-level fixtures are private to their test cookie and deletion restores the real edition", async () =>
  setup(async ({ origin }) => {
    async function install(label) {
      const r = await fetch(origin + "/__test/edition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...edition, label }),
      });
      assert.equal(r.status, 200);
      return r.headers.get("set-cookie").split(";")[0];
    }
    const first = await install("first"),
      second = await install("second");
    for (const [cookie, label] of [
      [first, "first"],
      [second, "second"],
    ]) {
      const r = await fetch(origin + "/data/edition.json", {
        headers: { Cookie: cookie },
      });
      assert.equal((await r.json()).label, label);
      assert.equal(r.headers.get("x-fylogia-index"), null);
    }
    const head = await fetch(origin + "/data/edition.json", {
      method: "HEAD",
      headers: { Cookie: first },
    });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
    await fetch(origin + "/__test/edition", {
      method: "DELETE",
      headers: { Cookie: first, "Content-Type": "application/json" },
    });
    assert.equal(
      (
        await (
          await fetch(origin + "/data/edition.json", {
            headers: { Cookie: first },
          })
        ).json()
      ).actual,
      true,
    );
    assert.equal(
      (
        await (
          await fetch(origin + "/data/edition.json", {
            headers: { Cookie: second },
          })
        ).json()
      ).label,
      "second",
    );
    assert.equal(
      (await (await fetch(origin + "/data/edition.json")).json()).actual,
      true,
    );
  }));
test("test fixture control rejects cross-origin and non-JSON requests without enabling CORS", async () =>
  setup(async ({ origin }) => {
    const r = await fetch(origin + "/__test/edition", {
      method: "POST",
      headers: {
        Origin: "https://attacker.invalid",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(edition),
    });
    assert.equal(r.status, 403);
    assert.equal(r.headers.get("access-control-allow-origin"), null);
    assert.equal(
      (
        await fetch(origin + "/__test/edition", {
          method: "POST",
          body: "untrusted form",
        })
      ).status,
      405,
    );
    assert.equal((await fetch(origin + "/__test/edition")).status, 405);
  }));
test("Pages forwarding translates only its own Origin and retains cookies, hostile Origins and API payloads", async () =>
  setup(async ({ origin, target }) => {
    const r = await fetch(origin + "/api/sync", {
      method: "POST",
      headers: {
        Origin: origin,
        Cookie: "test_session=local",
        "Content-Type": "application/json",
      },
      body: '{"action":"status"}',
    });
    const value = await r.json();
    assert.equal(value.origin, target);
    assert.equal(value.cookie, "test_session=local");
    assert.equal(value.body, '{"action":"status"}');
    assert.match(r.headers.get("set-cookie"), /HttpOnly/);
    const hostile = await (
      await fetch(origin + "/api/sync", {
        method: "POST",
        headers: { Origin: "https://attacker.invalid" },
      })
    ).json();
    assert.equal(hostile.origin, "https://attacker.invalid");
  }));
