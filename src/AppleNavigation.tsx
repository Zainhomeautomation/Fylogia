import {
  appleSections,
  appleSection,
  type AppleSelection,
} from "./apple-taxonomy";
const tabs = [
  ["all", "All Apple"],
  ["iphone", "iPhone"],
  ["ipad", "iPad"],
  ["mac", "Mac"],
  ["watch", "Watch"],
  ["home", "TV & Home"],
  ["audio", "AirPods"],
  ["vision", "Vision"],
  ["software", "Software"],
  ["services", "Services"],
  ["more", "More"],
] as const;
export function AppleNavigation({
  value,
  onChange,
  onFollow,
  following = false,
  onMagazines,
  onReset,
}: {
  value: AppleSelection;
  onChange: (v: AppleSelection) => void;
  onFollow?: () => void;
  following?: boolean;
  onMagazines?: () => void;
  onReset?: () => void;
}) {
  const selected = appleSection(value),
    group = selected?.group || (value === "more" ? "company" : value);
  const groupSelected = ["software", "services", "company"].includes(group);
  return (
    <section className="apple-navigation" aria-label="Apple coverage">
      <nav className="filter-tabs" aria-label="Apple navigation">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={
              value === id ||
              (id === "more" && selected?.group === "company") ||
              id === selected?.group
            }
            className={
              value === id ||
              id === group ||
              (id === "more" && group === "company")
                ? "selected"
                : ""
            }
            onClick={() => onChange(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {groupSelected && (
        <nav
          className="filter-tabs apple-subnavigation"
          aria-label="Apple subcategories"
        >
          {appleSections
            .filter((s) => s.group === group)
            .map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={value === s.id}
                className={value === s.id ? "selected" : ""}
                onClick={() => onChange(s.id)}
              >
                {s.name}
              </button>
            ))}
        </nav>
      )}
      <div className="sports-actions">
        <label>
          <span className="apple-selector-label">Apple section</span>{" "}
          <select
            aria-label="Choose an Apple section"
            value={value}
            onChange={(e) => onChange(e.target.value as AppleSelection)}
          >
            <option value="all">All Apple</option>
            {["products", "software", "services", "company"].map((g) => (
              <optgroup
                key={g}
                label={
                  {
                    products: "Products",
                    software: "Software",
                    services: "Services",
                    company: "Company & innovation",
                  }[g]
                }
              >
                {g !== "products" && (
                  <option value={g === "company" ? "more" : g}>
                    All {g === "company" ? "company & innovation" : g}
                  </option>
                )}
                {appleSections
                  .filter((s) => s.group === g)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        {selected && onFollow && (
          <button
            className="secondary apple-follow"
            aria-pressed={following}
            onClick={onFollow}
          >
            {following ? "Following" : "Follow"} {selected.name}
          </button>
        )}
        {onMagazines && (
          <button className="text-button" onClick={onMagazines}>
            Apple publications →
          </button>
        )}
        {value === "news-plus" && (
          <a
            className="text-button"
            href="https://www.apple.com/apple-news/"
            target="_blank"
            rel="noreferrer"
          >
            About Apple News+ ↗
          </a>
        )}
        {value !== "all" && onReset && (
          <button
            className="text-button"
            aria-label="Reset Apple filters"
            onClick={onReset}
          >
            Reset filters
          </button>
        )}
      </div>
      {selected && (
        <>
          <p className="quiet sports-detail apple-detail-wide">
            {selected.detail}
          </p>
          <details className="apple-detail-compact">
            <summary>Coverage details</summary>
            <p className="quiet sports-detail">{selected.detail}</p>
          </details>
        </>
      )}
    </section>
  );
}
