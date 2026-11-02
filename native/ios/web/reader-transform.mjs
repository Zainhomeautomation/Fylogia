/** Native-only adapters fail closed against the protected website source. */
export function adaptiveReaders(code, id) {
  if (id.endsWith("/src/StoryCard.tsx")) {
    const from = 'loading={lead || magazinePage ? "eager" : "lazy"}';
    if (!code.includes(from))
      throw Error("Native story image loading anchor missing");
    return code.replace(
      from,
      'loading={lead || (magazinePage && window.innerWidth - 24 >= 680 * Math.max(1, Number(document.documentElement.dataset.nativeTextScale || 1)) && window.innerWidth >= window.innerHeight * .9) ? "eager" : "lazy"}',
    );
  }

  if (!id.endsWith("/src/Reader.tsx") && !id.endsWith("/src/PdfReader.tsx"))
    return code;
  const replace = (from, to) => {
    if (!code.includes(from))
      throw Error("Native reader anchor missing: " + from);
    code = code.replace(from, to);
  };
  if (id.endsWith("/src/Reader.tsx")) {
    code =
      'import { useNativeWide, nativeTextAnchor, nativeLayoutChanging, useNativeReadingScale } from "./native-reading";\n' +
      code;
    replace(
      'const reading = article.full ? prefs.reading : "scroll";',
      'const nativeScale = useNativeReadingScale();\n  const nativeWide = useNativeWide(Math.max(340, prefs.fontSize * 18));\n  const reading = article.full && nativeWide ? "pages" : "scroll";',
    );
    replace(
      "      anchor.current = null;\n      setWidth(w);",
      `      const nativeLocation = anchor.current?.startContainer.isConnected ? anchor.current.getBoundingClientRect() : null;
      measuring.current = false;
      setWidth(w);`,
    );
    replace(
      `      viewport.current.scrollTop =
        position.current *`,
      `      viewport.current.scrollTop = nativeLocation
        ? viewport.current.scrollTop + nativeLocation.top - viewport.current.getBoundingClientRect().top
        : position.current *`,
    );
    replace(
      'if (reading !== "scroll") return;',
      'if (reading !== "scroll" || nativeLayoutChanging()) return;',
    );
    replace(
      "          const element = event.currentTarget;",
      `          const element = event.currentTarget;
          if (content.current && !measuring.current) anchor.current = nativeTextAnchor(element, content.current);`,
    );
    replace(
      'if (reading !== "pages" || measuring.current) return;',
      'if (reading !== "pages" || measuring.current || count <= 1) return;',
    );
    replace(
      "fontSize: prefs.fontSize,",
      "fontSize: prefs.fontSize * nativeScale,",
    );
    replace(
      "[reading, prefs.fontSize, html]",
      "[reading, prefs.fontSize, nativeScale, html]",
    );
    replace(
      'reading === "pages" ? spread : article.full ? undefined : 1,',
      'reading === "pages" ? spread : 1,',
    );
    replace(
      `onClick={() =>
                onPrefs({
                  reading: reading === "pages" ? "scroll" : "pages",
                })
              }`,
      'disabled title="Reading mode adapts to the available window: scrolling when narrow, facing pages when wide"',
    );
    replace(
      'reading === "pages" ? "Switch to scrolling" : "Switch to pages"',
      'reading === "pages" ? "Adaptive facing pages" : "Adaptive scrolling"',
    );
    replace(
      '<span>{reading === "pages" ? "Scroll" : "Pages"}</span>',
      '<span>{reading === "pages" ? "Facing pages" : "Scrolling"}</span>',
    );
  } else {
    code =
      'import { useNativeWide } from "./native-reading";\nimport { NativePdfStream } from "./native-pdf-stream";\n' +
      code;
    replace(
      "  const publicMagazine =",
      "  const nativeWide = useNativeWide(370);\n  const nativeFlow = !nativeWide;\n  const publicMagazine =",
    );
    replace(
      "ratio >= 0.85 && (size.height - 40) / ratio >= 280",
      "nativeWide && ratio >= 0.85 && (size.height - 40) / ratio >= 280",
    );
    replace(
      "Math.min((size.width - 36) / spread, (size.height - 40) / ratio, 900)",
      "nativeFlow ? Math.min(size.width - 36, 900) : Math.min((size.width - 36) / spread, (size.height - 40) / ratio, 900)",
    );
    replace("    zoom === 1,", "    !nativeFlow && zoom === 1,");
    replace(
      "      if (next === pageValue.current) return;",
      `      if (next === pageValue.current) return;
      if (nativeFlow) {
        const target=surface.current?.querySelector<HTMLElement>('[data-native-pdf-page="' + next + '"]');
        if(target) surface.current!.scrollTop += target.getBoundingClientRect().top - surface.current!.getBoundingClientRect().top;
        return;
      }`,
    );
    replace("[applyPage, curl],", "[applyPage, curl, nativeFlow],");
    code = code.replaceAll('".pdf-pages"', '".pdf-pages, .native-pdf-stream"');
    replace(
      'className="pdf-spread"',
      'className={`pdf-spread ${nativeFlow ? "native-pdf-flow" : ""}`}',
    );
    replace(
      "        ) : pdf ? (",
      `        ) : pdf && nativeFlow ? (
          <NativePdfStream total={pdf.numPages} page={page} width={pageWidth * zoom} ratio={ratio}
            onPage={(num)=>{pageValue.current=num;setPage(num);}}
            renderPage={(num,w)=><Canvas pdf={pdf} num={num} width={w} maxHeight={100000}/>}/>
        ) : pdf ? (`,
    );
    replace(
      "{pdf && pdf.numPages > spread && zoom === 1 && (",
      "{!nativeFlow && pdf && pdf.numPages > spread && zoom === 1 && (",
    );
    replace("!pdf || zoom !== 1", "!pdf || nativeFlow || zoom !== 1");
    replace(
      "[pdf, page, spread, pageWidth, size.height, zoom]",
      "[pdf, page, spread, pageWidth, size.height, zoom, nativeFlow]",
    );
  }
  return code;
}
