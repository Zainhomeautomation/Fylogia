import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { mkdir, rm, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
// Each run owns a disposable local database. This never queries production.
const persistence = resolve(".wrangler/sync-tests", randomUUID());
await mkdir(persistence, { recursive: true });
const env = { ...process.env, WRANGLER_SEND_METRICS: "false" };
for (const migration of (await readdir("migrations"))
  .filter((s) => s.endsWith(".sql"))
  .sort()) {
  const init = spawnSync(
    process.execPath,
    [
      wrangler,
      "d1",
      "execute",
      "FYLOGIA_SYNC_DB",
      "--local",
      "--file",
      "migrations/" + migration,
      "--persist-to",
      persistence,
    ],
    { stdio: "inherit", env },
  );
  if (init.status !== 0) {
    await rm(persistence, { recursive: true, force: true });
    process.exit(init.status || 1);
  }
}
const server = spawn(
  process.execPath,
  [
    wrangler,
    "pages",
    "dev",
    "dist",
    "--ip",
    "127.0.0.1",
    "--port",
    "8788",
    "--compatibility-date",
    "2026-10-29",
    "--persist-to",
    persistence,
  ],
  { stdio: "inherit", env },
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.once(signal, () => server.kill(signal));
server.once("exit", async (code) => {
  await rm(persistence, { recursive: true, force: true });
  process.exit(code || 0);
});
