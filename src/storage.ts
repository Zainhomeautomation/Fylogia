// Keep the original storage namespace so the rebrand preserves existing libraries.
import { useCallback, useSyncExternalStore } from "react";
import {
  getLibraryValue,
  getPersistenceStatus,
  setLibraryValue,
  subscribeLibrary,
} from "./local-library";
export function useStored<T>(key: string, initial: T) {
  const value = useSyncExternalStore(subscribeLibrary, () =>
    getLibraryValue(key, initial),
  );
  const status = useSyncExternalStore(subscribeLibrary, getPersistenceStatus);
  const update = useCallback(
    (next: T | ((value: T) => T)) => setLibraryValue(key, next),
    [key],
  );
  return [value, update, status.error] as const;
}
export const useLocalProfile = () =>
  useSyncExternalStore(subscribeLibrary, getPersistenceStatus);
export function safeUrl(value: string) {
  try {
    const url = new URL(value.replace(/&(?:amp|#0*38|#x0*26);/gi, "&"));
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
export function dateLabel(value: string) {
  return value
    ? new Date(value).toLocaleDateString("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date not supplied";
}
