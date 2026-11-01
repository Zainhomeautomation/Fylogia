import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createServer } from "vite";
import {
  discoveryPages,
  pageSchema,
  homeTitle,
  homeDescription,
  siteOrigin,
  appSections,
} from "../src/discovery-catalog.ts";
const base = process.env.FYLOGIA_BASE_PATH || "/";
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const template = await readFile("dist/index.html", "utf8");
const vite = await createServer({
  server: { middlewareMode: true, watch: null },
  appType: "custom",
});
try {
  const render = await vite.ssrLoadModule("/src/seo-render.tsx");
  const home = render.renderHome();
  const schema = (data) =>
    '<script type="application/ld+json">' +
    JSON.stringify(data).replaceAll("<", "\\u003c") +
    "</script>";
  function html({
    title,
    description,
    path = "",
    body,
    publicPage = false,
    structured,
  }) {
    let text = template
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`)
      .replace(
        /(<meta\s+name="description"\s+content=")[^"]*("\s*\/?>)/,
        (_, a, b) => a + escape(description) + b,
      );
    for (const [property, content] of [
      ["og:title", title],
      ["og:description", description],
      ["og:url", siteOrigin + "/" + path],
    ])
      text = text.replace(
        new RegExp(
          '(<meta\\s+property="' +
            property +
            '"\\s+content=")[^"]*("\\s*\\/?>)',
        ),
        (_, a, b) => a + escape(content) + b,
      );
    text = text.replace(
      /(<link\s+rel="canonical"\s+href=")[^"]*("\s*\/?>)/,
      (_, a, b) => a + siteOrigin + "/" + path + b,
    );
    text = text.replace(
      "</head>",
      `<meta name="robots" content="${publicPage ? "index,follow,max-image-preview:large" : "noindex,follow,noarchive"}">` +
        (structured ? schema(structured) : "") +
        "</head>",
    );
    text = text.replace(
      '<div id="root"></div>',
      `<div id="root">${body}</div>`,
    );
    if (path.startsWith("discover") || path === "404")
      text = text
        .replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/g, "")
        .replace(/<link\b[^>]*rel="modulepreload"[^>]*>/g, "");
    return text;
  }
  await writeFile(
    "dist/index.html",
    html({
      title: homeTitle,
      description: homeDescription,
      body: home,
      publicPage: true,
      structured: pageSchema(),
    }),
  );
  for (const p of discoveryPages) {
    const file = "dist/" + p.path + ".html";
    await mkdir(file.slice(0, file.lastIndexOf("/")), { recursive: true });
    await writeFile(
      file,
      html({
        title: p.title,
        description: p.description,
        path: p.path,
        body: render.renderCollection(p.path),
        publicPage: true,
        structured: pageSchema(p),
      }),
    );
  }
  for (const [path, label] of Object.entries(appSections))
    await writeFile(
      "dist/" + path + ".html",
      html({
        title: label + " — Fylogia",
        description:
          "Your personal Fylogia " +
          label.toLowerCase() +
          ". Preferences, saved reading and offline libraries are not public search pages.",
        path,
        body: home,
      }),
    );
  await writeFile(
    "dist/404.html",
    html({
      title: "Page not found — Fylogia",
      description:
        "Return to Fylogia or explore its public news and magazine collections.",
      path: "404",
      body: render.renderNotFound(),
    }),
  );
  const urls = [
    siteOrigin + "/",
    ...discoveryPages.map((p) => siteOrigin + "/" + p.path),
  ];
  if (new Set(urls).size !== urls.length) throw new Error("Duplicate SEO URL");
  // lastmod is optional. No truthful per-page content revision date exists yet;
  // omit it rather than substitute build/feed refresh time or release timestamps.
  await writeFile(
    "dist/sitemap.xml",
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls
        .map((url) => "  <url><loc>" + escape(url) + "</loc></url>")
        .join("\n") +
      "\n</urlset>\n",
  );
  await writeFile(
    "dist/seo-pages.json",
    JSON.stringify({
      paths: discoveryPages.map((p) => base + p.path),
      urls,
      generatedFrom:
        "Original collection descriptions and the curated source catalog; no article bodies.",
    }),
  );
  let headers = await readFile("dist/_headers", "utf8");
  for (const path of [
    ...Object.keys(appSections),
    "privacy",
    "privacy.html",
    "404.html",
  ])
    for (const suffix of path.endsWith(".html") ? [""] : ["", "/", ".html"])
      headers +=
        "\n" +
        base +
        path +
        suffix +
        "\n  X-Robots-Tag: noindex, follow, noarchive\n";
  headers +=
    "\n" +
    base +
    "data/*\n  X-Robots-Tag: noindex, noarchive, nosnippet\n\n" +
    base +
    "editions/*\n  X-Robots-Tag: noindex, noarchive, nosnippet\n\n" +
    base +
    "seo-pages.json\n  X-Robots-Tag: noindex\n";
  await writeFile("dist/_headers", headers);
  await writeFile(
    "dist/robots.txt",
    `User-agent: *\nAllow: /\nDisallow: ${base}api/\nDisallow: ${base}data/\nDisallow: ${base}editions/\n\nSitemap: ${siteOrigin}/sitemap.xml\n`,
  );
  console.log(
    `Prerendered homepage, ${discoveryPages.length} public collection pages and ${Object.keys(appSections).length} non-indexable app sections; ${urls.length} canonical sitemap URLs.`,
  );
} finally {
  await vite.close();
}
