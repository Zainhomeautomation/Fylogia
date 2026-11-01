import { countryCodes } from "../src/countries.ts";

// No topic heuristics, location storage, network requests or default country bans.
export function validateDistributionPolicy(policy, sourceIds) {
  if (policy?.version !== 1 || !Array.isArray(policy.rules))
    throw new Error("Unsupported distribution policy");
  const ids = new Set();
  for (const rule of policy.rules) {
    if (!rule.id || ids.has(rule.id))
      throw new Error("Duplicate/missing policy ID");
    ids.add(rule.id);
    if (!sourceIds.has(rule.sourceId)) throw new Error("Unknown policy source");
    if (!["draft", "approved"].includes(rule.status))
      throw new Error("Invalid policy status");
    if (!["allow", "deny"].includes(rule.mode))
      throw new Error("Invalid territorial mode");
    if (
      !Array.isArray(rule.countries) ||
      !rule.countries.length ||
      rule.countries.some((c) => !countryCodes.has(c)) ||
      new Set(rule.countries).size !== rule.countries.length
    )
      throw new Error("Explicit unique ISO countries required");
    if (!["legal", "licensing"].includes(rule.basis) || !rule.reason?.trim())
      throw new Error("Documented legal or licensing basis required");
    let evidence;
    try {
      evidence = new URL(rule.evidenceUrl);
    } catch {}
    if (
      !evidence ||
      evidence.protocol !== "https:" ||
      evidence.username ||
      evidence.password
    )
      throw new Error(
        "Public HTTPS evidence required; never commit confidential contracts",
      );
    if (
      rule.status === "approved" &&
      (!rule.reviewReference?.trim() ||
        !rule.approvalReference?.trim() ||
        !Number.isFinite(Date.parse(rule.reviewedAt)) ||
        !Number.isFinite(Date.parse(rule.reviewBy)) ||
        Date.parse(rule.reviewBy) <= Date.parse(rule.reviewedAt))
    )
      throw new Error(
        "Approved rules require legal review, owner approval and review dates",
      );
  }
  return policy;
}

// For a future private server-side delivery path only. Country must come from
// trusted request.cf.country, never preferences, request headers or query input.
export function geographicDecision(
  policy,
  sourceId,
  country,
  now = Date.now(),
) {
  const rules = policy.rules.filter(
    (r) => r.sourceId === sourceId && r.status === "approved",
  );
  if (!rules.length) return { allowed: true, reason: "no-applicable-rule" };
  if (
    rules.some(
      (r) => Date.parse(r.reviewBy) <= now || Date.parse(r.reviewedAt) > now,
    )
  )
    return { allowed: false, reason: "review-required" };
  if (!countryCodes.has(country))
    return { allowed: false, reason: "country-unknown" };
  const denied = rules.some((r) =>
    r.mode === "allow"
      ? !r.countries.includes(country)
      : r.countries.includes(country),
  );
  return {
    allowed: !denied,
    reason: denied ? "documented-restriction" : "within-territory",
  };
}

// Public Git history and static snapshots are globally accessible. A browser
// filter cannot enforce territory. Stop BEFORE retrieval/writing/build delivery
// until a separately reviewed private origin can enforce an approved rule.
export function assertPublicDistribution(policy, sourceIds) {
  validateDistributionPolicy(policy, sourceIds);
  const active = policy.rules.filter((r) => r.status === "approved");
  if (active.length)
    throw new Error(
      "Territorial policy requires private delivery; public snapshot publication refused: " +
        active.map((r) => r.id).join(", "),
    );
}
