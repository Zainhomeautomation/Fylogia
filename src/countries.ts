// ISO 3166-1 codes; display names come from the browser's English locale data.
const codes =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );
export const countryCodes = new Set(codes);
const names = new Intl.DisplayNames(["en"], { type: "region" });
export function countryName(code: string) {
  return countryCodes.has(code) ? names.of(code) || code : "Worldwide";
}
export const countries = codes
  .map((code) => ({ code, name: countryName(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));
const groups: Record<string, string> = {
  "Middle East": "AE BH EG IL IQ IR JO KW LB OM PS QA SA SY TR YE",
  Europe:
    "AD AL AM AT AX AZ BA BE BG BY CH CY CZ DE DK EE ES FI FO FR GB GE GG GI GR HR HU IE IM IS IT JE LI LT LU LV MC MD ME MK MT NL NO PL PT RO RS RU SE SI SJ SK SM UA VA",
  Africa:
    "AO BF BI BJ BW CD CF CG CI CM CV DJ DZ EH ER ET GA GH GM GN GQ GW KE KM LR LS LY MA MG ML MR MU MW MZ NA NE NG RE RW SC SD SH SL SN SO SS ST SZ TD TG TN TZ UG YT ZA ZM ZW",
  "North America": "BM CA GL PM US",
  "Latin America":
    "AG AI AR AW BB BL BO BQ BR BS BZ CL CO CR CU CW DM DO EC FK GD GF GP GS GT GY HN HT JM KN KY LC MF MQ MS MX NI PA PE PR PY SR SV SX TC TT UY VC VE VG VI",
  Oceania:
    "AS AU CC CK CX FJ FM GU HM KI MH MP NC NF NR NU NZ PF PG PN PW SB TK TL TO TV UM VU WF WS",
  Asia: "AF BD BN BT CN HK ID IN IO JP KG KH KP KR KZ LA LK MM MN MO MV MY NP PH PK SG TH TJ TM TW UZ VN",
};
const membership = new Map(
  Object.entries(groups).flatMap(([region, list]) =>
    list.split(" ").map((code) => [code, region] as const),
  ),
);
export function countryRegion(code?: string) {
  return code ? membership.get(code) || "Worldwide" : "Worldwide";
}
export function broadRegion(region: string) {
  return region === "United States"
    ? "North America"
    : region === "India"
      ? "Asia"
      : region;
}
export function suggestedCountry(languages: readonly string[]) {
  for (const language of languages) {
    try {
      const code = new Intl.Locale(language).region;
      if (code && countryCodes.has(code)) return code;
    } catch {
      /* Ignore malformed device locales. */
    }
  }
  return undefined;
}
