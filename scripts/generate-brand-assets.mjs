// Optional design-time exporter. No image library is shipped to browsers or required by CI.
// Install the pinned export tools outside the repository; see docs/branding.md.
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { logoSvg, iconSvg, socialSvg } from "./brand-artwork.mjs";
if (!process.env.FYLOGIA_BRAND_TOOLS)
  throw new Error(
    "Set FYLOGIA_BRAND_TOOLS to the optional export-tool directory.",
  );
const require = createRequire(
  resolve(process.env.FYLOGIA_BRAND_TOOLS, "package.json"),
);
const { Resvg } = require("@resvg/resvg-js");
const sharp = require("sharp");
await mkdir("public/brand", { recursive: true });
await mkdir("public/icons", { recursive: true });
const inventory = [];
async function save(path, bytes) {
  await writeFile("public/" + path, bytes);
  inventory.push({
    path,
    bytes: Buffer.byteLength(bytes),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
async function png(path, svg, width) {
  const rendered = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { loadSystemFonts: true },
  })
    .render()
    .asPng();
  const raster = sharp(rendered);
  if (!path.includes("fylogia-mark")) raster.removeAlpha();
  const bytes = await raster.png({ compressionLevel: 9 }).toBuffer();
  await save(path, bytes);
  return bytes;
}
for (const [name, options] of [
  ["fylogia-mark", {}],
  ["fylogia-mark-light", { light: true }],
  ["fylogia-mark-monochrome", { light: true, mono: true }],
  ["fylogia-mark-monochrome-inverse", { mono: true }],
]) {
  const svg = logoSvg(options);
  await save("brand/" + name + ".svg", svg);
  await png("brand/" + name + ".png", svg, 512);
}
const icon = iconSvg();
await save("brand/app-icon-master.svg", icon);
await png("brand/app-icon-1024.png", icon, 1024);
await save("brand/app-icon-light.svg", iconSvg({ light: true }));
await png("brand/app-icon-light.png", iconSvg({ light: true }), 1024);
await save("favicon.svg", icon);
await save("icon.svg", icon); // Existing bookmarks/old manifests retain a valid compatibility URL.
await png("icons/icon-192.png", icon, 192);
await png("icons/icon-512.png", icon, 512);
await png("icons/maskable-512.png", iconSvg({ maskable: true }), 512);
await png("apple-touch-icon.png", icon, 180);
const small = [];
for (const size of [16, 32, 48]) {
  const bytes = await png(`favicon-${size}x${size}.png`, icon, size);
  small.push({ size, bytes });
}
// ICO directory with lossless PNG entries; supported by modern browsers and Windows.
const header = Buffer.alloc(6 + small.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(small.length, 4);
let offset = header.length;
small.forEach(({ size, bytes }, i) => {
  const p = 6 + i * 16;
  header[p] = size;
  header[p + 1] = size;
  header.writeUInt16LE(1, p + 4);
  header.writeUInt16LE(32, p + 6);
  header.writeUInt32LE(bytes.length, p + 8);
  header.writeUInt32LE(offset, p + 12);
  offset += bytes.length;
});
await save(
  "favicon.ico",
  Buffer.concat([header, ...small.map((x) => x.bytes)]),
);
await save("brand/social-card.svg", socialSvg());
await png("brand/social-card.png", socialSvg(), 1200);
await writeFile(
  "public/brand/assets.json",
  JSON.stringify(inventory, null, 2) + "\n",
);
console.log(
  `Exported ${inventory.length} assets (${inventory.reduce((n, x) => n + x.bytes, 0).toLocaleString()} bytes).`,
);
