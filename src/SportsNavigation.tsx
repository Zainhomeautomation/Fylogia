import {
  sports,
  primarySports,
  sportForTopic,
  type SportSelection,
} from "./sports-taxonomy";
import { officialSportsSites } from "./sports-publications";
export function SportsNavigation({
  value,
  onChange,
  onFollow,
  following = false,
  onMagazines,
}: {
  value: SportSelection;
  onChange: (value: SportSelection) => void;
  onFollow?: () => void;
  following?: boolean;
  onMagazines?: () => void;
}) {
  const selected = sportForTopic(value);
  return (
    <section className="sports-navigation" aria-label="Sports coverage">
      <nav className="filter-tabs" aria-label="Sports navigation">
        {[
          { id: "all", name: "All Sports" },
          ...primarySports.map((s) => ({
            id: s.id,
            name:
              s.id === "football"
                ? "Football"
                : s.id === "motorsport"
                  ? "Motorsport"
                  : s.name,
          })),
          { id: "other", name: "Other Sports" },
        ].map((s) => (
          <button
            key={s.id}
            type="button"
            className={value === s.id ? "selected" : ""}
            aria-pressed={value === s.id}
            onClick={() => onChange(s.id as SportSelection)}
          >
            {s.name}
          </button>
        ))}
      </nav>
      <div className="sports-actions">
        <label>
          Choose a sport{" "}
          <select
            aria-label="Choose a sport"
            value={value}
            onChange={(e) => onChange(e.target.value as SportSelection)}
          >
            <option value="all">All Sports</option>
            <option value="other">Other Sports</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {selected && onFollow && (
          <button
            className="secondary"
            aria-pressed={following}
            onClick={onFollow}
          >
            {following ? "Following" : "Follow"} {selected.name}
          </button>
        )}
        {onMagazines && (
          <button className="text-button" onClick={onMagazines}>
            Magazines & publications →
          </button>
        )}
      </div>
      {selected && <p className="quiet sports-detail">{selected.detail}</p>}
      {selected && (
        <div
          className="sports-official-links"
          aria-label="Official sport websites"
        >
          {officialSportsSites
            .filter((p) => p.sports.includes(selected.id))
            .map((p) => (
              <a key={p.name} href={p.site} target="_blank" rel="noreferrer">
                {p.name} ↗
              </a>
            ))}
        </div>
      )}
    </section>
  );
}
