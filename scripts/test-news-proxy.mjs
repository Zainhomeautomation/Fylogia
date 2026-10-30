// Loopback-only test infrastructure. Never imported by the application or Pages Functions.
// Feed fixtures are served below the real service worker, consistently on every engine.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
export function testNewsProxy(target, port = 8788) {
  const fixtures = new Map();
  const server = createServer(async (request, response) => {
    try {
      const origin = `http://127.0.0.1:${server.address().port}`;
      const url = new URL(request.url, origin);
      const id = request.headers.cookie?.match(
        /(?:^|;\s*)fylogia_test_edition=([a-f0-9-]{36})(?:;|$)/,
      )?.[1];
      for (const [key, value] of fixtures)
        if (value.expires < Date.now()) fixtures.delete(key);
      if (url.pathname === "/__test/edition") {
        if (request.headers.origin && request.headers.origin !== origin) {
          response.writeHead(403);
          response.end();
          return;
        }
        if (
          !["POST", "DELETE"].includes(request.method) ||
          !request.headers["content-type"]?.startsWith("application/json")
        ) {
          response.writeHead(405);
          response.end();
          return;
        }
        if (request.method === "DELETE") {
          if (id) fixtures.delete(id);
          response.writeHead(200, {
            "Content-Type": "application/json",
            "Set-Cookie":
              "fylogia_test_edition=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
          });
          response.end("{}");
          return;
        }
        let size = 0;
        const chunks = [];
        for await (const chunk of request) {
          size += chunk.length;
          if (size > 8 * 1024 * 1024) throw new Error("Fixture too large");
          chunks.push(chunk);
        }
        const body = Buffer.concat(chunks),
          value = JSON.parse(body.toString());
        if (
          !Array.isArray(value.articles) ||
          !Array.isArray(value.statuses) ||
          typeof value.generatedAt !== "string"
        )
          throw new Error("Invalid fixture");
        const key = id || randomUUID();
        if (
          (!fixtures.has(key) && fixtures.size >= 64) ||
          [...fixtures.values()].reduce((n, f) => n + f.body.length, 0) -
            (fixtures.get(key)?.body.length || 0) +
            body.length >
            128 * 1024 * 1024
        ) {
          response.writeHead(503);
          response.end();
          return;
        }
        fixtures.set(key, { body, expires: Date.now() + 10 * 60 * 1000 });
        response.writeHead(200, {
          "Content-Type": "application/json",
          "Set-Cookie": `fylogia_test_edition=${key}; Path=/; HttpOnly; SameSite=Strict`,
          "Cache-Control": "no-store",
        });
        response.end("{}");
        return;
      }
      const fixture = id && fixtures.get(id);
      if (
        fixture &&
        url.pathname === "/data/edition.json" &&
        ["GET", "HEAD"].includes(request.method)
      ) {
        response.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        response.end(request.method === "HEAD" ? undefined : fixture.body);
        return;
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(request.headers))
        if (
          value &&
          ![
            "host",
            "connection",
            "content-length",
            "transfer-encoding",
          ].includes(key)
        )
          headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      // Preserve hostile Origins in security tests. Only our own test origin is translated.
      if (headers.get("origin") === origin)
        headers.set("origin", new URL(target).origin);
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 8 * 1024 * 1024) throw new Error("Request too large");
        chunks.push(chunk);
      }
      const result = await fetch(new URL(url.pathname + url.search, target), {
        method: request.method,
        headers,
        redirect: "manual",
        body: ["GET", "HEAD"].includes(request.method)
          ? undefined
          : Buffer.concat(chunks),
      });
      const out = Object.fromEntries(result.headers);
      for (const key of [
        "content-encoding",
        "content-length",
        "transfer-encoding",
        "connection",
        "set-cookie",
      ])
        delete out[key];
      const cookies = result.headers.getSetCookie();
      if (cookies.length) out["set-cookie"] = cookies;
      response.writeHead(result.status, out);
      if (result.body && request.method !== "HEAD")
        Readable.fromWeb(result.body).pipe(response);
      else response.end();
    } catch {
      if (!response.headersSent) response.writeHead(502);
      response.end();
    }
  });
  server.listen(port, "127.0.0.1");
  return server;
}
