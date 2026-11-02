/** Native-only layout adaptation. Fail loudly if the protected source changes. */
export function readingSpace(code, id) {
  if (!id.endsWith("/src/App.tsx")) return code;
  const replace = (from, to) => {
    if (!code.includes(from))
      throw new Error("Golden reading-space anchor missing: " + from);
    code = code.replace(from, to);
  };
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
