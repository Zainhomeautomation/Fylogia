import { useState } from "react";
import { normalizeInterestSearch } from "./interest-taxonomy";
import {
  ArrowRight,
  BookOpen,
  Search,
  Shirt,
  Watch,
  Gem,
  Leaf,
  House,
  Cpu,
  Compass,
  Globe,
  Microscope,
  Check,
  Plus,
} from "lucide-react";
import {
  interestGroups,
  sources,
  subcategories,
  type Article,
} from "./catalog";
export function CategoryBrowser({
  articles,
  onSelect,
  onMagazines,
  interests,
  onToggleInterest,
}: {
  articles: Article[];
  interests: string[];
  onToggleInterest: (category: string) => void;
  onSelect: (category: string) => void;
  onMagazines: (category: string) => void;
}) {
  const [query, setQuery] = useState("");
  const matches = (category: string) =>
    normalizeInterestSearch(
      `${category} ${(subcategories[category] || []).join(" ")}`,
    ).includes(normalizeInterestSearch(query.trim()));

  return (
    <>
      <p className="section-intro">
        Follow your curiosity. Explore subjects, then choose the publications
        you love in My Sources.
      </p>
      <label className="directory-search">
        <Search size={18} />
        <input
          aria-label="Find a category"
          placeholder="Search categories and interests"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {interestGroups.map((group) => {
        const visible = group.categories.filter(matches);
        return visible.length ? (
          <section className="category-group" key={group.name}>
            <h2>{group.name}</h2>
            <div className="category-grid">
              {visible.map((category) => (
                <article className="category-tile" key={category}>
                  <button onClick={() => onSelect(category)}>
                    {category.includes("Fashion") ? (
                      <Shirt size={23} aria-hidden="true" />
                    ) : category.includes("Watches") ? (
                      <Watch size={23} aria-hidden="true" />
                    ) : category.includes("Luxury") ? (
                      <Gem size={23} aria-hidden="true" />
                    ) : category.includes("Nature") ? (
                      <Leaf size={23} aria-hidden="true" />
                    ) : category.includes("Garden") ? (
                      <House size={23} aria-hidden="true" />
                    ) : group.name.includes("Technology") ? (
                      <Cpu size={23} aria-hidden="true" />
                    ) : group.name.includes("Science") ? (
                      <Microscope size={23} aria-hidden="true" />
                    ) : group.name.includes("World") ? (
                      <Globe size={23} aria-hidden="true" />
                    ) : (
                      <Compass size={23} aria-hidden="true" />
                    )}
                    <h2 id={`interest-${category.replace(/[^a-z0-9]/gi, "-")}`}>
                      {category}
                    </h2>
                    <small>
                      {
                        articles.filter((a) => a.categories.includes(category))
                          .length
                      }{" "}
                      stories ·{" "}
                      {
                        sources.filter((s) => s.categories.includes(category))
                          .length
                      }{" "}
                      sources <ArrowRight size={15} />
                    </small>
                  </button>
                  <button
                    className="text-button"
                    aria-label={
                      interests.includes(category)
                        ? "Unfollow interest"
                        : "Follow interest"
                    }
                    aria-pressed={interests.includes(category)}
                    aria-describedby={`interest-${category.replace(/[^a-z0-9]/gi, "-")}`}
                    title={`${interests.includes(category) ? "Unfollow" : "Follow"} ${category}`}
                    onClick={() => onToggleInterest(category)}
                  >
                    {interests.includes(category) ? (
                      <Check size={15} />
                    ) : (
                      <Plus size={15} />
                    )}
                    {interests.includes(category)
                      ? "Following"
                      : "Follow interest"}
                  </button>
                  <button
                    className="text-button"
                    onClick={() => onMagazines(category)}
                  >
                    <BookOpen size={15} /> Magazines & publications
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null;
      })}
      {!interestGroups.some((group) => group.categories.some(matches)) && (
        <p role="status">
          No matching categories. Try fashion, interiors, or science.
        </p>
      )}
    </>
  );
}
