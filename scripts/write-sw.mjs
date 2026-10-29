import { readdir, writeFile, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const base = process.env.FYLOGIA_BASE_PATH || "/Fylogia/";
if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base))
  throw new Error(
    "FYLOGIA_BASE_PATH must be a root or slash-delimited URL path.",
  );
const files = await readdir("dist/assets");
const cache = "fylogia-shell-" + Date.now();
const precache = [
  base,
  base + "index.html",
  base + "data/edition.json",
  base + "manifest.webmanifest",
  base + "icon.svg",
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
  `const CACHE=${JSON.stringify(cache)};const BASE=${JSON.stringify(base)};const FILES=${JSON.stringify(precache)};const IMAGES='fyllora-offline-images-v1';
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>{const previous=keys.filter(key=>(key.startsWith('fylogia-shell-')||key.startsWith('fyllora-shell-')||/^fyllora-\\d+$/.test(key)||/^folio-\\d+$/.test(key))&&key!==CACHE).sort((a,b)=>Number(b.match(/\\d+$/)?.[0]||0)-Number(a.match(/\\d+$/)?.[0]||0));return Promise.all(previous.slice(1).map(key=>caches.delete(key)))}).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);if(request.method!=='GET')return;
 if(request.destination==='image'){
  event.respondWith(caches.open(IMAGES).then(cache=>cache.match(request.url,{ignoreVary:true})).then(cached=>cached||fetch(request)));return;
 }
 if(url.origin!==self.location.origin||!url.pathname.startsWith(BASE)||url.pathname.includes('/editions/'))return;
 if(url.pathname===BASE+'data/edition.json'){
  event.respondWith((async()=>{try{const response=await fetch(request);if(!response.ok)throw new Error('Edition unavailable');const cache=await caches.open(CACHE);await cache.put(BASE+'data/edition.json',response.clone());return response}catch{const shell=await caches.open(CACHE);const cached=await shell.match(BASE+'data/edition.json',{ignoreVary:true});return cached||new Response('Edition unavailable',{status:503})}})());return;
 }
 event.respondWith((async()=>{const shell=await caches.open(CACHE);const cached=await shell.match(request,{ignoreSearch:true,ignoreVary:true});if(cached)return cached;if(url.pathname.startsWith(BASE+'assets/')){const previous=await caches.match(request,{ignoreSearch:true,ignoreVary:true});if(previous)return previous;}try{const response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone())}return response}catch{return request.mode==='navigate'?(await (await caches.open(CACHE)).match(BASE+'index.html',{ignoreVary:true}))||Response.error():Response.error()}})());
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
