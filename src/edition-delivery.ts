import type { Edition, Article } from "./catalog";
export interface DeliveredEdition extends Edition {
  delivery: "all" | "selected" | "health";
}
function edition(value: unknown): Edition {
  const d = value as Edition;
  if (
    !d ||
    !Array.isArray(d.articles) ||
    !Array.isArray(d.statuses) ||
    typeof d.generatedAt !== "string"
  )
    throw new Error("Invalid edition");
  return d;
}
export async function loadEdition(
  base: string,
  scope: string,
  signal: AbortSignal,
): Promise<DeliveredEdition> {
  const full = new URL(base + "data/edition.json", location.origin);
  const get = async (url: URL) => {
    const response = await fetch(url, {
      cache: "no-cache",
      signal,
      priority: "high",
    });
    if (!response.ok) throw new Error("News unavailable");
    return response.json();
  };
  if (scope !== "*") {
    try {
      // Capability negotiation also keeps older static hosts and existing feed fixtures working.
      const capability = await fetch(full, {
        method: "HEAD",
        cache: "no-cache",
        signal,
      });
      if (capability.headers.get("X-Fylogia-Index") === "1") {
        const indexUrl = new URL("source-index.json", full),
          index = await get(indexUrl);
        if (
          index.version !== 1 ||
          !Array.isArray(index.sources) ||
          !Array.isArray(index.statuses) ||
          typeof index.generatedAt !== "string"
        )
          throw new Error("Invalid source index");
        if (scope === "health")
          return {
            generatedAt: index.generatedAt,
            statuses: index.statuses,
            articles: [],
            delivery: "health",
          };
        const wanted = new Set(scope.split("\n").filter(Boolean));
        const selected = index.sources.filter((s: { id: string }) =>
          wanted.has(s.id),
        );
        const articles = new Map<string, Article>();
        // Bounded batches avoid a flood of parallel requests when many sources are followed.
        for (let offset = 0; offset < selected.length; offset += 6) {
          const batch = await Promise.all(
            selected
              .slice(offset, offset + 6)
              .map(async (s: { file: string }) => {
                if (
                  typeof s.file !== "string" ||
                  !/^source-files\/[0-9a-f]{16}\.json$/.test(s.file)
                )
                  throw new Error("Invalid source path");
                const value = await get(new URL(s.file, indexUrl));
                if (
                  value.generatedAt !== index.generatedAt ||
                  !Array.isArray(value.articles)
                )
                  throw new Error("Edition changed during retrieval");
                return value.articles as Article[];
              }),
          );
          for (const items of batch)
            for (const a of items) articles.set(a.id, a);
        }
        return {
          generatedAt: index.generatedAt,
          statuses: index.statuses,
          articles: [...articles.values()],
          delivery: "selected",
        };
      }
    } catch (error) {
      if (signal.aborted)
        throw error; /* Full edition is the safe offline/legacy fallback. */
    }
  }
  return { ...edition(await get(full)), delivery: "all" };
}
