import {
  countries,
  countryName,
  countryRegion,
  suggestedCountry,
} from "./countries";
import { sources, type Preferences } from "./catalog";
export function CountryPreference({
  prefs,
  onChange,
  onFollow,
}: {
  prefs: Preferences;
  onChange: (country?: string) => void;
  onFollow: (ids: string[]) => void;
}) {
  const local = sources.filter(
    (s) =>
      s.countries?.includes(prefs.country || "") ||
      (prefs.country === "OM" &&
        ["oman-observer", "times-of-oman"].includes(s.id)),
  );
  const suggestion = suggestedCountry(navigator.languages);
  return (
    <div className="country-preference">
      <label className="field">
        Preferred country
        <select
          aria-label="Preferred country"
          value={prefs.country || ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        >
          <option value="">Worldwide / no country preference</option>
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <p className="quiet">
        {prefs.country
          ? `${countryName(prefs.country)} · ${countryRegion(prefs.country)}. `
          : "Choose any country. "}
        Your selection stays the same when you travel. No GPS is used.
      </p>
      {suggestion && (
        <button className="text-button" onClick={() => onChange(suggestion)}>
          Use device-locale suggestion: {countryName(suggestion)}
        </button>
      )}
      {prefs.country &&
        (local.length ? (
          <>
            <p className="quiet">
              {local.length} country-focused feeds available. Follow them to
              include local news in For You.
            </p>
            <button
              className="secondary"
              onClick={() => onFollow(local.map((s) => s.id))}
            >
              Follow recommended local sources
            </button>
          </>
        ) : (
          <p className="quiet">
            No verified country-focused feed is available here yet. Regional and
            World News remain available; you can add a trusted custom feed in My
            Sources.
          </p>
        ))}
    </div>
  );
}
