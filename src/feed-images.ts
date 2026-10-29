import { feedArray, publicUrl } from "./source-utils.ts";
const imageUrl = (value: unknown, base: string) =>
  typeof value === "string" && value.trim() ? publicUrl(value, base) : "";
type Candidate = { url: string; width: number };
function choose(candidates: Candidate[]) {
  const valid = candidates.filter((c) => c.url);
  const bounded = valid.filter((c) => c.width <= 2560);
  return (
    (bounded.length
      ? bounded.sort((a, b) => b.width - a.width)
      : valid.sort((a, b) => a.width - b.width))[0]?.url || ""
  );
}
// Select only publisher-supplied candidates; never guess CDN transformations.
function srcsetCandidates(value: string, base: string) {
  const candidates: Candidate[] = [];
  for (const m of value.matchAll(
    /(?:^|,)\s*(\S+?)\s+(\d+(?:\.\d+)?)(w|x)\s*(?=,|$)/g,
  )) {
    const width = Number(m[2]) * (m[3] === "x" ? 800 : 1);
    if (width > 0) candidates.push({ url: imageUrl(m[1], base), width });
  }
  return candidates;
}
export function bestSrcset(value: string, base: string) {
  return choose(srcsetCandidates(value, base));
}
export function feedImage(item: any, html: string, base: string) {
  const imageMedia = (m: any) =>
    m["@_url"] &&
    (m["@_medium"] === "image" ||
      String(m["@_type"] || "").startsWith("image/") ||
      (!m["@_medium"] &&
        !m["@_type"] &&
        /\.(?:jpe?g|png|webp|gif|avif)(?:[?#]|$)/i.test(m["@_url"])));
  const media = [
    ...feedArray(item["media:content"]),
    ...feedArray(item["media:group"]).flatMap((g) =>
      feedArray(g["media:content"]),
    ),
  ].filter(imageMedia);
  const enclosure = feedArray(item.enclosure).filter((m) =>
    String(m["@_type"] || m.type || "").startsWith("image/"),
  );
  const originals = [...media, ...enclosure].map((m) => ({
    url: imageUrl(m["@_url"] || m.url || m.link, base),
    width: Number(m["@_width"]) || 1200,
  }));
  const img = html.match(/<img\b[^>]*>/i)?.[0] || "";
  const srcset = img.match(/\ssrcset\s*=\s*["']([^"']+)["']/i)?.[1];
  const inline = srcset
    ? srcsetCandidates(srcset, base)
    : [
        {
          url: imageUrl(
            img.match(/\ssrc\s*=\s*["']([^"']+)["']/i)?.[1] || "",
            base,
          ),
          width: Number(img.match(/\swidth\s*=\s*["']?(\d+)/i)?.[1]) || 800,
        },
      ];
  return (
    choose([...originals, ...inline]) ||
    choose(
      feedArray(item["media:thumbnail"]).map((m) => ({
        url: imageUrl(m["@_url"], base),
        width: Number(m["@_width"]) || 300,
      })),
    ) ||
    imageUrl(typeof item.thumbnail === "string" ? item.thumbnail : "", base)
  );
}
