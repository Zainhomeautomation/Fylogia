import { MAX_REQUEST_BYTES, object } from "../src/sync-protocol.ts";
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const YEAR = 365 * 86400000,
  PAIR_TTL = 300000;
export const uid = () => crypto.randomUUID();
export const secret = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
};
export const hash = async (value) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
export const localHost = (url) =>
  ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
export function cookieName(url, pending = false) {
  return (
    (url.protocol === "https:" ? "__Host-" : "") +
    "fylogia-" +
    (pending ? "pair" : "device")
  );
}
export function cookie(url, value, pending = false, clear = false) {
  return `${cookieName(url, pending)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : pending ? 300 : 365 * 86400}${url.protocol === "https:" ? "; Secure" : ""}`;
}
export function readCookie(request, url, pending = false) {
  const raw = request.headers.get("Cookie") || "";
  if (raw.length > 8192) return "";
  const name = cookieName(url, pending) + "=";
  const value =
    raw
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(name))
      ?.slice(name.length) || "";
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : "";
}
export function json(value, status = 200, cookies = []) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  for (const c of cookies) headers.append("Set-Cookie", c);
  if (status === 429) headers.set("Retry-After", "60");
  return new Response(JSON.stringify(value), { status, headers });
}
export async function readBody(request) {
  if (
    !/^application\/json(?:;|$)/i.test(
      request.headers.get("Content-Type") || "",
    )
  )
    throw new ApiError(415, "Use JSON for sync requests.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Missing request.");
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new ApiError(413, "Sync request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return object(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
    );
  } catch {
    throw new ApiError(400, "Invalid JSON request.");
  }
}
export function label(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 60)
    throw new ApiError(400, "Choose a short device name.");
  return value.replace(/[\p{Cc}\p{Cf}]/gu, "").trim() || "My device";
}
export async function admission(db, request, url, now, action) {
  const day = new Date(now).toISOString().slice(0, 10);
  const row = await db
    .prepare(
      "INSERT INTO sync_budget(key,requests,salt) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET requests=requests+1 WHERE requests<5000 RETURNING salt,requests",
    )
    .bind(day, secret())
    .first();
  if (!row)
    throw new ApiError(
      429,
      "Cloud sync has reached its daily free limit. Reading and local changes remain available.",
    );
  if (row.requests % 100 === 1) {
    await db.batch([
      db
        .prepare(
          "DELETE FROM sync_rate WHERE key IN(SELECT key FROM sync_rate WHERE expires_at<? LIMIT 300)",
        )
        .bind(now),
      db
        .prepare(
          "DELETE FROM sync_pairings WHERE id IN(SELECT id FROM sync_pairings WHERE expires_at<=? LIMIT 100)",
        )
        .bind(now),
      db
        .prepare(
          "DELETE FROM sync_recoveries WHERE profile_id IN(SELECT profile_id FROM sync_recoveries WHERE expires_at<? LIMIT 100)",
        )
        .bind(now),
      db
        .prepare("DELETE FROM sync_budget WHERE key<?")
        .bind(new Date(now - 3 * 86400000).toISOString().slice(0, 10)),
    ]);
  }
  const window = action === "create" || action === "recover" ? 3600000 : 60000;
  const limit = localHost(url)
    ? 1000
    : action === "create" || action === "recover"
      ? 3
      : action === "join"
        ? 10
        : 180;
  const key = await hash(
    `${row.salt}:${request.headers.get("CF-Connecting-IP") || "local"}:${action}:${Math.floor(now / window)}`,
  );
  const count = await db
    .prepare(
      "INSERT INTO sync_rate(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<? RETURNING count",
    )
    .bind(key, now + window * 2, limit)
    .first();
  if (!count)
    throw new ApiError(
      429,
      "Please wait before trying again. Your local library is unchanged.",
    );
  return day;
}
export async function authenticate(db, request, url, now) {
  const token = readCookie(request, url);
  if (!token) throw new ApiError(401, "This device is not connected.");
  const device = await db
    .prepare(
      "SELECT d.id AS device_id,d.profile_id,d.label,d.last_seq,d.last_batch,p.revision,p.bytes FROM sync_devices d JOIN sync_profiles p ON p.id=d.profile_id WHERE d.secret_hash=? AND d.active=1 AND d.expires_at>?",
    )
    .bind(await hash(token), now)
    .first();
  if (!device)
    throw new ApiError(
      401,
      "This device was disconnected or its session expired. Your local library is safe.",
    );
  return device;
}
