import { omitRestrictedFigures } from "../src/media-rights.ts";
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
  // NASA places captions beside (rather than inside) the figure. Keep the
  // publisher's credit attached when promoting a lead photograph in the reader.
  for (const figure of document.querySelectorAll("figure")) {
    if (figure.nextElementSibling?.tagName === "FIGCAPTION")
      figure.append(figure.nextElementSibling);
  }
  omitRestrictedFigures(document);
  const blocks = [
    ...document.querySelectorAll(
      "p.wp-block-paragraph,h2.wp-block-heading,h3.wp-block-heading,h4.wp-block-heading,ul.wp-block-list,ol.wp-block-list,.wp-block-image,blockquote.wp-block-quote,pre.wp-block-code,figure.wp-block-table",
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
  // Only remove the publisher's exact self-attribution. Inspect all other
  // notices before stripping media/markup, so their evidence cannot disappear.
  for (const notice of document.querySelectorAll(".originally-published")) {
    if (
      /^Originally published on Global Voices$/i.test(
        notice.textContent.trim(),
      ) &&
      notice.querySelector("a")?.getAttribute("href") === url
    )
      notice.remove();
    else return "";
  }
  if (
    /all rights reserved|republished|originally (?:published|appeared) (?:in|on|by)|CC\s*BY[-\s](?:NC|ND|SA)/i.test(
      document.body.textContent,
    ) ||
    /creativecommons\.org\/licenses\/by-(?:nc|nd|sa)/i.test(
      document.body.innerHTML,
    )
  )
    return "";
  document
    .querySelectorAll(
      "script,style,iframe,video,audio,form,button,.wp-caption,figure,img",
    )
    .forEach((node) => node.remove());
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

export function feedText(html) {
  const { document } = parseHTML("<html><body>" + html + "</body></html>");
  document.querySelectorAll("script,style").forEach((node) => node.remove());
  for (const node of document.querySelectorAll(
    "p,div,br,hr,h1,h2,h3,h4,h5,h6,li,ul,ol,blockquote,figure,figcaption,section,article,table,tr,td,th,dl,dt,dd,pre",
  )) {
    node.before(document.createTextNode(" "));
    node.after(document.createTextNode(" "));
  }
  return document.body.textContent.replace(/\s+/g, " ").trim();
}

// These publishers explicitly permit syndicating their own feed text. Full
// markup alone never grants permission: the fixed source and origin must match.
export function cleanLicensedFeed(
  html,
  { sourceId, url, author, subtitle = "" },
) {
  const policies = {
    "open-source-initiative": {
      host: "opensource.org",
      name: "Open Source Initiative",
      license: "https://creativecommons.org/licenses/by/4.0/",
      label: "CC BY 4.0",
    },
    "mit-ai": {
      host: "news.mit.edu",
      name: "MIT News",
      license: "https://news.mit.edu/terms-of-use",
      label: "MIT News republication policy",
    },
    eff: {
      host: "www.eff.org",
      name: "Electronic Frontier Foundation",
      license: "https://creativecommons.org/licenses/by/4.0/",
      label: "CC BY 4.0",
    },
    "fedora-magazine": {
      host: "fedoramagazine.org",
      name: "Fedora Magazine",
      license: "https://creativecommons.org/licenses/by-sa/4.0/",
      label: "CC BY-SA 4.0",
    },
    "mozilla-hacks": {
      host: "hacks.mozilla.org",
      name: "Mozilla Hacks",
      license: "https://creativecommons.org/licenses/by-sa/3.0/",
      label: "CC BY-SA 3.0",
    },
    homeassistant: {
      host: "www.home-assistant.io",
      name: "Home Assistant",
      license: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
      label: "CC BY-NC-SA 4.0",
    },
  };
  const policy = policies[sourceId];
  if (!policy || !author) return "";
  // The website policy covers OSI-authored text, not arbitrary guest work or
  // third-party software licenses. Staff authors verified on the team page.
  if (
    sourceId === "open-source-initiative" &&
    ![
      "Duane O'Brien",
      "Simon Phipps",
      "Phyllis Dobbs",
      "Nick Vidal",
      "Jordan Maris",
      "Katie Steen-James",
      "Gabriel Toscano",
      "Open Source Initiative",
    ].some(
      (name) =>
        name.toLowerCase() ===
        author.replace(/[’‘]/g, "'").trim().toLowerCase(),
    )
  )
    return "";
  try {
    if (new URL(url).hostname !== policy.host) return "";
  } catch {
    return "";
  }
  const { document } = parseHTML("<html><body>" + html + "</body></html>");
  if (
    /all rights reserved|republished (?:from|with)|originally (?:published|appeared) (?:in|on|by)|not (?:for )?republication/i.test(
      document.body.textContent,
    )
  )
    return "";
  // Item-level rights notices override a publisher-wide policy. Inspect before
  // media removal so a caption cannot conceal a restrictive notice.
  for (const link of document.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href") || "";
    if (
      /creativecommons\.org\/licenses\//i.test(href) &&
      !(
        policy.license.startsWith("https://creativecommons.org/") &&
        href.replace(/^http:/, "https:").replace(/\/$/, "") ===
          policy.license.replace(/\/$/, "")
      )
    )
      return "";
  }
  if (
    /CC\s*BY[-\s]*(?:NC[-\s]*)?ND|no derivatives|do not (?:reproduce|republish)/i.test(
      document.body.textContent,
    )
  )
    return "";
  if (feedText(html).length < 200) return "";
  // Third-party media is not covered by a general permission for publisher text.
  document
    .querySelectorAll(
      "script,style,iframe,video,audio,lite-youtube,noscript,form,button,figure,picture,img,svg",
    )
    .forEach((n) => n.remove());
  for (const a of document.querySelectorAll("a[href]")) {
    try {
      const target = new URL(a.getAttribute("href"), url);
      if (!["https:", "http:"].includes(target.protocol))
        a.removeAttribute("href");
      else a.setAttribute("href", target.href);
    } catch {
      a.removeAttribute("href");
    }
  }
  const escape = (v) =>
    v
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll('"', "&quot;");
  const credit = `<p class="syndication-credit">${escape(author)} · <a href="${escape(url)}">${policy.name}</a> · <a href="${policy.license}">${policy.label}</a></p>`;
  const deck = subtitle ? `<p>${escape(subtitle)}</p>` : "";
  const footer =
    sourceId === "mit-ai"
      ? '<p>Reprinted with permission of <a href="https://news.mit.edu/">MIT News</a>. Text preserved; formatting adapted and media omitted.</p>'
      : sourceId === "homeassistant"
        ? "<p>Home Assistant text reused noncommercially under CC BY-NC-SA 4.0; formatting adapted and media omitted. This article text remains under that license.</p>"
        : `<p>${policy.name} text retained under ${policy.label}. Formatting adapted; third-party media omitted. This article text remains under that license.</p>`;
  return credit + deck + document.body.innerHTML + footer;
}
