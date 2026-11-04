import { adaptiveReaders } from "../web/reader-transform.mjs";
import { readingSpace, adaptiveFeed } from "../web/reading-space-transform.mjs";
import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  symlinkSync,
  cpSync,
  realpathSync,
  readdirSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
function dailyBriefingHeadlines(code, id) {
  if (!id.endsWith("/src/App.tsx")) return code;
  const anchor = "  const displayedReader =";
  if (!code.includes(anchor))
    throw Error("Native daily briefing headline anchor missing");
  return code.replace(
    anchor,
    `  useEffect(() => {
    const dailyHeadlines = all.slice(0, 12).map((story: any) => ({
      id: story.id,
      title: String(story.title || "").slice(0, 120),
      categories: Array.isArray(story.categories) ? story.categories : [],
    }));
    localStorage.setItem("fylogia.native.dailyHeadlines", JSON.stringify(dailyHeadlines));
    const sendBreakingCandidates = () => {
      if (localStorage.getItem("fylogia.native.breakingOptIn") !== "true") return;
      const candidates = all.slice(0, 120).flatMap((story: any) => {
        const contexts = Array.isArray(story.feedContexts) ? story.feedContexts : [];
        const sources = [...new Set(contexts.map((context: any) => String(context.sourceId || "")).filter(Boolean))];
        if (!sources.length && story.sourceId) sources.push(String(story.sourceId));
        return sources.map((source: string) => ({
          storyID: String(story.id || "").slice(0, 200),
          title: String(story.title || "").slice(0, 500),
          source,
          url: String(story.url || ""),
          published: String(story.published || ""),
          topics: Array.isArray(story.categories) ? story.categories : [],
        }));
      });
      (window as any).webkit?.messageHandlers?.fylogia?.postMessage({
        action: "breakingCandidates",
        candidates,
      });
    };
    (window as any).__fylogiaSendBreakingCandidates = sendBreakingCandidates;
    sendBreakingCandidates();
    const deliver = (route: string) => {
      const [section, query = ""] = route.split("?");
      if (section === "article") {
        const storyID = new URLSearchParams(query).get("fylogiaStoryID");
        const story = all.find((item: any) => item.id === storyID);
        if (story) open(story);
        else (window as any).__fylogiaPendingNativeShortcut = route;
        return;
      }
      const topic = new URLSearchParams(query).get("fylogiaTopic");
      if (section === "categories" && topic && ["Science", "Technology", "World News"].includes(topic)) {
        navigate("explore");
        setFilter(topic);
        return;
      }
      if (!["home", "saved", "history"].includes(section)) return;
      navigate(section);
    };
    (window as any).__fylogiaRouteNativeShortcut = deliver;
    const pendingShortcut = (window as any).__fylogiaPendingNativeShortcut;
    if (typeof pendingShortcut === "string") {
      (window as any).__fylogiaPendingNativeShortcut = undefined;
      deliver(pendingShortcut);
    }
    return () => { delete (window as any).__fylogiaRouteNativeShortcut; delete (window as any).__fylogiaSendBreakingCandidates; };
  }, [all, history, saved, offline.items, online, view, recordVisit]);
` + anchor,
  );
}
const ios = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  repo = resolve(ios, "../..");
execFileSync("sh", [resolve(ios, "scripts/check-development-volume.sh")], {
  stdio: "inherit",
});
const stage = resolve(ios, ".build/golden-source");
mkdirSync(stage, { recursive: true });
const archive = execFileSync("git", ["archive", "fylogia-web-golden-v1"], {
  cwd: repo,
  maxBuffer: 30e6,
});
execFileSync("tar", ["-xf", "-", "-C", stage], { input: archive });
const modules = realpathSync(
  process.env.FYLOGIA_NODE_MODULES ||
    (existsSync(resolve(repo, "node_modules"))
      ? resolve(repo, "node_modules")
      : resolve(stage, "node_modules")),
);
if (!existsSync(resolve(stage, "node_modules")))
  symlinkSync(modules, resolve(stage, "node_modules"));
const golden = process.argv.includes("--golden");
cpSync(
  resolve(ios, "web/native-reading.tsx"),
  resolve(stage, "src/native-reading.tsx"),
);
cpSync(
  resolve(ios, "web/native-pdf-stream.tsx"),
  resolve(stage, "src/native-pdf-stream.tsx"),
);
cpSync(
  resolve(ios, "web/native-launch.ts"),
  resolve(stage, "src/native-launch.ts"),
);
cpSync(
  resolve(ios, "web/native-reading-tips.tsx"),
  resolve(stage, "src/native-reading-tips.tsx"),
);
const nativeCSS = readFileSync(resolve(ios, "web/native.css"), "utf8"),
  bridge =
    readFileSync(resolve(ios, "web/bridge.js"), "utf8") +
    readFileSync(resolve(ios, "web/bound-bridge.js"), "utf8");
const transform = `
import react from '@vitejs/plugin-react';
export default {plugins:[react(),{
name:'fylogia-native-only',enforce:'pre',
transform(code,id){
 code=(${readingSpace.toString()})(code,id);
 code=(${adaptiveFeed.toString()})(code,id);
 code=(${adaptiveReaders.toString()})(code,id);
 code=(${dailyBriefingHeadlines.toString()})(code,id);
 if(id.endsWith('/src/main.tsx')) {
   const anchor = '  await initializeCloudSync();';
   if (!code.includes(anchor)) throw Error('Native launch initialization anchor missing');
   code = 'import { prepareNativeLaunch } from "./native-launch";\\n' + code.replace(anchor, '  prepareNativeLaunch();');
   code = code.replace('import { initializeCloudSync } from "./cloud-sync";', '');
 }
 if(id.endsWith('/src/App.tsx')) {
   const anchor = 'const storyView = [...newsSections, "saved", "history"].includes(view);\\n  return (\\n    <>';
   if (!code.includes(anchor)) throw Error('Native tutorial placement anchor missing');
   code = 'import { NativeReadingTips } from "./native-reading-tips";\\n' + code.replace(anchor, anchor + '\\n      <NativeReadingTips />');
 }
 if(id.endsWith('/src/usePageTurn.ts')){code=code.replace('if (!allowed(forward)) return;', 'if (!allowed(forward)) return; if ((window as any).__fylogiaNativeTurn?.(forward, turn, getSurface(), axis)) return;');code=code.replace('if (!surface) return;\\n    let touchSequence', 'if (!surface) return; (window as any).__fylogiaRegisterBound?.(surface, getOptions, async (forward: boolean, signal: AbortSignal) => getOptions().prepare ? getOptions().prepare!(forward, signal) : capture(surface, (forward ? -1 : 1) * (surface.clientWidth + 40)).node);\\n    let touchSequence');code=code.replace('surface.removeEventListener("click", click, true);','(window as any).__fylogiaUnregisterBound?.(surface); surface.removeEventListener("click", click, true);');}
 if(id.endsWith('/src/magazine-layout.ts'))code=code.replace('width >= minimumPageWidth * 2 && viewportWidth >= viewportHeight * 0.9', 'width >= minimumPageWidth * 2 * Math.max(1, Number(document.documentElement.dataset.nativeTextScale || 1))').replace('viewportWidth: number', '_viewportWidth: number').replace('viewportHeight: number', '_viewportHeight: number');
 if(id.endsWith('/src/App.css'))code=code.replace('(max-width: 1100px) and (min-aspect-ratio: 9/10)', '(max-width: 1100px)');
 if(id.endsWith('/src/main.tsx'))code=code.replace('if ("serviceWorker" in navigator && import.meta.env.PROD)', 'if (false)');
 if(id.endsWith('/src/App.tsx'))code=code.replaceAll('onClick={() => setSyncOpen(true)}','onClick={() => setNotice("Native cloud pairing is not connected yet. Your library remains on this device.")}').replace('On iPhone or iPad, open Fylogia in Safari, tap Share, then Add','This native app opens offline from its bundled interface. The website supports Add').replace('to Home Screen. On Mac, use Safari’s Add to Dock or your','to Home Screen and Safari’s Add to Dock or your');
 return code;
},transformIndexHtml(html){return html.replace('</head>', '<style>'+${JSON.stringify(JSON.stringify(nativeCSS))}+'.replaceNever</style></head>');}
}],build:{chunkSizeWarningLimit:700}};
`;
// Inject only native files, not edits to any tracked golden/website source.
let config = transform.replace(
  "'<style>'+" +
    JSON.stringify(JSON.stringify(nativeCSS)) +
    "+'.replaceNever</style></head>'",
  JSON.stringify(
    "<style>" + nativeCSS + "</style><script>" + bridge + "</script></head>",
  ),
);
if (golden)
  config =
    "import react from '@vitejs/plugin-react'; export default {plugins:[react()],build:{chunkSizeWarningLimit:700}};";
writeFileSync(resolve(stage, "native.vite.config.mjs"), config);
const output = golden
  ? resolve(ios, ".build/golden-web")
  : resolve(ios, "Fylogia/WebAssets");
execFileSync(
  process.execPath,
  [
    resolve(modules, "vite/bin/vite.js"),
    "build",
    "--config",
    "native.vite.config.mjs",
    "--outDir",
    output,
    "--emptyOutDir",
  ],
  { cwd: stage, stdio: "inherit" },
);
writeFileSync(
  resolve(output, "native-build.json"),
  JSON.stringify({
    golden: "26fd37f27bd70cd7495f33209b823796770d9c22",
    native: !golden,
  }),
);
console.log(output);

if (!golden) {
  cpSync(
    resolve(ios, "web/parity-fixture.js"),
    resolve(ios, "Fylogia/parity-fixture.js"),
  );
  const pdfRoot = resolve(modules, "pdfjs-dist"),
    version = JSON.parse(
      readFileSync(resolve(pdfRoot, "package.json"), "utf8"),
    ).version;
  const codecs = resolve(output, "pdfjs", version);
  mkdirSync(codecs, { recursive: true });
  for (const file of readdirSync(resolve(pdfRoot, "wasm")))
    if (!file.includes("quickjs"))
      cpSync(resolve(pdfRoot, "wasm", file), resolve(codecs, file));
}
