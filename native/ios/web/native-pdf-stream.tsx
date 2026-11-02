import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

function LazyPdfPage({
  number,
  width,
  ratio,
  renderPage,
}: {
  number: number;
  width: number;
  ratio: number;
  renderPage: (n: number, w: number) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [aspect, setAspect] = useState(ratio);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => setActive(entries.some((e) => e.isIntersecting)),
      { root: node.closest(".pdf-spread"), rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (!active || !ref.current) return;
    const observer = new ResizeObserver(() => {
      const canvas = ref.current?.querySelector("canvas");
      if (canvas && canvas.clientHeight > 0)
        setAspect(canvas.clientHeight / width);
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [active, width]);
  return (
    <div
      ref={ref}
      data-native-pdf-page={number}
      style={{ width, minHeight: width * aspect }}
    >
      {active ? (
        renderPage(number, width)
      ) : (
        <div
          style={{ height: width * aspect }}
          aria-label={`Magazine page ${number} — scroll to load`}
        />
      )}
    </div>
  );
}

/** Keep page IDs while mounting only nearby PDF canvases, including local/offline PDFs. */
export function NativePdfStream({
  total,
  page,
  width,
  ratio,
  onPage,
  renderPage,
}: {
  total: number;
  page: number;
  width: number;
  ratio: number;
  onPage: (n: number) => void;
  renderPage: (n: number, w: number) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onPage);
  useLayoutEffect(() => {
    callback.current = onPage;
  }, [onPage]);
  const pageRef = useRef(page);
  useLayoutEffect(() => {
    pageRef.current = page;
  }, [page]);
  useLayoutEffect(() => {
    const node = ref.current,
      root = node?.closest<HTMLElement>(".pdf-spread");
    if (!node || !root) return;
    let frame = 0;
    const openingPage = pageRef.current;
    const opening = requestAnimationFrame(() => {
      const target = node.querySelector<HTMLElement>(
        `[data-native-pdf-page="${openingPage}"]`,
      );
      if (target) root.scrollTop = target.offsetTop - node.offsetTop;
    });
    const remember = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const top = root.getBoundingClientRect().top + 40;
        const visible = [
          ...node.querySelectorAll<HTMLElement>("[data-native-pdf-page]"),
        ].find((e) => e.getBoundingClientRect().bottom > top);
        if (visible) callback.current(Number(visible.dataset.nativePdfPage));
      });
    };
    root.addEventListener("scroll", remember, { passive: true });
    return () => {
      cancelAnimationFrame(opening);
      cancelAnimationFrame(frame);
      root.removeEventListener("scroll", remember);
    };
  }, [width]);
  return (
    <div
      ref={ref}
      className="native-pdf-stream"
      aria-label="Continuous magazine pages"
    >
      {Array.from({ length: total }, (_, i) => (
        <LazyPdfPage
          key={i + 1}
          number={i + 1}
          width={width}
          ratio={ratio}
          renderPage={renderPage}
        />
      ))}
    </div>
  );
}
