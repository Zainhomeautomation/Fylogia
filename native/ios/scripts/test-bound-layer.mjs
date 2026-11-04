import { resolve } from "node:path";
import { readFileSync } from "node:fs";
const root = resolve("native/ios");
const { webkit } = await import(
  resolve(root, ".build/golden-source/node_modules/playwright/index.mjs")
);
const b = await webkit.launch();
try {
  const p = await b.newPage({ viewport: { width: 1210, height: 782 } });
  await p.setContent(
    '<main inert><div id="feed" style="width:900px;height:500px"></div></main><section class="reader"><div id="article" style="width:900px;height:500px"></div></section>',
  );
  await p.evaluate(() => {
    window.nativePosts = [];
    window.webkit = {
      messageHandlers: {
        fylogia: { postMessage: (m) => window.nativePosts.push(m) },
      },
    };
  });
  await p.addScriptTag({
    content: readFileSync(resolve(root, "web/bound-bridge.js"), "utf8"),
  });
  await p.evaluate(() => {
    const options = () => ({
      enabled: true,
      page: 0,
      interaction: { previous: false, next: true },
    });
    window.__fylogiaRegisterBound(
      document.querySelector("#feed"),
      options,
      () => null,
    );
    window.__fylogiaRegisterBound(
      document.querySelector("#article"),
      () => ({ ...options(), enabled: false }),
      () => null,
    );
  });
  await p.waitForTimeout(300);
  if (
    await p.evaluate(() =>
      window.nativePosts.some((x) => x.action === "boundPrepare"),
    )
  )
    throw Error("Underlying feed must never cover scrolling/preview reader");
  await p.evaluate(() => {
    document.querySelector(".reader").remove();
    document.querySelector("main").inert = false;
    dispatchEvent(new Event("resize"));
  });
  await p.waitForTimeout(300);
  if (
    !(await p.evaluate(() =>
      window.nativePosts.some((x) => x.action === "boundPrepare"),
    ))
  )
    throw Error("Visible magazine should prepare curl");
  await p.evaluate(() => {
    window.__fylogiaBoundReady();
    window.nativePosts = [];
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div class="reader-options-panel">Reading options</div>',
    );
  });
  await p.waitForTimeout(300);
  if (
    !(await p.evaluate(() =>
      window.nativePosts.some((x) => x.action === "boundHide"),
    ))
  )
    throw Error("Options must hide native overlay");
  await p.evaluate(() => {
    document.querySelector(".reader-options-panel").remove();
    document.body.insertAdjacentHTML(
      "beforeend",
      '<aside class="native-reading-tips">Reading tips</aside>',
    );
    window.nativePosts = [];
    window.__fylogiaBoundReady();
  });
  await p.waitForTimeout(300);
  if (
    await p.evaluate(() =>
      window.nativePosts.some((x) => x.action === "boundPrepare"),
    )
  )
    throw Error("Reading tips must not be covered by native pages");
  await p.evaluate(() => {
    document.querySelector(".native-reading-tips").remove();
    window.nativePosts = [];
  });
  await p.waitForTimeout(300);
  if (
    !(await p.evaluate(() =>
      window.nativePosts.some((x) => x.action === "boundPrepare"),
    ))
  )
    throw Error("Dismissing reading tips must restore native pages");
  console.log(
    "PASS native overlay isolation for scrolling readers, visible magazines, reading options and tutorial dismissal",
  );
} finally {
  await b.close();
}
