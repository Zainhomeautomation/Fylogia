import { onRequest as syncRequest } from "../../server/sync.mjs";
export async function onRequest(context) {
  const response = await syncRequest(context);
  response.headers.set("X-Robots-Tag", "noindex, noarchive, nosnippet");
  return response;
}
