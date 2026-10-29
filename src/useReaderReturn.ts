import { useEffect, useRef } from "react";

// Preserve and restore exact prior accessibility state, including nested dialogs.
export function isolateReaderLayer(layer: HTMLElement, boundary?: HTMLElement) {
  const previous: {
    element: HTMLElement;
    inert: boolean;
    hidden: string | null;
  }[] = [];
  let current: HTMLElement | null = layer;
  while (
    current?.parentElement &&
    current.id !== "root" &&
    current !== boundary
  ) {
    for (const sibling of current.parentElement.children) {
      if (sibling === current || !(sibling instanceof HTMLElement)) continue;
      previous.push({
        element: sibling,
        inert: sibling.inert,
        hidden: sibling.getAttribute("aria-hidden"),
      });
      sibling.inert = true;
      sibling.setAttribute("aria-hidden", "true");
    }
    current = current.parentElement;
  }
  return () => {
    for (const { element, inert, hidden } of previous) {
      element.inert = inert;
      if (hidden === null) element.removeAttribute("aria-hidden");
      else element.setAttribute("aria-hidden", hidden);
    }
  };
}
// Readers overlay the existing section; never rebuild its filters or library.
export function useReaderReturn(onHome: () => void) {
  const home = useRef(false);
  useEffect(() => {
    const x = window.scrollX,
      y = window.scrollY;
    const previous = document.activeElement as HTMLElement | null;
    const layer = document.querySelector<HTMLElement>(".reader");
    const restore = layer ? isolateReaderLayer(layer) : () => {};
    return () => {
      restore();
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
