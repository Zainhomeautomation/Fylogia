import { test } from "node:test";
import assert from "node:assert/strict";
import { onRequest } from "../functions/editions/nasa-spinoff-2025.pdf.js";

test("streams a fixed public PDF, forwards range but no cookies or credentials", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(
      url,
      "https://ntts-prod.s3.amazonaws.com/t2p/prod/spinoff/NASA.Spinoff_2025_508.pdf",
    );
    assert.equal(options.headers.get("Range"), "bytes=0-4");
    assert.equal(options.headers.get("Cookie"), null);
    assert.equal(options.headers.get("Authorization"), null);
    assert.equal(options.redirect, "manual");
    return new Response("%PDF-", {
      status: 206,
      headers: { "Content-Range": "bytes 0-4/54512000", "Set-Cookie": "no" },
    });
  });
  const response = await onRequest({
    request: new Request(
      "https://fylogia.com/editions/nasa-spinoff-2025.pdf?url=https://evil.invalid",
      {
        headers: {
          Range: "bytes=0-4",
          Cookie: "private",
          Authorization: "private",
        },
      },
    ),
  });
  assert.equal(response.status, 206);
  assert.equal(response.headers.get("Content-Range"), "bytes 0-4/54512000");
  assert.equal(response.headers.get("Set-Cookie"), null);
  assert.equal(await response.text(), "%PDF-");
});
test("rejects mutations and multiple/malformed ranges without upstream access", async (t) => {
  t.mock.method(globalThis, "fetch", () => {
    throw new Error("must not fetch");
  });
  assert.equal(
    (
      await onRequest({
        request: new Request("https://fylogia.com/pdf", { method: "POST" }),
      })
    ).status,
    405,
  );
  assert.equal(
    (
      await onRequest({
        request: new Request("https://fylogia.com/pdf", {
          headers: { Range: "bytes=0-5,20-30" },
        }),
      })
    ).status,
    416,
  );
});
test("handles publisher outage and HEAD without buffering", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(null, { headers: { "Content-Length": "54512000" } }),
  );
  const response = await onRequest({
    request: new Request("https://fylogia.com/pdf", { method: "HEAD" }),
  });
  assert.equal(response.headers.get("Content-Length"), "54512000");
  assert.equal(await response.text(), "");
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("unavailable", { status: 503 }),
  );
  assert.equal(
    (await onRequest({ request: new Request("https://fylogia.com/pdf") }))
      .status,
    502,
  );
});
