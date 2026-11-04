import { defaults, sources, type Preferences } from "./catalog";
import { getLibraryValue, setLibraryValue } from "./local-library";

export let firstReading = false;

// Run after the existing durable library has hydrated, before mounting App.
// Never replace a library or infer that an empty localStorage means a new user.
export function prepareNativeLaunch() {
  const preferences = getLibraryValue<Preferences>("preferences", defaults);
  if (preferences.complete) return;
  firstReading = true;
  setLibraryValue("preferences", {
    ...preferences,
    complete: true,
    sourceIds: preferences.sourceIds.length
      ? preferences.sourceIds
      : sources
          .filter(
            (source) =>
              source.region === "Worldwide" &&
              source.categories.includes("World News"),
          )
          .map((source) => source.id),
  });
}
