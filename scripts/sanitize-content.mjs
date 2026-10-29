import { parseHTML } from "linkedom";
const tags = new Set(
  "p br strong em b i h2 h3 h4 h5 h6 pre code table thead tbody tr th td sup sub dl dt dd ul ol li blockquote figure figcaption img a".split(
    " ",
  ),
);
// Defense in depth before storing feed markup. The reader sanitizes again.
export function sanitizePublisherContent(html, base) {
  const { document } = parseHTML("<html><body>" + html + "</body></html>");
  document
    .querySelectorAll(
      "script,style,iframe,object,embed,svg,math,form,input,button,video,audio,template",
    )
    .forEach((n) => n.remove());
  for (const node of [...document.body.querySelectorAll("*")].reverse()) {
    if (!tags.has(node.localName)) {
      node.replaceWith(
        document.createTextNode(" "),
        ...node.childNodes,
        document.createTextNode(" "),
      );
      continue;
    }
    for (const attr of [...node.attributes]) {
      if (["href", "src"].includes(attr.name)) {
        try {
          const u = new URL(attr.value, base);
          if (
            !["https:", "http:"].includes(u.protocol) ||
            u.username ||
            u.password
          )
            throw new Error("URL");
          node.setAttribute(attr.name, u.href);
        } catch {
          node.removeAttribute(attr.name);
        }
      } else if (!["alt", "title", "colspan", "rowspan"].includes(attr.name))
        node.removeAttribute(attr.name);
    }
    if (node.localName === "img" && !node.getAttribute("src")) node.remove();
  }
  return document.body.innerHTML;
}
