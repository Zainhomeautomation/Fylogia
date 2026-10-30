import { sportLabel, sportForTopic } from "./sports-taxonomy";
import { normalizeInterestSearch } from "./interest-taxonomy";
import { recommendSources } from "./source-utils";
import { useState } from "react";
import { ArrowRight, Check, ArrowLeft, BookOpen } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { Sources } from "./Sources";
import {
  interestGroups,
  regions,
  sources,
  subcategories,
  type Preferences,
  type FeedStatus,
  type Article,
} from "./catalog";
export function Onboarding({
  initial,
  statuses,
  onComplete,
  onArticles,
  onSourcesNeeded,
}: {
  onArticles: (a: Article[]) => void;
  onSourcesNeeded?: () => void;
  initial: Preferences;
  statuses: FeedStatus[];
  onComplete: (p: Preferences) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState(0);
  const [interestSearch, setInterestSearch] = useState("");
  const sameTopic = (a: string, b: string) =>
    a === b ||
    (!!sportForTopic(a) && sportForTopic(a)?.id === sportForTopic(b)?.id);
  const topicSelected = (topic: string) =>
    draft.topics.some((value) => sameTopic(value, topic));
  const toggle = (key: "interests" | "topics" | "sourceIds", item: string) =>
    setDraft((p) => {
      const matches = (value: string) =>
        key === "topics" ? sameTopic(value, item) : value === item;
      return {
        ...p,
        [key]: p[key].some(matches)
          ? p[key].filter((value) => !matches(value))
          : [...p[key], item],
      };
    });
  const collection = [...sources, ...draft.customSources];
  const picks = recommendSources(collection, draft, statuses);
  const recommended = [
    ...picks,
    ...collection.filter(
      (s) =>
        draft.sourceIds.includes(s.id) && !picks.some((p) => p.id === s.id),
    ),
  ];
  function next() {
    if (step === 0) onSourcesNeeded?.();
    if (step === 0 && !initial.complete)
      setDraft((p) => ({
        ...p,
        sourceIds: [...new Set([...p.sourceIds, ...picks.map((s) => s.id)])],
      }));
    setStep((s) => s + 1);
  }
  return (
    <main className="onboarding">
      <div className="onboard-brand">
        <div className="onboard-brand-name">
          <BrandMark />
          Fylogia
        </div>
        <span>Read your world.</span>
      </div>
      <div className="onboard-layout">
        <aside>
          <BookOpen size={42} strokeWidth={1} />
          <h1>
            A little curiosity.
            <br />A world to discover.
          </h1>
          <p>Your interests. Your sources. Your own daily edition.</p>
          <p className="quiet">
            Free, open source, and yours.
            <br />
            No account. No ads. No algorithm to please.
          </p>
        </aside>
        <section className="onboard-panel">
          <div className="steps" aria-label={`Step ${step + 1} of 3`}>
            {["Your interests", "Your sources", "Your Fylogia"].map(
              (label, i) => (
                <span key={label} className={i <= step ? "active" : ""}>
                  {i < step ? <Check size={14} /> : i + 1} {label}
                </span>
              ),
            )}
          </div>
          {step === 0 ? (
            <>
              <h2>What draws you in?</h2>
              <p>Choose a few interests. You can change these anytime.</p>
              <label className="field">
                Find an interest
                <input
                  type="search"
                  value={interestSearch}
                  placeholder="Search interests or topics"
                  onChange={(e) => setInterestSearch(e.target.value)}
                />
              </label>
              {interestGroups.map((group) => {
                const matching = group.categories.filter((c) =>
                  normalizeInterestSearch(
                    c + " " + (subcategories[c] || []).join(" "),
                  ).includes(normalizeInterestSearch(interestSearch.trim())),
                );
                return matching.length ? (
                  <section
                    className="interest-group"
                    key={group.name}
                    aria-label={group.name}
                  >
                    <h3>{group.name}</h3>
                    <div className="interest-grid">
                      {matching.map((c) => (
                        <button
                          key={c}
                          className={
                            "choice " +
                            (draft.interests.includes(c) ? "selected" : "")
                          }
                          aria-pressed={draft.interests.includes(c)}
                          onClick={() => toggle("interests", c)}
                        >
                          {c}
                          {draft.interests.includes(c) && <Check size={15} />}
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null;
              })}
              {interestSearch &&
                !interestGroups.some((g) =>
                  g.categories.some((c) =>
                    normalizeInterestSearch(
                      c + " " + (subcategories[c] || []).join(" "),
                    ).includes(normalizeInterestSearch(interestSearch.trim())),
                  ),
                ) && (
                  <p role="status">No matching interests. Try another topic.</p>
                )}
              <label className="field">
                Regional news & politics
                <select
                  aria-label="Regional news & politics"
                  value={draft.region}
                  onChange={(e) =>
                    setDraft({ ...draft, region: e.target.value })
                  }
                >
                  {regions.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <details>
                <summary>Fine-tune your interests</summary>
                <p className="quiet">
                  Topics prioritize headlines. Selected sports also focus your
                  Sports stories.
                </p>
                <div className="topics">
                  {[
                    ...new Set(
                      draft.interests
                        .flatMap((c) => subcategories[c] || [])
                        .map((t) => sportForTopic(t)?.topic || t),
                    ),
                  ].map((t) => (
                    <button
                      className={
                        "choice " + (topicSelected(t) ? "selected" : "")
                      }
                      aria-pressed={topicSelected(t)}
                      key={t}
                      onClick={() => toggle("topics", t)}
                    >
                      {sportLabel(t)}
                    </button>
                  ))}
                </div>
              </details>
            </>
          ) : null}
          {step === 1 ? (
            <>
              <h2>Good reading starts here.</h2>
              <p>
                Recommended for your interests. Choose who joins your edition.
              </p>
              <div className="source-checks">
                {recommended.map((s) => (
                  <label key={s.id}>
                    <input
                      type="checkbox"
                      checked={draft.sourceIds.includes(s.id)}
                      onChange={() => toggle("sourceIds", s.id)}
                    />
                    <span>
                      <strong>{s.name}</strong>
                      <small>
                        {s.categories.join(" · ")}
                        {s.region !== "Worldwide" ? ` · ${s.region}` : ""}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
              {recommended.length === 0 && (
                <p>
                  No matching healthy feeds yet. Explore other interests or add
                  a custom feed after setup.
                </p>
              )}
              <p className="quiet">
                Publishers may provide previews rather than full articles.
              </p>
              <details>
                <summary>Add a custom RSS/Atom feed</summary>
                <Sources
                  customOnly
                  prefs={draft}
                  onPrefs={(p) => setDraft((v) => ({ ...v, ...p }))}
                  onArticles={onArticles}
                  statuses={statuses}
                />
              </details>
            </>
          ) : null}
          {step === 2 ? (
            <div className="ready">
              <BookOpen size={56} strokeWidth={1} />
              <h2>Make room for discovery.</h2>
              <p>
                Your Fylogia brings together {draft.sourceIds.length} sources,
                shaped around {draft.interests.length} interests.
              </p>
              <div className="ready-list">{draft.interests.join(" · ")}</div>
              <p className="quiet">
                Preferences, saved stories, and reading history stay in this
                browser. Each device has its own library.
              </p>
            </div>
          ) : null}
          <footer>
            {step > 0 ? (
              <button
                className="text-button"
                onClick={() => setStep((s) => s - 1)}
              >
                <ArrowLeft size={16} />
                Back
              </button>
            ) : (
              <span />
            )}
            <button
              className="primary"
              disabled={
                (step === 0 && !draft.interests.length) ||
                (step === 1 && !draft.sourceIds.length)
              }
              onClick={() =>
                step === 2 ? onComplete({ ...draft, complete: true }) : next()
              }
            >
              {step === 2 ? "Create My Fylogia" : "Continue"}
              <ArrowRight size={17} />
            </button>
          </footer>
        </section>
      </div>
    </main>
  );
}
