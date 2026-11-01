// A single public NASA publication, streamed without persisting copyrighted
// uploads or accepting arbitrary target URLs. Keeps the 52 MiB PDF out of Pages assets.
const PUBLICATION =
  "https://ntts-prod.s3.amazonaws.com/t2p/prod/spinoff/NASA.Spinoff_2025_508.pdf";
export async function onRequest({ request }) {
  if (!["GET", "HEAD"].includes(request.method))
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  const range = request.headers.get("Range");
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range))
    return new Response("Unsupported byte range", { status: 416 });
  const headers = new Headers();
  if (range) headers.set("Range", range);
  if (request.headers.has("If-Range"))
    headers.set("If-Range", request.headers.get("If-Range"));
  try {
    const upstream = await fetch(PUBLICATION, {
      method: request.method,
      headers,
      redirect: "manual",
    });
    if (![200, 206, 416].includes(upstream.status)) {
      await upstream.body?.cancel();
      return new Response(
        "NASA publication temporarily unavailable. Use the publisher link or import a permitted PDF.",
        { status: 502 },
      );
    }
    const out = new Headers({
      "Content-Type": "application/pdf",
      "X-Robots-Tag": "noindex, noarchive, nosnippet",
      "Content-Disposition": 'inline; filename="NASA-Spinoff-2025.pdf"',
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
      if (upstream.headers.has(name)) out.set(name, upstream.headers.get(name));
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers: out,
    });
  } catch {
    return new Response("NASA publication temporarily unavailable", {
      status: 502,
    });
  }
}
