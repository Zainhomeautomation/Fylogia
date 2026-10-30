import { readdir, stat, rm, writeFile } from "node:fs/promises";
// The fixed Pages Function serves this original publication with range support.
await rm("dist/editions", { recursive: true, force: true });
await writeFile(
  "dist/_routes.json",
  JSON.stringify(
    {
      version: 1,
      include: [
        "/editions/nasa-spinoff-2025.pdf",
        "/editions/hackspace-75.pdf",
        "/api/sync",
      ],
      exclude: [],
    },
    null,
    2,
  ),
);
async function validate(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = directory + "/" + entry.name;
    if (entry.isDirectory()) await validate(path);
    else if ((await stat(path)).size > 25 * 1024 * 1024)
      throw new Error(`Pages asset exceeds 25 MiB: ${path}`);
  }
}
await validate("dist");
console.log(
  "Pages assets validated; fixed NASA PDF served by streaming function.",
);
