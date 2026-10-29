import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

// Operates only on publisher-supplied RSS HTML. Never fetches an article page.
export function cleanFeedArticle(html, title) {
  const { document } = parseHTML(
    "<!doctype html><html><head></head><body>" + html + "</body></html>",
  );
  document.title = title;
  for (const node of document.querySelectorAll(
    "nav,header,footer,script,style,button,form,.wp-block-nasa-blocks-secondary-navigation",
  ))
    node.remove();
  const blocks = [
    ...document.querySelectorAll(
      "p.wp-block-paragraph,h2.wp-block-heading,h3.wp-block-heading,ul.wp-block-list,ol.wp-block-list,figure.wp-block-image,blockquote.wp-block-quote",
    ),
  ];
  if (blocks.reduce((n, b) => n + b.textContent.length, 0) > 200) {
    const roots = blocks.filter(
      (b) => !blocks.some((other) => other !== b && other.contains(b)),
    );
    return roots.map((b) => b.outerHTML).join("\n");
  }
  const explanation = document.querySelector(".media-detail-hero__description");
  if (explanation && explanation.textContent.length > 100) {
    const credit = document.querySelector(
      ".media-detail-hero__caption,.media-detail-hero__credit",
    );
    return explanation.outerHTML + (credit?.outerHTML || "");
  }
  const parsed = new Readability(document, { charThreshold: 150 }).parse();
  return parsed?.content || "";
}

// Global Voices permits attributed text reuse; third-party media has separate
// rights. Keep all publisher prose instead of applying an extractive heuristic.
export function cleanGlobalVoices(html, url, author) {
  if (!author) return "";
  const { document } = parseHTML("<html><body>" + html + "</body></html>");
  document
    .querySelectorAll(
      "script,style,iframe,video,audio,form,button,.wp-caption,figure,.gv-rss-footer,.originally-published,img",
    )
    .forEach((node) => node.remove());
  // Item-level notices override the publisher's general CC BY policy. Ignore
  // removed image captions, but never relabel partner text or another license.
  if (
    /all rights reserved|republished|originally (?:published|appeared) (?:in|on|by)/i.test(
      document.body.textContent,
    ) ||
    /creativecommons\.org\/licenses\/by-(?:nc|nd|sa)/i.test(
      document.body.innerHTML,
    )
  )
    return "";
  const escape = (value) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll('"', "&quot;");
  return (
    `<p>This story by ${escape(author)} originally appeared on <a href="${escape(url)}">Global Voices</a>. Text licensed under <a href="https://creativecommons.org/licenses/by/3.0/">CC BY 3.0</a>. Reformatted for reading; third-party media omitted.</p>` +
    document.body.innerHTML
  );
}
