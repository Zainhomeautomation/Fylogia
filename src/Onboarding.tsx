import { useState } from "react";
import { ArrowRight, Check, ArrowLeft, BookOpen } from "lucide-react";
import { Sources } from "./Sources";
import {
  categories,
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
}: {
  onArticles: (a: Article[]) => void;
  initial: Preferences;
  statuses: FeedStatus[];
  onComplete: (p: Preferences) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState(0);
  const toggle = (key: "interests" | "topics" | "sourceIds", item: string) =>
    setDraft((p) => ({
      ...p,
      [key]: p[key].includes(item)
        ? p[key].filter((i) => i !== item)
        : [...p[key], item],
    }));
  const recommended = [...sources, ...draft.customSources].filter(
    (s) =>
      s.categories.some((c) => draft.interests.includes(c)) &&
      (s.region === "Worldwide" || s.region === draft.region) &&
      statuses.find((x) => x.id === s.id)?.ok !== false,
  );
  function next() {
    if (step === 0)
      setDraft((p) => ({ ...p, sourceIds: recommended.map((s) => s.id) }));
    setStep((s) => s + 1);
  }
  return (
    <main className="onboarding">
      <div className="onboard-brand">
        Fylogia<span>Read your world.</span>
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
              <div className="interest-grid">
                {categories.map((c) => (
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
                  These topics help prioritize relevant headlines.
                </p>
                <div className="topics">
                  {draft.interests
                    .flatMap((c) => subcategories[c] || [])
                    .map((t) => (
                      <button
                        className={
                          "choice " +
                          (draft.topics.includes(t) ? "selected" : "")
                        }
                        aria-pressed={draft.topics.includes(t)}
                        key={t}
                        onClick={() => toggle("topics", t)}
                      >
                        {t}
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
