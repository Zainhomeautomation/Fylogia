// Fixed, curated publications only. Never accept a target URL from a request.
export async function streamPublication(request, publication, fetcher = fetch) {
  if (!["GET", "HEAD"].includes(request.method))
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  const headers = new Headers();
  const range = request.headers.get("Range");
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range))
    return new Response("Unsupported byte range", { status: 416 });
  const head = request.method === "HEAD";
  // Publisher download links redirect to GET-signed storage URLs. A one-byte
  // GET obtains metadata safely even when the publisher does not sign HEAD.
  if (range || head) headers.set("Range", range || "bytes=0-0");
  if (request.headers.has("If-Range"))
    headers.set("If-Range", request.headers.get("If-Range"));
  try {
    let url = publication.url;
    for (let redirects = 0; redirects <= 4; redirects++) {
      const parsed = new URL(url);
      if (
        parsed.protocol !== "https:" ||
        (parsed.port && parsed.port !== "443") ||
        parsed.username ||
        parsed.password ||
        !publication.hosts.includes(parsed.hostname)
      )
        throw new Error("Untrusted publication host");
      // Limit time to response headers, not the lifetime of a large PDF stream.
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      let response;
      try {
        response = await fetcher(url, {
          method: head ? "GET" : request.method,
          headers,
          redirect: "manual",
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get("Location");
        if (!location) throw new Error("Missing redirect");
        url = new URL(location, url).href;
        continue;
      }
      if (
        ![200, 206, 416].includes(response.status) ||
        (response.status !== 416 &&
          !response.headers
            .get("Content-Type")
            ?.toLowerCase()
            .startsWith("application/pdf"))
      ) {
        await response.body?.cancel();
        throw new Error("Publication unavailable");
      }
      const out = new Headers({
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${publication.filename}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600",
      });
      for (const name of [
        "Content-Length",
        "Content-Range",
        "Accept-Ranges",
        "ETag",
        "Last-Modified",
      ])
        if (response.headers.has(name))
          out.set(name, response.headers.get(name));
      let status = response.status;
      if (head) {
        await response.body?.cancel();
        if (!range && status === 206) {
          const total = response.headers
            .get("Content-Range")
            ?.match(/\/(\d+)$/)?.[1];
          out.delete("Content-Range");
          if (total) out.set("Content-Length", total);
          else out.delete("Content-Length");
          status = 200;
        }
      }
      return new Response(head ? null : response.body, {
        status,
        headers: out,
      });
    }
  } catch {
    /* The official publication link remains available in the library. */
  }
  return new Response(
    "Publication temporarily unavailable. Please use the original publisher link.",
    { status: 502 },
  );
}
