import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const publicFile = (p) => readFile(new URL("../public/" + p, import.meta.url));
test("published brand assets are intact, bounded and include genuine outlined light/monochrome variants", async () => {
  const inventory = JSON.parse(await publicFile("brand/assets.json"));
  let total = 0;
  for (const asset of inventory) {
    const bytes = await publicFile(asset.path);
    assert.equal(bytes.length, asset.bytes);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      asset.sha256,
    );
    total += bytes.length;
    if (asset.path.endsWith(".svg"))
      assert.doesNotMatch(bytes.toString(), /<script|foreignObject|<image/);
  }
  assert.ok(total < 400000);
  for (const name of [
    "fylogia-mark",
    "fylogia-mark-light",
    "fylogia-mark-monochrome",
    "fylogia-mark-monochrome-inverse",
  ]) {
    const svg = (await publicFile(`brand/${name}.svg`)).toString();
    assert.match(svg, /<path /);
    assert.doesNotMatch(svg, /<text|font-family/);
  }
});
test("favicon, Apple and PWA exports have intended dimensions and the 1024 master has no alpha channel", async () => {
  for (const [path, width, height] of [
    ["favicon-16x16.png", 16, 16],
    ["favicon-32x32.png", 32, 32],
    ["favicon-48x48.png", 48, 48],
    ["apple-touch-icon.png", 180, 180],
    ["icons/icon-192.png", 192, 192],
    ["icons/icon-512.png", 512, 512],
    ["icons/maskable-512.png", 512, 512],
    ["brand/app-icon-1024.png", 1024, 1024],
    ["brand/social-card.png", 1200, 630],
  ]) {
    const bytes = await publicFile(path);
    assert.equal(bytes.subarray(1, 4).toString(), "PNG");
    assert.equal(bytes.readUInt32BE(16), width);
    assert.equal(bytes.readUInt32BE(20), height);
    assert.equal(bytes[25], 2, path + " must be opaque RGB");
  }
  const ico = await publicFile("favicon.ico");
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 3);
  for (let i = 0; i < 3; i++) {
    const entry = 6 + i * 16,
      offset = ico.readUInt32LE(entry + 12),
      length = ico.readUInt32LE(entry + 8);
    assert.equal(ico.subarray(offset + 1, offset + 4).toString(), "PNG");
    assert.ok(offset + length <= ico.length);
  }
  const manifest = JSON.parse(await publicFile("manifest.webmanifest"));
  assert.equal(manifest.id, "/");
  assert.equal(manifest.short_name, "Fylogia");
  assert.equal(
    manifest.icons.filter((i) => i.purpose === "maskable").length,
    1,
  );
  assert.ok(
    manifest.icons.some((i) => i.sizes === "192x192" && i.purpose === "any"),
  );
});
