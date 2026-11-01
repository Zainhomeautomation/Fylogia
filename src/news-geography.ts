import { countryRegion, broadRegion } from "./countries.ts";
import { euCountries, newsRegion } from "./news-regions.ts";
import type { Article, Source } from "./catalog.ts";
// Only national sections or explicit publisher tags qualify as local. General
// feeds from a country's publishers remain available without being called local.
const national = new Map<string, string>([
  ["oman-observer", "OM"],
  ["hindu", "IN"],
  ["rnz-national", "NZ"],
  ["rte-ireland", "IE"],
  ["bbc-uk-national", "GB"],
  ["cyprus-mail", "CY"],
  ["dawn-pakistan", "PK"],
  ["cbc-canada", "CA"],
  ["npr-us-national", "US"],
  ["capital-kenya", "KE"],
  ["bmas-germany", "DE"],
]);
export function localSourceIds(country?: string) {
  return [...national].filter(([, code]) => code === country).map(([id]) => id);
}
export function articleCountries(
  a: Pick<Article, "sourceId" | "alsoIn" | "feedContexts" | "publisherTags">,
) {
  return [
    ...new Set(
      [
        a.sourceId,
        ...(a.alsoIn || []),
        ...(a.feedContexts || []).map((c) => c.sourceId),
      ]
        .filter(
          (id) =>
            id !== "cyprus-mail" ||
            a.publisherTags?.some((t) => /^cyprus news$/i.test(t)),
        )
        .filter(
          (id) =>
            id !== "capital-kenya" ||
            a.publisherTags?.some((t) =>
              /^(national news|county news)$/i.test(t),
            ),
        )
        .flatMap((id) => national.get(id) || []),
    ),
  ];
}
export function localArticle(a: Article, country?: string) {
  return !!country && articleCountries(a).includes(country);
}
function regionMatches(
  countries: string[],
  regions: string[],
  selection: string,
) {
  const target = newsRegion(selection);
  if (target === "Worldwide") return true;
  if (target === "EU") return countries.some((code) => euCountries.has(code));
  if (target === "India")
    return countries.includes("IN") || regions.includes("India");
  return (
    countries.some((code) => countryRegion(code) === target) ||
    regions.some((r) => broadRegion(r) === target)
  );
}
export function regionalArticle(a: Article, region = "Worldwide") {
  return regionMatches(
    articleCountries(a),
    [a.region, ...(a.feedContexts || []).map((c) => c.region)],
    region,
  );
}
export function sourceInRegion(source: Source, region: string) {
  const country = national.get(source.id);
  return regionMatches(country ? [country] : [], [source.region], region);
}
export function worldArticle(a: Article) {
  return !articleCountries(a).length && a.categories.includes("World News");
}
