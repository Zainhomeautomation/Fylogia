import { useEffect, useRef, useState } from "react";
import { countryCodes } from "./countries";

/** Ephemeral country for Local News only; never enters the saved/cloud library. */
export function useLocalCountry(enabled: boolean, paused = false) {
  const [location, setLocation] = useState<{
    country?: string;
    loading: boolean;
  }>({ loading: false });
  const pausedRef = useRef(paused);
  const refreshRef = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    if (!enabled) return;
    let active = true,
      checked = -Infinity,
      controller: AbortController | undefined;
    const refresh = async () => {
      if (
        pausedRef.current ||
        document.hidden ||
        !navigator.onLine ||
        performance.now() - checked < 60000
      )
        return;
      checked = performance.now();
      controller?.abort();
      const request = (controller = new AbortController());
      const timeout = setTimeout(() => request.abort(), 8000);
      setLocation((previous) => ({ ...previous, loading: true }));
      try {
        const response = await fetch(
          import.meta.env.BASE_URL + "api/location",
          {
            credentials: "omit",
            cache: "no-store",
            signal: request.signal,
          },
        );
        if (!response.ok) throw new Error("Country unavailable");
        const { country } = await response.json();
        if (active && !request.signal.aborted)
          setLocation({
            country: countryCodes.has(country) ? country : undefined,
            loading: false,
          });
      } catch {
        if (active)
          setLocation((previous) =>
            navigator.onLine
              ? { loading: false }
              : { ...previous, loading: false },
          );
      } finally {
        clearTimeout(timeout);
      }
    };
    const offline = () => {
      controller?.abort();
      checked = -Infinity;
      setLocation((previous) => ({ ...previous, loading: false }));
    };
    const update = () => void refresh();
    refreshRef.current = update;
    update();
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    window.addEventListener("online", update);
    window.addEventListener("offline", offline);
    return () => {
      active = false;
      refreshRef.current = undefined;
      controller?.abort();
      setLocation((previous) =>
        previous.loading ? { ...previous, loading: false } : previous,
      );
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("focus", update);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", offline);
    };
  }, [enabled]);
  useEffect(() => {
    if (!paused) refreshRef.current?.();
  }, [paused]);
  return location;
}
