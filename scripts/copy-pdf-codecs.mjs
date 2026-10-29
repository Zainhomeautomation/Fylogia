import { mkdir, readdir, copyFile, readFile } from "node:fs/promises";
const { version } = JSON.parse(
  await readFile("node_modules/pdfjs-dist/package.json", "utf8"),
);
const destination = `dist/pdfjs/${version}`;
await mkdir(destination, { recursive: true });
for (const file of await readdir("node_modules/pdfjs-dist/wasm")) {
  if (file.startsWith("quickjs")) continue; // Optional PDF scripting is unused.
  await copyFile(
    `node_modules/pdfjs-dist/wasm/${file}`,
    `${destination}/${file}`,
  );
}
