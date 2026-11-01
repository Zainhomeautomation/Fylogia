import { readFile } from "node:fs/promises";
import { sources } from "../src/catalog.ts";
import { assertPublicDistribution } from "./distribution-policy.mjs";
const policy = JSON.parse(
  await readFile(
    new URL("../config/content-distribution.json", import.meta.url),
    "utf8",
  ),
);
assertPublicDistribution(policy, new Set(sources.map((s) => s.id)));
console.log(
  "Public distribution policy checked; no active geographic restrictions.",
);
