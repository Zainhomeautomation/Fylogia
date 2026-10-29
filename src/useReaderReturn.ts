import { useEffect, useRef } from "react";

// Readers overlay the existing section; never rebuild its filters or library.
export function useReaderReturn(onHome: () => void) {
  const home = useRef(false);
  useEffect(() => {
    const x = window.scrollX,
      y = window.scrollY;
    const previous = document.activeElement as HTMLElement | null;
    return () => {
      requestAnimationFrame(() => {
        if (!home.current && previous?.isConnected)
          previous.focus({ preventScroll: true });
        window.scrollTo({
          left: home.current ? 0 : x,
          top: home.current ? 0 : y,
          behavior: "instant",
        });
      });
    };
  }, []);
  return () => {
    home.current = true;
    onHome();
  };
}
