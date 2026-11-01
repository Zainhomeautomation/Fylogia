// Editorial regions are independent of current location and licensing territory.
export const newsRegions = [
  "Worldwide",
  "Middle East",
  "EU",
  "North America",
  "Asia",
  "India",
] as const;
export function newsRegion(value: string) {
  const legacy: Record<string, string> = {
    Europe: "EU",
    "United States": "North America",
  };
  const region = legacy[value] || value;
  return (newsRegions as readonly string[]).includes(region)
    ? region
    : "Worldwide";
}
// EU member list checked against the official EU country directory, 1 Nov 2026.
export const euCountries = new Set(
  "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(
    " ",
  ),
);
