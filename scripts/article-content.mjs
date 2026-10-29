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
