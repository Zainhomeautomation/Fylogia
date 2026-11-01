import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  validateDistributionPolicy,
  geographicDecision,
  assertPublicDistribution,
} from "../scripts/distribution-policy.mjs";
const ids = new Set(["example"]);
const rule = {
  id: "fixture-only",
  sourceId: "example",
  status: "approved",
  mode: "allow",
  countries: ["OM"],
  basis: "licensing",
  reason: "Test only, not an actual publisher restriction",
  evidenceUrl: "https://example.com/terms",
  reviewReference: "test-review",
  approvalReference: "test-approval",
  reviewedAt: "2026-01-01",
  reviewBy: "2027-01-01",
};
const policy = (r = rule) => ({ version: 1, rules: [r] });
const now = Date.parse("2026-11-01");
test("shipped configuration activates no country or topic bans", async () => {
  const config = JSON.parse(
    await readFile(
      new URL("../config/content-distribution.json", import.meta.url),
    ),
  );
  assert.deepEqual(config, { version: 1, rules: [] });
  assert.doesNotThrow(() => assertPublicDistribution(config, ids));
  assert.equal(
    geographicDecision(config, "example", undefined, now).allowed,
    true,
  );
});
test("rules require documented basis and explicit ISO countries", () => {
  for (const patch of [
    { basis: "editorial" },
    { reason: "" },
    { countries: ["Europe"] },
    { countries: ["OM", "OM"] },
    { sourceId: "unknown" },
    { evidenceUrl: "http://example.com" },
    { approvalReference: "" },
    { reviewBy: "yesterday" },
    { reviewReference: "" },
    { status: "enabled" },
  ])
    assert.throws(() =>
      validateDistributionPolicy(policy({ ...rule, ...patch }), ids),
    );
  assert.throws(() =>
    validateDistributionPolicy({ version: 1, rules: [rule, rule] }, ids),
  );
  assert.doesNotThrow(() => validateDistributionPolicy(policy(), ids));
});
test("approved allow and deny rules enforce both directions and unknown country", () => {
  assert.equal(
    geographicDecision(policy(), "example", "OM", now).allowed,
    true,
  );
  assert.equal(
    geographicDecision(policy(), "example", "US", now).allowed,
    false,
  );
  assert.equal(
    geographicDecision(policy(), "example", undefined, now).allowed,
    false,
  );
  assert.equal(
    geographicDecision(policy({ ...rule, mode: "deny" }), "example", "OM", now)
      .allowed,
    false,
  );
  assert.equal(
    geographicDecision(policy({ ...rule, mode: "deny" }), "example", "US", now)
      .allowed,
    true,
  );
  assert.equal(
    geographicDecision(policy(), "other", undefined, now).allowed,
    true,
  );
});
test("unreviewed drafts have no effect; expired or future approvals never fail open", () => {
  assert.doesNotThrow(() =>
    assertPublicDistribution(policy({ ...rule, status: "draft" }), ids),
  );
  assert.equal(
    geographicDecision(
      policy({ ...rule, status: "draft" }),
      "example",
      "US",
      now,
    ).allowed,
    true,
  );
  for (const patch of [
    { reviewBy: "2026-01-02" },
    { reviewedAt: "2026-12-01" },
  ])
    assert.equal(
      geographicDecision(policy({ ...rule, ...patch }), "example", "OM", now)
        .allowed,
      false,
    );
});
test("public publication refuses all approved territorial rules, even expired ones", () => {
  // Catalog-level gate precedes retrieval: aliases, caches and per-source slices
  // cannot evade it by changing an article's primary source ID.
  assert.throws(
    () => assertPublicDistribution(policy(), ids),
    /private delivery/,
  );
  assert.throws(
    () =>
      assertPublicDistribution(
        policy({ ...rule, reviewBy: "2026-01-02" }),
        ids,
      ),
    /private delivery/,
  );
});
