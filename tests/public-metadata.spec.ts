import { test, expect } from "@playwright/test";

test("crawler policy is a plain-text resource rather than the SPA fallback", async ({
  request,
}) => {
  const response = await request.get("robots.txt");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");
  const text = await response.text();
  expect(text).toMatch(/^User-agent: \*\s*$/m);
  expect(text).toMatch(/^Allow: \/\s*$/m);
  expect(text).toMatch(/^Disallow: \/api\/\s*$/m);
  expect(text).not.toMatch(/<!doctype|<html|<script/i);
});
