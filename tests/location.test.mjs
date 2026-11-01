import test from "node:test";
import assert from "node:assert/strict";
import { requestCountry, locationResponse } from "../server/location.mjs";
import { newsRegion, newsRegions, euCountries } from "../src/news-regions.ts";
import {
  localArticle,
  regionalArticle,
  localSourceIds,
} from "../src/news-geography.ts";
function request(country, headers = {}) {
  const r = new Request("https://fylogia.com/api/location", { headers });
  if (country !== undefined)
    Object.defineProperty(r, "cf", {
      value: {
        country,
        latitude: "secret",
        longitude: "secret",
        city: "secret",
      },
    });
  return r;
}
for (const country of ["OM", "CY", "DE", "US"])
  test(`trusted Cloudflare country ${country} is returned without identity or precise location`, async () => {
    const response = locationResponse(
      request(country, {
        "CF-Connecting-IP": "192.0.2.20",
        Cookie: "private=secret",
      }),
    );
    assert.deepEqual(await response.json(), { country });
    assert.match(response.headers.get("Cache-Control"), /no-store/);
    assert.equal(response.headers.get("Set-Cookie"), null);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
  });
test("unknown country falls back safely and client headers/query cannot override Cloudflare", async () => {
  for (const c of [undefined, null, "XX", "T1", "ZZ", "invalid", "us"])
    assert.deepEqual(
      await locationResponse(request(c, { "CF-IPCountry": "OM" })).json(),
      { country: null },
    );
  assert.equal(requestCountry(request("CY", { "CF-IPCountry": "US" })), "CY");
  const r = new Request("https://fylogia.com/api/location?country=OM", {
    headers: { "CF-IPCountry": "OM", "X-Country": "OM" },
  });
  assert.equal(requestCountry(r), undefined);
  assert.equal(
    locationResponse(new Request(r, { method: "POST" })).status,
    405,
  );
  assert.equal(
    await locationResponse(new Request(r, { method: "HEAD" })).text(),
    "",
  );
});
test("regional preferences are six independent editorial choices, EU excludes UK and Worldwide includes all", () => {
  assert.deepEqual(
    [...newsRegions],
    ["Worldwide", "Middle East", "EU", "North America", "Asia", "India"],
  );
  assert.equal(euCountries.size, 27);
  assert.equal(newsRegion("Europe"), "EU");
  assert.equal(newsRegion("United States"), "North America");
  assert.equal(newsRegion("unrecognised"), "Worldwide");
  const a = (sourceId, region = "Worldwide", publisherTags) => ({
    sourceId,
    region,
    categories: ["World News"],
    publisherTags,
  });
  assert.ok(localArticle(a("oman-observer"), "OM"));
  assert.ok(localArticle(a("bmas-germany", "Europe"), "DE"));
  assert.ok(localArticle(a("cyprus-mail", "Europe", ["Cyprus News"]), "CY"));
  assert.ok(!localArticle(a("times-of-oman", "Middle East"), "OM"));
  assert.ok(!localArticle(a("cyprus-mail", "Europe", ["International"]), "CY"));
  assert.ok(!localArticle(a("abc-australia-national", "Oceania"), "AU"));
  assert.ok(regionalArticle(a("bmas-germany", "Europe"), "EU"));
  assert.ok(!regionalArticle(a("bbc-uk-national", "Europe"), "EU"));
  assert.ok(
    regionalArticle(a("npr-us-national", "United States"), "North America"),
  );
  assert.ok(regionalArticle(a("hindu", "India"), "Asia"));
  assert.ok(regionalArticle(a("hindu", "India"), "India"));
  assert.ok(
    regionalArticle(a("npr-us-national", "United States"), "Worldwide"),
  );
  assert.deepEqual(localSourceIds("OM"), ["oman-observer"]);
  assert.ok(localSourceIds("DE").includes("bmas-germany"));
  assert.deepEqual(localSourceIds("AQ"), []);
});
