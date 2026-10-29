import { readdir, writeFile } from "node:fs/promises";
const base = "/Folio/";
const files = await readdir("dist/assets");
const cache = "folio-" + Date.now();
const precache = [
  base,
  base + "index.html",
  base + "data/edition.json",
  base + "manifest.webmanifest",
  base + "icons/icon-192.png",
  base + "icons/icon-512.png",
  ...files.map((f) => base + "assets/" + f),
];
await writeFile(
  "dist/sw.js",
  `const CACHE=${JSON.stringify(cache)};const BASE=${JSON.stringify(base)};const FILES=${JSON.stringify(precache)};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('folio-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(BASE)||u.pathname.includes('/editions/'))return;
if(u.pathname.endsWith('/data/edition.json')){e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(BASE+'data/edition.json',copy))}return r}).catch(()=>caches.match(BASE+'data/edition.json')));return}
e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(cached=>cached||fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(()=>e.request.mode==='navigate'?caches.match(BASE+'index.html'):Response.error())))});
`,
);
