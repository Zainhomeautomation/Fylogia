import { XMLParser, XMLValidator } from "fast-xml-parser";
import { feedArray, feedValue, itemLink, publicUrl } from "./source-utils.ts";
export function parseFeedDocument(xml: string) {
  if (xml.length > 8_000_000) throw new Error("Feed exceeds 8 MB limit");
  // Declarations inside CDATA/comments are inert article text, not XML DTDs.
  const declarations = xml
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  if (/<!DOCTYPE|<!ENTITY/i.test(declarations))
    throw new Error("Feed DTD/entity declarations are unsupported");
  // Some publisher roots omit whitespace before namespace attributes (NASA).
  // Repair only that header token boundary; never rewrite article bodies.
  const channel = xml.indexOf("<channel");
  if (channel >= 0)
    xml =
      xml.slice(0, channel).replace(/(["'])(?=xmlns(?::[\w.-]+)?=)/g, "$1 ") +
      xml.slice(channel);
  if (XMLValidator.validate(xml) !== true) throw new Error("Invalid feed XML");
  const data = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    processEntities: true,
    htmlEntities: true,
  }).parse(xml);
  const root = data.rss?.channel || data.feed || data["rdf:RDF"];
  if (!root) throw new Error("Expected an RSS or Atom document");
  const items = feedArray(root.item || root.entry).filter(
    (i) => feedValue(i.title) && itemLink(i),
  );
  if (!items.length) throw new Error("No usable feed entries");
  return {
    items,
    title: feedValue(root.title),
    site: publicUrl(
      feedValue(root.link) ||
        feedArray(root.link).find(
          (l) => l["@_rel"] === "alternate" || !l["@_rel"],
        )?.["@_href"] ||
        "",
    ),
  };
}
