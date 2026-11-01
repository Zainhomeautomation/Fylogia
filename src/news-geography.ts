import { localSources } from "./local-sources.ts";
import { broadRegion, countryRegion } from "./countries.ts";
import type { Article } from "./catalog.ts";
// These are country-focused news feeds, not a publisher-headquarters guess.
const countrySources = new Map<string, string[]>([
  ["oman-observer", ["OM"]],
  ["times-of-oman", ["OM"]],
  ["hindu", ["IN"]],
  ...localSources.map((s) => [s.id, s.countries || []] as [string, string[]]),
]);
export function articleCountries(a: Article) {
  return [
    ...new Set(
      [
        a.sourceId,
        ...(a.alsoIn || []),
        ...(a.feedContexts || []).map((c) => c.sourceId),
      ].flatMap((id) => countrySources.get(id) || []),
    ),
  ];
}
export function localArticle(a: Article, country?: string) {
  return !!country && articleCountries(a).includes(country);
}
export function regionalArticle(
  a: Article,
  country?: string,
  region = "Worldwide",
) {
  const target = country ? countryRegion(country) : broadRegion(region);
  if (target === "Worldwide") return false;
  const countries = articleCountries(a);
  return (
    countries.some(
      (code) => code !== country && countryRegion(code) === target,
    ) ||
    (!countries.length &&
      [a.region, ...(a.feedContexts || []).map((c) => c.region)].some(
        (r) => broadRegion(r) === target,
      ))
  );
}
export function preferredCoverage(a: Article, country?: string) {
  return (
    !country ||
    !articleCountries(a).length ||
    localArticle(a, country) ||
    regionalArticle(a, country)
  );
}
export function worldArticle(a: Article) {
  return !articleCountries(a).length && a.categories.includes("World News");
}
