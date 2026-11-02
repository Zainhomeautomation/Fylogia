import { resolve } from "node:path";
import { readFileSync } from "node:fs";
const root = resolve("native/ios");
const { webkit } = await import(
  resolve(root, ".build/golden-source/node_modules/playwright/index.mjs")
);
const b = await webkit.launch();
try {
  const c = await b.newContext({ viewport: { width: 1210, height: 782 } });
  await c.addInitScript(
    readFileSync(resolve(root, "web/parity-fixture.js"), "utf8") +
      ";(" +
      (() => {
        const fetch = window.fetch;
        window.fetch = async (input, options) => {
          const response = await fetch(input, options);
          if (
            String(
              typeof input === "string" ? input : input.url || String(input),
            ).includes("data/edition.json")
          ) {
            const data = await response.json();
            data.articles = data.articles.map((article) => ({
              ...article,
              full: false,
              content: "",
              excerpt: "",
              image: "/covers/missing-test-image.jpg",
              contentDetails: {
                authorization: "unknown",
                availability: "preview",
                completeness: "preview",
              },
            }));
            return new Response(JSON.stringify(data), {
              headers: { "Content-Type": "application/json" },
            });
          }
          return response;
        };
      }).toString() +
      ")();",
  );
  const p = await c.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  await p.goto(process.env.FYLOGIA_TEST_URL || "http://127.0.0.1:4176");
  const card = p.locator(".news-feed-surface > .feed-spread .story").first();
  await card.locator(".type-art").waitFor();
  await card.locator(".story-open").click();
  await p
    .locator('.preview-reader .reader-viewport.scrolling[data-spread="1"]')
    .waitFor();
  await p.getByRole("link", { name: /Continue reading/i }).waitFor();
  if (await p.getByRole("button", { name: "Next page", exact: true }).count())
    throw Error("Preview must not offer page-turn controls");
  await p
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "PASS failed image fallback, missing article text, honest preview action and usable Back navigation",
  );
} finally {
  await b.close();
}
