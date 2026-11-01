import "./check-distribution.mjs";
// Build static delivery slices from the already-authorized edition. No new retrieval.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { sources } from "../src/catalog.ts";
const edition = JSON.parse(await readFile("dist/data/edition.json", "utf8"));
const directory = "dist/data/source-files";
await mkdir(directory, { recursive: true });
const groups = new Map(sources.map((s) => [s.id, []]));
for (const article of edition.articles) {
  const ids = new Set([
    article.sourceId,
    ...(article.alsoIn || []),
    ...(article.feedContexts || []).map((c) => c.sourceId),
  ]);
  for (const id of ids) groups.get(id)?.push(article);
}
const index = [];
for (const [id, articles] of groups) {
  const file =
    createHash("sha256").update(id).digest("hex").slice(0, 16) + ".json";
  await writeFile(
    directory + "/" + file,
    JSON.stringify({ generatedAt: edition.generatedAt, articles }),
  );
  index.push({ id, file: "source-files/" + file, count: articles.length });
}
await writeFile(
  "dist/data/source-index.json",
  JSON.stringify({
    version: 1,
    generatedAt: edition.generatedAt,
    statuses: edition.statuses,
    sources: index,
  }),
);
console.log(
  "Wrote " +
    index.length +
    " static source editions; original edition retained.",
);
