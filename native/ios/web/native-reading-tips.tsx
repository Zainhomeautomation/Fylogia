import { useEffect, useState } from "react";
import { firstReading } from "./native-launch";

const tutorialKey = "fylogia.native.reading-tips.v1";

const tips = [
  [
    "Make yourself comfortable",
    "Scroll vertically in narrow windows. In a wide window, drag a page from its outer edge to turn the magazine. Page buttons work too.",
  ],
  [
    "Keep a good story",
    "Use Save on a story to find it in Saved Articles. Download offline keeps permitted stories in your Offline Library.",
  ],
  [
    "Read your way",
    "Open Settings from the navigation menu to change text size, theme, paper, haptics and page-turn sound. Sound and haptics start off.",
  ],
  [
    "Choose your sources",
    "Open My Sources from the navigation menu to follow publications. For You learns from your reading and saved stories on this device.",
  ],
] as const;

export function NativeReadingTips() {
  const [step, setStep] = useState(() => {
    try {
      return firstReading && !localStorage.getItem(tutorialKey) ? 0 : -1;
    } catch {
      return firstReading ? 0 : -1;
    }
  });
  useEffect(() => {
    const open = () => setStep(0);
    window.addEventListener("fylogia-reading-tips", open);
    return () => window.removeEventListener("fylogia-reading-tips", open);
  }, []);
  const close = () => {
    try {
      localStorage.setItem(tutorialKey, "dismissed");
    } catch {
      // A storage failure must never prevent skipping the tutorial.
    }
    setStep(-1);
  };
  if (step < 0) return null;
  return (
    <aside className="native-reading-tips" aria-label="Reading tips">
      <div aria-live="polite" aria-atomic="true">
        <p className="quiet">
          Reading tip {step + 1} of {tips.length}
        </p>
        <h2>{tips[step][0]}</h2>
        <p>{tips[step][1]}</p>
      </div>
      <div className="native-tip-actions">
        <button onClick={close}>Skip tips</button>
        <button
          onClick={() =>
            step === tips.length - 1 ? close() : setStep(step + 1)
          }
        >
          {step === tips.length - 1 ? "Start reading" : "Next tip"}
        </button>
      </div>
    </aside>
  );
}
