import { countryCodes } from "../src/countries.ts";

// Cloudflare supplies this property; never trust a query, cookie or client header.
export function requestCountry(request) {
  const country = request.cf?.country;
  return typeof country === "string" && countryCodes.has(country)
    ? country
    : undefined;
}
export function locationResponse(request) {
  if (!["GET", "HEAD"].includes(request.method))
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD", "Cache-Control": "no-store" },
    });
  return new Response(
    request.method === "HEAD"
      ? null
      : JSON.stringify({ country: requestCountry(request) || null }),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, noarchive",
      },
    },
  );
}
