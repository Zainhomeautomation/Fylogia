/** Native-only layout adaptation. Fail loudly if the protected source changes. */
export function readingSpace(code, id) {
  if (!id.endsWith("/src/App.tsx")) return code;
  const replace = (from, to) => {
    if (!code.includes(from))
      throw new Error("Golden reading-space anchor missing: " + from);
    code = code.replace(from, to);
  };
  replace(
    'newsSections.includes(view) && newsView === "pages" && !selecting;',
    "newsSections.includes(view) && !selecting;",
  );
  const stateStart = code.indexOf(
    "  const [newsView, setNewsView] = useState(() => {",
  );
  const stateEnd = code.indexOf(
    "  if (!prefs.complete || personalizing)",
    stateStart,
  );
  if (stateStart < 0 || stateEnd < 0 || stateEnd - stateStart > 700)
    throw Error("Native automatic feed preference anchor missing");
  code = code.slice(0, stateStart) + code.slice(stateEnd);
  const switchStart = code.indexOf(
    '<div className="feed-view-switch" aria-label="News presentation">',
  );
  const switchEnd = code.indexOf("</div>", switchStart);
  if (switchStart < 0 || switchEnd < 0 || switchEnd - switchStart > 1200)
    throw Error("Native automatic presentation control anchor missing");
  code =
    code.slice(0, switchStart) +
    '<p className="quiet">Adaptive reading: scroll in narrow windows, turn facing pages in wide windows.</p>' +
    code.slice(switchEnd + 6);
  replace(
    "export default function App() {",
    "export default function App() { const [nativeTools, setNativeTools] = useState(false);",
  );
  replace(
    'className={`main ${newsPages ? "news-pages-mode" : ""}`}',
    'className={`main ${newsPages ? "news-pages-mode" : ""} ${nativeTools ? "native-tools-open" : "native-tools-closed"}`}',
  );
  replace(
    '<div className="edition-bar">',
    `{newsPages && <div className="native-reading-toolbar" aria-label="Magazine controls"><span>{view === "home" ? "For You" : current.label}</span><button className="text-button" aria-expanded={nativeTools} onClick={() => {setNativeTools(!nativeTools); window.scrollTo({top:0,behavior:"instant"});}}>{nativeTools ? "Resume reading" : "Edition controls"}</button></div>}<div className="edition-bar">`,
  );
  return code;
}

/** Keep the same feed, story identities and library; adapt presentation only. */
export function adaptiveFeed(code, id) {
  if (!id.endsWith("/src/NewsFeed.tsx")) return code;
  const replace = (from, to) => {
    if (!code.includes(from))
      throw Error("Adaptive feed anchor missing: " + from);
    code = code.replace(from, to);
  };
  replace('import { magazineSpread } from "./magazine-layout";', "");
  replace(
    'className="news-feed-surface"',
    'className="news-feed-surface" data-native-anchor={anchor}',
  );
  replace(
    "const [spread, setSpread] = useState(1);",
    `const [spread, setSpread] = useState(1);
  const [flow, setFlow] = useState(() => document.documentElement.dataset.nativeReadingMode === "scroll" || window.innerWidth < 680 || window.innerWidth < window.innerHeight * 0.9);`,
  );
  replace(
    '  const [flow, setFlow] = useState(() => document.documentElement.dataset.nativeReadingMode === "scroll" || window.innerWidth < 680 || window.innerWidth < window.innerHeight * 0.9);',
    `  const [flow, setFlow] = useState(() => document.documentElement.dataset.nativeReadingMode === "scroll" || window.innerWidth < 680 || window.innerWidth < window.innerHeight * 0.9);
  const restoring = useRef(false);
  const awaitingScroll = useRef(false);`,
  );
  replace(
    "setSpread(magazineSpread(width, window.innerWidth, window.innerHeight));",
    `const scale = Math.max(1, Number(document.documentElement.dataset.nativeTextScale || 1));
      const wide = document.documentElement.dataset.nativeReadingMode !== "scroll" && width >= 680 * scale && window.innerWidth >= window.innerHeight * 0.9;
      const nextFlow = !wide;
      if (!flow && nextFlow) {
        // A rotation-induced scroll must not replace the story being restored.
        awaitingScroll.current = true;
        restoring.current = true;
      }
      if (flow && !nextFlow) awaitingScroll.current = false;
      setSpread(wide ? 2 : 1);
      setFlow(nextFlow);`,
  );
  replace(
    "}, []);",
    `}, [flow]);
  useLayoutEffect(() => {
    const node = surface.current;
    if (!node) return;
    // Story identity stays in React state across presentation changes. No library migration.
    restoring.current = true;
    let restoreTimer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      if (flow) {
        const target = [...node.querySelectorAll<HTMLElement>('[data-story-id]')].find(e => e.dataset.storyId === anchor);
        if (target && anchor !== articles[0]?.id) target.scrollIntoView({block:'start', behavior:'instant'});
      } else window.scrollTo({top:0, behavior:'instant'});
      if (!awaitingScroll.current)
        restoreTimer = setTimeout(() => { restoring.current = false; }, 180);
    });
    let scrollFrame = 0;
    const allowScrollUpdates = () => {
      awaitingScroll.current = false;
      restoring.current = false;
    };
    const remember = () => {
      if (!flow || restoring.current || scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      const line = Math.min(140, window.innerHeight / 3);
      const visible = [...node.querySelectorAll<HTMLElement>('[data-story-id]')]
        .map(e => ({e, rect:e.getBoundingClientRect()}))
        .filter(({rect}) => rect.bottom > line && rect.top < window.innerHeight)
        .sort((a,b) => Math.abs(a.rect.top-line) - Math.abs(b.rect.top-line))[0]?.e;
      if (visible?.dataset.storyId) setAnchor(visible.dataset.storyId);
      });
    };
    window.addEventListener('scroll', remember, {passive:true});
    document.addEventListener('scroll', remember, {capture:true, passive:true});
    const anchorObserver = new IntersectionObserver(() => remember(), {threshold:0.01});
    node.querySelectorAll<HTMLElement>('[data-story-id]').forEach(e => anchorObserver.observe(e));
    window.addEventListener('touchstart', allowScrollUpdates, {passive:true});
    window.addEventListener('pointerdown', allowScrollUpdates, {passive:true});
    window.addEventListener('wheel', allowScrollUpdates, {passive:true});
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(scrollFrame); if (restoreTimer) clearTimeout(restoreTimer); anchorObserver.disconnect(); window.removeEventListener('scroll', remember); document.removeEventListener('scroll', remember, true); window.removeEventListener('touchstart', allowScrollUpdates); window.removeEventListener('pointerdown', allowScrollUpdates); window.removeEventListener('wheel', allowScrollUpdates); };
  }, [flow]);`,
  );
  replace("    start,\n    true,", "    start,\n    !flow,");
  replace(
    "  return (\n    <section",
    `  if (flow) return (
    <section className="news-book native-scroll-feed" aria-label={\`Scrolling news feed. Story \${index + 1} of \${articles.length}\`}>
      <p className="feed-guidance">Stories — swipe vertically to browse</p>
      <div ref={surface} className="native-story-list" data-native-anchor={anchor}>
        {articles.map(a => <div className="feed-sheet" key={a.id} data-story-id={a.id}
          onClickCapture={() => setAnchor(a.id)}>{renderStory(a, false)}</div>)}
      </div>
    </section>
  );
  return (
    <section`,
  );
  return code;
}
