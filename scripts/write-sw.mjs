import { freshNavigation } from "./sw-navigation.mjs";
import { readdir, writeFile, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const base = process.env.FYLOGIA_BASE_PATH || "/";
if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base))
  throw new Error(
    "FYLOGIA_BASE_PATH must be a root or slash-delimited URL path.",
  );
const files = await readdir("dist/assets");
const cache = "fylogia-shell-" + Date.now();
async function codecFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = directory + "/" + entry.name;
    if (entry.isDirectory()) result.push(...(await codecFiles(path)));
    else result.push(base + path.replace(/^dist\//, ""));
  }
  return result;
}
const precache = [
  ...(await codecFiles("dist/pdfjs")),
  ...(await codecFiles("dist/covers")),
  ...(await codecFiles("dist/fonts")),
  base,
  base + "privacy.html",
  base + "privacy.css",
  base + "data/edition.json",
  base + "data/source-index.json",
  base + "manifest.webmanifest",
  base + "icon.svg",
  base + "favicon.svg",
  base + "favicon.ico",
  base + "favicon-16x16.png",
  base + "favicon-32x32.png",
  base + "favicon-48x48.png",
  base + "apple-touch-icon.png",
  base + "icons/maskable-512.png",
  base + "brand/fylogia-mark.svg",
  base + "brand/fylogia-mark-light.svg",
  base + "icons/icon-192.png",
  base + "icons/icon-512.png",
  ...files.map((f) => base + "assets/" + f),
];
const manifest = JSON.parse(
  await readFile("dist/manifest.webmanifest", "utf8"),
);
// Retain the installed PWA identity on the renamed GitHub Pages origin.
manifest.id = base === "/Fylogia/" ? "/Folio/" : base;
manifest.start_url = base;
manifest.scope = base;
await writeFile("dist/manifest.webmanifest", JSON.stringify(manifest, null, 2));
await writeFile(
  "dist/sw.js",
  `const CACHE=${JSON.stringify(cache)};const BASE=${JSON.stringify(base)};const FILES=${JSON.stringify(precache)};const IMAGES='fyllora-offline-images-v1';const freshNavigation=${freshNavigation.toString()};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES.map(file=>new Request(file,{priority:"low"})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>{const previous=keys.filter(key=>(key.startsWith('fylogia-shell-')||key.startsWith('fyllora-shell-')||/^fyllora-\\d+$/.test(key)||/^folio-\\d+$/.test(key))&&key!==CACHE).sort((a,b)=>Number(b.match(/\\d+$/)?.[0]||0)-Number(a.match(/\\d+$/)?.[0]||0));return Promise.all(previous.slice(1).map(key=>caches.delete(key)))}).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.pathname.startsWith(BASE+'api/'))return;
 if(request.destination==='image'){
  event.respondWith((async()=>{try{const images=await caches.open(IMAGES);const downloaded=await images.match(request.url,{ignoreVary:true});if(downloaded)return downloaded;const shell=await caches.open(CACHE);const bundled=await shell.match(request,{ignoreSearch:true,ignoreVary:true});if(bundled)return bundled}catch{}try{return await fetch(request)}catch{return new Response(null,{status:503,statusText:'Image unavailable',headers:{'Cache-Control':'no-store'}})}})());return;
 }
 if(url.origin!==self.location.origin||!url.pathname.startsWith(BASE)||url.pathname.includes('/editions/'))return;
 // Refresh the document on online launches. Never clear article/PDF/download
 // stores, and keep the version's precached shell as the offline fallback.
 if(request.mode==='navigate'){
  event.respondWith(freshNavigation(request,fetch,async()=>{const shell=await caches.open(CACHE);return (await shell.match(url.pathname===BASE+'privacy.html'?BASE+'privacy.html':BASE,{ignoreVary:true}))||Response.error()}));return;
 }

 if(url.pathname===BASE+'data/edition.json'||url.pathname===BASE+'data/source-index.json'||url.pathname.startsWith(BASE+'data/source-files/')){
  event.respondWith((async()=>{try{const response=await fetch(request);if(!response.ok)throw new Error('Edition unavailable');const cache=await caches.open(CACHE);await cache.put(url.pathname,response.clone());return response}catch{const shell=await caches.open(CACHE);const cached=await shell.match(url.pathname,{ignoreVary:true});return cached||new Response('Edition unavailable',{status:503})}})());return;
 }
 event.respondWith((async()=>{const shell=await caches.open(CACHE);const cached=await shell.match(request,{ignoreSearch:true,ignoreVary:true});if(cached)return cached;if(url.pathname.startsWith(BASE+'assets/')){const previous=await caches.match(request,{ignoreSearch:true,ignoreVary:true});if(previous)return previous;}try{const response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone())}return response}catch{return request.mode==='navigate'?(await (await caches.open(CACHE)).match(BASE,{ignoreVary:true}))||Response.error():Response.error()}})());
});
`,
);

let commit = null,
  dirty = null;
try {
  commit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  dirty = !!execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  }).trim();
} catch {}
await writeFile(
  "dist/build-info.json",
  JSON.stringify(
    {
      product: "Fylogia",
      base,
      commit,
      dirty,
      builtAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
