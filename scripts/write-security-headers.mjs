import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
export function securityHeaders(template, html) {
  const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(
      (m) =>
        !/\bsrc\s*=/i.test(m[1]) &&
        !/type=["']application\/ld\+json["']/i.test(m[1]) &&
        m[2].trim(),
    )
    .map(
      (m) =>
        "'sha256-" + createHash("sha256").update(m[2]).digest("base64") + "'",
    );
  if (!hashes.length || !template.includes("{{FYLOGIA_INLINE_SCRIPT_HASHES}}"))
    throw new Error("Missing security header or theme initializer");
  return template.replaceAll(
    "{{FYLOGIA_INLINE_SCRIPT_HASHES}}",
    hashes.join(" "),
  );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [template, html] = await Promise.all([
    readFile("dist/_headers", "utf8"),
    readFile("dist/index.html", "utf8"),
  ]);
  await writeFile("dist/_headers", securityHeaders(template, html));
}
