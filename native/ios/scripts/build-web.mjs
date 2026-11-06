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

function nativeStorageGuard(code, id) {
  if (!id.endsWith("/src/local-library.ts")) return code;
  const start = code.indexOf("function writeRows(rows: Row[]) {");
  const end = code.indexOf("\nasync function persist(row: Row) {", start);
  if (start < 0 || end < 0)
    throw Error("Native storage transaction guard anchor missing");

  const guardedWriteRows = `let nativeLibraryStartupPhase = true;
const NATIVE_STORAGE_TRANSACTION_TIMEOUT_MS = 5000;
function writeRows(rows: Row[]) {
  return new Promise<void>((resolve, reject) => {
    const startedAt = performance.now();
    if (!db) {
      window.__fylogiaNativeStartupLog?.("indexeddb-write-failed", {
        elapsedMs: Math.round(performance.now() - startedAt),
        errorName: "InvalidStateError",
      });
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    let tx: IDBTransaction;
    try {
      tx = db.transaction("records", "readwrite");
    } catch (error) {
      window.__fylogiaNativeStartupLog?.("indexeddb-write-failed", {
        elapsedMs: Math.round(performance.now() - startedAt),
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      reject(error);
      return;
    }
    window.__fylogiaNativeStartupLog?.("indexeddb-write-start");
    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (error) reject(error);
      else resolve();
    };
    const timer = window.setTimeout(() => {
      const error = new Error("IndexedDB write transaction timed out");
      window.__fylogiaNativeStartupLog?.("indexeddb-write-timeout", {
        elapsedMs: Math.round(performance.now() - startedAt),
        errorName: "TimeoutError",
      });
      try {
        tx.abort();
      } catch {
        /* The transaction may have completed while its event was delayed. */
      }
      finish(error);
    }, NATIVE_STORAGE_TRANSACTION_TIMEOUT_MS);
    tx.oncomplete = () => {
      if (nativeLibraryStartupPhase) {
        window.__fylogiaNativeStartupLog?.("storage-write-complete", {
          elapsedMs: Math.round(performance.now() - startedAt),
        });
        window.__fylogiaNativeStartupLog?.("indexeddb-write-complete", {
          elapsedMs: Math.round(performance.now() - startedAt),
        });
      }
      finish();
    };
    tx.onerror = () => {
      window.__fylogiaNativeStartupLog?.("indexeddb-write-failed", {
        elapsedMs: Math.round(performance.now() - startedAt),
        errorName: tx.error?.name || "UnknownError",
      });
      finish(tx.error || new Error("IndexedDB write failed"));
    };
    tx.onabort = () => {
      window.__fylogiaNativeStartupLog?.("indexeddb-write-aborted", {
        elapsedMs: Math.round(performance.now() - startedAt),
        errorName: tx.error?.name || "AbortError",
      });
      finish(tx.error || new Error("IndexedDB write was interrupted"));
    };
    try {
      for (const row of rows) tx.objectStore("records").put(row);
    } catch (error) {
      try {
        tx.abort();
      } catch {
        /* The transaction may already be inactive. */
      }
      finish(error);
    }
  });
}`;
  code = code.slice(0, start) + guardedWriteRows + code.slice(end);

  const openStart = code.indexOf("function openDatabase() {");
  const openEnd = code.indexOf("\nexport function initializeLocalLibrary()", openStart);
  if (openStart < 0 || openEnd < 0)
    throw Error("Native IndexedDB open function anchor missing");
  const instrumentedOpenDatabase = `function openDatabase() {
  return new Promise<Row[]>((resolve, reject) => {
    const operationStartedAt = performance.now();
    let operationStage = "indexeddb-open";
    window.__fylogiaNativeStartupLog?.("indexeddb-open-start");
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open("folio-personal-library", 1);
    } catch (error) {
      window.__fylogiaNativeStartupLog?.("indexeddb-open-failed", {
        elapsedMs: Math.round(performance.now() - operationStartedAt),
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      reject(error);
      return;
    }
    let expired = false;
    let readStartedAt = 0;
    const timer = setTimeout(() => {
      const stage = operationStage === "indexeddb-open"
        ? "indexeddb-open-timeout"
        : "indexeddb-read-timeout";
      const stageStartedAt = operationStage === "indexeddb-open"
        ? operationStartedAt
        : readStartedAt;
      window.__fylogiaNativeStartupLog?.(stage, {
        elapsedMs: Math.round(performance.now() - stageStartedAt),
        errorName: "TimeoutError",
      });
      expired = true;
      db?.close();
      db = undefined;
      reject(new Error("Storage timed out"));
    }, 2500);
    request.onupgradeneeded = () => {
      window.__fylogiaNativeStartupLog?.("indexeddb-upgrade-start", {
        elapsedMs: Math.round(performance.now() - operationStartedAt),
      });
      request.transaction?.addEventListener("complete", () => {
        window.__fylogiaNativeStartupLog?.("indexeddb-upgrade-complete", {
          elapsedMs: Math.round(performance.now() - operationStartedAt),
        });
      }, { once: true });
      request.result.createObjectStore("records", { keyPath: "key" });
    };
    request.onerror = () => {
      clearTimeout(timer);
      expired = true;
      window.__fylogiaNativeStartupLog?.("indexeddb-open-failed", {
        elapsedMs: Math.round(performance.now() - operationStartedAt),
        errorName: request.error?.name || "UnknownError",
      });
      reject(request.error || new Error("Storage blocked"));
    };
    request.onblocked = () => {
      clearTimeout(timer);
      expired = true;
      window.__fylogiaNativeStartupLog?.("indexeddb-open-blocked", {
        elapsedMs: Math.round(performance.now() - operationStartedAt),
        errorName: request.error?.name || "UnknownError",
      });
      reject(request.error || new Error("Storage blocked"));
    };
    request.onsuccess = () => {
      if (expired) {
        request.result.close();
        return;
      }
      db = request.result;
      window.__fylogiaNativeStartupLog?.("indexeddb-open-ready", {
        elapsedMs: Math.round(performance.now() - operationStartedAt),
      });
      db.onversionchange = () => {
        db?.close();
        db = undefined;
      };
      operationStage = "indexeddb-read";
      readStartedAt = performance.now();
      window.__fylogiaNativeStartupLog?.("indexeddb-read-start");
      let tx: IDBTransaction;
      let read: IDBRequest<Row[]>;
      try {
        tx = db.transaction("records", "readonly");
        read = tx.objectStore("records").getAll();
      } catch (error) {
        clearTimeout(timer);
        window.__fylogiaNativeStartupLog?.("indexeddb-read-failed", {
          elapsedMs: Math.round(performance.now() - readStartedAt),
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        reject(error);
        return;
      }
      tx.oncomplete = () => {
        clearTimeout(timer);
        window.__fylogiaNativeStartupLog?.("indexeddb-read-complete", {
          elapsedMs: Math.round(performance.now() - readStartedAt),
        });
        resolve(read.result);
      };
      tx.onerror = tx.onabort = () => {
        clearTimeout(timer);
        window.__fylogiaNativeStartupLog?.("indexeddb-read-failed", {
          elapsedMs: Math.round(performance.now() - readStartedAt),
          errorName: tx.error?.name || "AbortError",
        });
        reject(tx.error || new Error("Storage read failed"));
      };
    };
  });
}`;
  code = code.slice(0, openStart) + instrumentedOpenDatabase + code.slice(openEnd);

  const readAnchor = `    let rows: Row[] = [];
    try {
      rows = await openDatabase();
    } catch {
      /* Keep the app usable with localStorage or in memory. */
    }`;
  if (!code.includes(readAnchor))
    throw Error("Native storage read failure guard anchor missing");
  code = code.replace(
    readAnchor,
    `    let rows: Row[] = [];
    const storageReadStartedAt = performance.now();
    window.__fylogiaNativeStartupLog?.("library-read-start");
    try {
      rows = await openDatabase();
      window.__fylogiaNativeStartupLog?.("library-read-complete", {
        elapsedMs: Math.round(performance.now() - storageReadStartedAt),
      });
    } catch (error) {
      window.__fylogiaNativeStartupLog?.("library-read-failed", {
        elapsedMs: Math.round(performance.now() - storageReadStartedAt),
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      updateStatus({
        error:
          "Fylogia could not read the existing library. No saved data was changed.",
      });
      throw new Error("LOCAL_LIBRARY_READ_FAILED");
    }`,
  );

  const reconciliationStart = `    let recovered = false,
      damaged = false;
    for (const key of libraryKeys) {`;
  if (!code.includes(reconciliationStart))
    throw Error("Native library reconciliation start anchor missing");
  code = code.replace(
    reconciliationStart,
    `    const reconciliationStartedAt = performance.now();
    window.__fylogiaNativeStartupLog?.("library-reconciliation-start");
    let recovered = false,
      damaged = false;
    for (const key of libraryKeys) {`,
  );

  const batchAnchor = `    status = { ...status, profile, recovered };
    await Promise.all([`;
  if (!code.includes(batchAnchor))
    throw Error("Native library write-batch start anchor missing");
  code = code.replace(
    batchAnchor,
    `    status = { ...status, profile, recovered };
    window.__fylogiaNativeStartupLog?.("library-reconciliation-complete", {
      elapsedMs: Math.round(performance.now() - reconciliationStartedAt),
    });
    window.__fylogiaNativeStartupLog?.("library-write-batch-start");
    await Promise.all([`,
  );

  const persistAnchor = `    await Promise.all([
      persist({ key: "profile", value: profile, savedAt: timestamp() }),
      ...libraryKeys.map((key) =>
        persist({ key, value: data[key], savedAt: timestamp() }),
      ),
    ]);`;
  if (!code.includes(persistAnchor))
    throw Error("Native storage persistence guard anchor missing");
  return code.replace(
    persistAnchor,
    `${persistAnchor}
    nativeLibraryStartupPhase = false;
    if (failures.size) {
      window.__fylogiaNativeStartupLog?.("library-write-batch-failed");
      updateStatus({
        error:
          "Fylogia could not safely save the existing library. No stored data was reset.",
      });
      throw new Error("LOCAL_LIBRARY_WRITE_FAILED");
    }
    window.__fylogiaNativeStartupLog?.("library-write-batch-complete");`,
  );
}

function nativeBootstrapGuard(code, id) {
  if (!id.endsWith("/src/main.tsx")) return code;
  code = `import { NativeStartupRecovery } from "./native-startup-recovery";\n${code}`;
  const start = "void initializeLocalLibrary().then(async () => {";
  if (!code.includes(start))
    throw Error("Native startup timing anchor missing");
  code = code.replace(
    start,
    `const nativeStartupStartedAt = performance.now();
let nativeStartupStage = "local-library";
let nativeStartupFinished = false;
const nativeStartupLog = (stage: string, detail: any = {}) => {
  const elapsedMs = Math.round(performance.now() - nativeStartupStartedAt);
  console.info("[fylogia-startup] " + stage, { elapsedMs, ...detail });
  const event = {
    stage,
    elapsedMs,
    ...(typeof detail.elapsedMs === "number" && Number.isFinite(detail.elapsedMs)
      ? { operationElapsedMs: Math.round(detail.elapsedMs) }
      : {}),
    ...(detail.stage ? { failureStage: detail.stage } : {}),
    ...(detail.errorName ? { errorName: detail.errorName } : {}),
  };
  (window as any).__fylogiaRecordStartupDiagnosticForTests?.(event);
  (window as any).webkit?.messageHandlers?.fylogia?.postMessage({
    action: "startupStage",
    event,
  });
};
(window as any).__fylogiaNativeStartupLog = nativeStartupLog;
nativeStartupLog("bootstrap-start");
const nativeStartupTimer = window.setTimeout(() => {
  if (nativeStartupFinished) return;
  nativeStartupLog("deadline-exceeded", {
    stage: nativeStartupStage,
    errorName: "TimeoutError",
    deadlineMs: 12000,
  });
  nativeStartupLog("recovery-screen-activated", { stage: nativeStartupStage });
  root.render(
    <NativeStartupRecovery onRetry={() => window.location.reload()} />,
  );
}, 12000);
nativeStartupLog("local-library-start");
void initializeLocalLibrary().then(async () => {
  nativeStartupLog("local-library-ready");`,
  );

  const launchAnchor = "  prepareNativeLaunch();";
  if (!code.includes(launchAnchor))
    throw Error("Native first-launch preparation anchor missing");
  code = code.replace(
    launchAnchor,
    `  nativeStartupStage = "native-launch-preparation";
  nativeStartupLog("native-launch-preparation-start");
  prepareNativeLaunch();`,
  );
  const renderStart = `  root.render(
    <StrictMode>`;
  if (!code.includes(renderStart))
    throw Error("Native feed preparation start anchor missing");
  code = code.replace(
    renderStart,
    `  nativeStartupStage = "feed-preparation";
  nativeStartupLog("feed-preparation-start");
  root.render(
    <StrictMode>`,
  );

  const end = `    </StrictMode>,
  );
});

if ("serviceWorker"`;
  if (!code.includes(end))
    throw Error("Native startup completion anchor missing");
  return code.replace(
    end,
    `    </StrictMode>,
  );
  nativeStartupFinished = true;
  window.clearTimeout(nativeStartupTimer);
  nativeStartupLog("app-render-requested");
  let feedReadyReported = false;
  const reportFeedReady = () => {
    if (feedReadyReported) return true;
    if (!document.querySelector(
      ".native-story-list .story-open, .native-horizontal-feed .story-open",
    )) return false;
    feedReadyReported = true;
    nativeStartupLog("feed-preparation-complete");
    nativeStartupLog("feed-render-ready");
    return true;
  };
  if (!reportFeedReady()) {
    const feedObserver = new MutationObserver(() => {
      if (reportFeedReady()) {
        feedObserver.disconnect();
        window.clearTimeout(feedObserverTimeout);
      }
    });
    feedObserver.observe(document.getElementById("root")!, {
      childList: true,
      subtree: true,
    });
    const feedObserverTimeout = window.setTimeout(
      () => {
        feedObserver.disconnect();
        if (!feedReadyReported) {
          nativeStartupLog("feed-readiness-timeout", {
            stage: "feed-preparation",
            errorName: "TimeoutError",
          });
        }
      },
      60000,
    );
  }
  requestAnimationFrame(() => nativeStartupLog("first-render-frame"));
}).catch((error) => {
  nativeStartupFinished = true;
  window.clearTimeout(nativeStartupTimer);
  nativeStartupLog("startup-failed", {
    errorName: error instanceof Error ? error.name : "UnknownError",
    stage: nativeStartupStage,
  });
  nativeStartupLog("recovery-screen-activated", { stage: nativeStartupStage });
  root.render(
    <NativeStartupRecovery onRetry={() => window.location.reload()} />,
  );
});

if ("serviceWorker"`,
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
cpSync(
  resolve(ios, "web/native-startup-recovery.tsx"),
  resolve(stage, "src/native-startup-recovery.tsx"),
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
   code = (${nativeBootstrapGuard.toString()})(code,id);
 }
 code=(${nativeStorageGuard.toString()})(code,id);
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
