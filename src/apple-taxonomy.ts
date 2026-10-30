import type { Article, Preferences, Source } from "./catalog";

// Canonical preference strings preserve the seven original Apple choices.
export const appleSections = [
  {
    id: "iphone",
    name: "iPhone",
    group: "products",
    detail:
      "All models · Pro & Pro Max · Foldables · Cameras · Batteries · Accessories · Reviews",
    pattern: /\biPhones?\b/i,
  },
  {
    id: "ipad",
    name: "iPad",
    group: "products",
    detail:
      "Pro · Air · mini · iPad · Apple Pencil · Magic Keyboard · Productivity",
    pattern: /\biPads?\b|\bApple Pencil\b|\biPadOS\b/i,
  },
  {
    id: "mac",
    name: "Mac",
    group: "products",
    detail:
      "MacBook Air & Pro · iMac · Mac mini, Studio & Pro · Apple silicon · Displays",
    pattern:
      /\b(?:MacBooks?|iMacs?|Mac (?:mini|Studio|Pro)|Apple silicon|macOS|M\d{1,2}\s+(?:Pro|Max|Ultra))\b/i,
  },
  {
    id: "watch",
    name: "Apple Watch",
    group: "products",
    detail: "Series · Ultra · SE · Health & fitness · Watch accessories",
    pattern: /\bApple Watch\b|\bwatchOS\b/i,
  },
  {
    id: "home",
    name: "Apple TV & Home",
    group: "products",
    detail:
      "Apple TV 4K · HomePod & mini · HomeKit · Apple Home · Matter & Thread",
    pattern: /\b(?:HomePods?|HomeKit|Apple Home|tvOS)\b|\bApple TV\s*4K\b/i,
  },
  {
    id: "audio",
    name: "AirPods & Audio",
    group: "products",
    detail: "AirPods · Pro · Max · Beats · Spatial Audio",
    pattern:
      /\b(?:AirPods?|Beats (?:Studio|Fit|Solo|Pill|Powerbeats)|Powerbeats|Spatial Audio)\b/i,
  },
  {
    id: "vision",
    name: "Apple Vision",
    group: "products",
    detail:
      "Vision Pro · visionOS · Spatial computing · Augmented & mixed reality",
    pattern: /\b(?:Apple Vision|Vision Pro|visionOS|spatial computing)\b/i,
  },
  {
    id: "accessories",
    name: "Apple Accessories",
    group: "products",
    detail: "Cases · MagSafe · Chargers · Keyboards & mice · Displays · AirTag",
    pattern:
      /\b(?:MagSafe|AirTags?|Magic (?:Keyboard|Mouse|Trackpad)|Studio Display|Pro Display XDR|Apple Pencil)\b/i,
  },
  {
    id: "ios",
    name: "iOS",
    group: "software",
    detail: "Updates · Features · Betas · Security · Compatibility",
    pattern: /\biOS\b/i,
  },
  {
    id: "ipados",
    name: "iPadOS",
    group: "software",
    detail: "Updates · Features · Betas · Security · Compatibility",
    pattern: /\biPadOS\b/i,
  },
  {
    id: "macos",
    name: "macOS",
    group: "software",
    detail: "Updates · Features · Betas · Security · Compatibility",
    pattern: /\bmacOS\b|\bOS X\b/i,
  },
  {
    id: "watchos",
    name: "watchOS",
    group: "software",
    detail: "Updates · Features · Betas · Security · Compatibility",
    pattern: /\bwatchOS\b/i,
  },
  {
    id: "tvos",
    name: "tvOS",
    group: "software",
    detail: "Updates · Features · Betas · Security · Compatibility",
    pattern: /\btvOS\b/i,
  },
  {
    id: "visionos",
    name: "visionOS",
    group: "software",
    detail: "Updates · Features · Betas · Security · Compatibility",
    pattern: /\bvisionOS\b/i,
  },
  {
    id: "intelligence",
    name: "Apple Intelligence & AI",
    group: "software",
    detail: "Apple Intelligence · Siri · On-device AI · Apple models",
    pattern:
      /\b(?:Apple Intelligence|Siri (?:AI|assistant|voice)|Foundation Models framework|Apple[^.!?]{0,80}(?:artificial intelligence|on.device AI))\b/i,
  },
  {
    id: "tv-plus",
    name: "Apple TV+",
    group: "services",
    detail: "Original films & series · Streaming · Service updates",
    pattern: /\bApple TV\s*(?:\+|Plus\b)/i,
  },
  {
    id: "music",
    name: "Apple Music",
    group: "services",
    detail: "Music · Discovery · Service updates",
    pattern: /\bApple Music\b/i,
  },
  {
    id: "arcade",
    name: "Apple Arcade",
    group: "services",
    detail: "Games · Releases · Service updates",
    pattern: /\bApple Arcade\b/i,
  },
  {
    id: "news-plus",
    name: "Apple News+",
    group: "services",
    detail: "Publications · Reading · Service updates",
    pattern: /\bApple News\s*(?:\+|Plus\b)/i,
  },
  {
    id: "icloud",
    name: "iCloud",
    group: "services",
    detail: "Storage · Photos · Backup · Privacy",
    pattern: /\biCloud\b/i,
  },
  {
    id: "fitness",
    name: "Apple Fitness+",
    group: "services",
    detail: "Workouts · Health · Service updates",
    pattern: /\bApple Fitness\s*(?:\+|Plus\b)/i,
  },
  {
    id: "wallet",
    name: "Apple Pay & Wallet",
    group: "services",
    detail: "Payments · Wallet · Digital keys & passes",
    pattern: /\bApple (?:Pay|Wallet|Card|Cash)\b/i,
  },
  {
    id: "apps",
    name: "App Store & Applications",
    group: "services",
    detail: "App Store · Apple-platform applications · App updates",
    pattern:
      /\b(?:App Store|TestFlight|Apple apps|iPhone apps|iPad apps|Mac apps)\b/i,
  },
  {
    id: "events",
    name: "Apple Events & Announcements",
    group: "company",
    detail: "Apple events · Keynotes · Product announcements",
    pattern:
      /\b(?:Apple (?:event|keynote|announces|introduces|unveils)|WWDC|Far Out|Wonderlust)\b/i,
  },
  {
    id: "rumors",
    name: "Apple Rumors & Leaks",
    group: "company",
    detail: "Unconfirmed reports · Leaks · Supply-chain reporting",
    pattern: /\b(?:rumou?rs?|leaks?|leaked|reportedly|allegedly)\b/i,
  },
  {
    id: "patents",
    name: "Apple Patents & Future Products",
    group: "company",
    detail: "Patents · Research · Concepts · Future products",
    pattern: /\b(?:patents?|Apple research|future Apple|Apple prototype)\b/i,
  },
  {
    id: "business",
    name: "Apple Business & Financial News",
    group: "company",
    detail: "Earnings · AAPL · Company news · Financial results",
    pattern:
      /\b(?:AAPL|earnings|financial results|quarterly results|Apple (?:revenue|business|shares|stock|CEO|CFO)|Tim Cook|John Ternus)\b/i,
  },
  {
    id: "developers",
    name: "Apple Developers & WWDC",
    group: "company",
    detail: "WWDC · SDKs · Xcode · Swift · Apple Developer news",
    pattern:
      /\b(?:WWDC|Xcode|SwiftUI|SwiftData|Apple Developer|Apple SDK|App Intents|StoreKit|WidgetKit)\b/i,
  },
] as const;
export type AppleId = (typeof appleSections)[number]["id"];
export type AppleSelection = AppleId | "all" | "software" | "services" | "more";
export const appleKinds = [
  "Rumor / leak",
  "Review",
  "Opinion",
  "Official announcement",
] as const;
export type AppleKind = (typeof appleKinds)[number];
const aliases: Record<string, string> = {
  "Apple TV": "home",
  "Apple Home": "home",
  HomeKit: "home",
  HomePod: "home",
  "Apple Intelligence": "intelligence",
  AirPods: "audio",
  "Vision Pro": "vision",
  Watch: "watch",
};
export function appleSection(value: string) {
  return appleSections.find(
    (s) => s.id === value || s.name === value || s.id === aliases[value],
  );
}
export function selectedApple(topics: readonly string[] = []): AppleId[] {
  return [
    ...new Set(
      topics.map((t) => appleSection(t)?.id).filter((v): v is AppleId => !!v),
    ),
  ];
}
export const applePublisherIds = [
  "apple",
  "macrumors",
  "9to5mac",
  "appleinsider-news",
  "macworld",
  "cult-of-mac",
  "six-colors",
  "daring-fireball",
  "512-pixels",
  "apple-developer-news",
  "idownloadblog",
  "the-mac-observer",
  "tidbits",
  "homekit-news",
  "applehome-authority",
  "9to5mac-arcade",
  "9to5mac-fitness",
];
const plain = (s: string = "") =>
  String(s || "")
    .slice(0, 16000)
    .replace(/<(script|style|nav|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&plus;|&#(?:0*43|x0*2b);/gi, "+")
    .replace(/&(?:nbsp|amp|quot|apos|#\d+);/g, " ")
    .replace(/\s+/g, " ");
export function publisherTags(item: Record<string, any>): string[] {
  const values = [item.category, item["dc:subject"]].flatMap((v) =>
    Array.isArray(v) ? v : v ? [v] : [],
  );
  return [
    ...new Set(
      values
        .map((v) =>
          plain(
            typeof v === "string"
              ? v
              : String(v?.["@_term"] || v?.["#text"] || ""),
          ),
        )
        .filter(Boolean),
    ),
  ]
    .slice(0, 24)
    .map((v) => v.slice(0, 100));
}
function cleanAppleEvidence(value: string) {
  let text = plain(value);
  const lower = text.toLowerCase(),
    attribution = lower.indexOf(" appeared first on");
  if (attribution >= 0) {
    const post = lower.lastIndexOf("the post ", attribution);
    text = text.slice(0, post >= 0 ? post : attribution);
  }
  return text.split(
    /Your source for (?:the latest )?Apple news|Read more:|Related articles|You may also like/i,
  )[0];
}
// Only supplied RSS text is considered. Classification never fetches publisher pages.
export function deriveApple(
  article: Pick<
    Article,
    "title" | "excerpt" | "content" | "url" | "sourceId" | "categories"
  > & { publisherTags?: string[] },
  suppliedBody = "",
): { topics: AppleId[]; kind?: AppleKind } {
  let path = "";
  try {
    path = decodeURIComponent(new URL(article.url).pathname).replaceAll(
      "-",
      " ",
    );
  } catch {}
  const primary = plain(
    [
      article.title,
      cleanAppleEvidence(article.excerpt),
      (article.publisherTags || []).join(" "),
      path,
    ].join(" "),
  );
  const dedicated = applePublisherIds.includes(article.sourceId);
  const body = cleanAppleEvidence(suppliedBody || article.content).slice(
    0,
    1800,
  );
  const text = (primary + " " + body).replace(
    /\bCisco IOS\b/gi,
    "Cisco router operating system",
  );
  const tech = article.categories.some((c) =>
    ["Apple", "Technology", "Computing", "Smart Home"].includes(c),
  );
  const evidence =
    /\b(?:iPhones?|iPads?|iOS|iPadOS|macOS|MacBooks?|iMacs?|Mac (?:mini|Studio|Pro)|watchOS|tvOS|visionOS|HomePods?|HomeKit|AirPods|AirTags?|MagSafe|Apple (?:Watch|Vision|Home|TV|Music|Arcade|News|Fitness|Pay|Wallet|Intelligence|silicon|Developer|Inc|CEO)|iCloud|Siri (?:AI|assistant|voice)|Powerbeats|Beats Studio|WWDC|Xcode|SwiftUI)\b/i;
  const macContext =
    (tech || dedicated) &&
    /\bMacs?\b/.test(primary) &&
    !/Fleetwood Mac|Mac and cheese/i.test(primary);
  const primaryExplicit = evidence.test(
    primary.replace(/\bCisco IOS\b/gi, "Cisco router operating system"),
  );
  const explicit = evidence.test(text);
  if (
    !dedicated &&
    !primaryExplicit &&
    !macContext &&
    !(tech && (/\bApple\b/i.test(primary) || explicit))
  )
    return { topics: [] };
  const tags = new Set<AppleId>(
    article.sourceId === "9to5mac-arcade"
      ? ["arcade"]
      : article.sourceId === "9to5mac-fitness"
        ? ["fitness"]
        : [],
  );
  const companyContext =
    explicit || /\bApple\b/i.test(primary) || article.sourceId === "apple";
  const owners: Record<string, AppleId> = {
    ios: "iphone",
    ipados: "ipad",
    macos: "mac",
    watchos: "watch",
    tvos: "home",
    visionos: "vision",
  };
  const primaryProducts = new Set(
    appleSections
      .filter((s) => s.group === "products" && s.pattern.test(primary))
      .map((s) => s.id as AppleId),
  );
  for (const s of appleSections)
    if (s.group === "software" && s.pattern.test(primary) && owners[s.id])
      primaryProducts.add(owners[s.id]);
  if (
    (dedicated || explicit || macContext) &&
    /\bMacs?\b/i.test(primary) &&
    !/Fleetwood Mac|Mac and cheese/i.test(primary)
  )
    primaryProducts.add("mac");
  for (const s of appleSections) {
    const direct = s.pattern.test(primary);
    if (
      !direct &&
      primaryProducts.size &&
      s.group === "products" &&
      s.id !== "accessories" &&
      !primaryProducts.has(s.id)
    )
      continue;
    if (
      !direct &&
      primaryProducts.size &&
      s.group === "software" &&
      owners[s.id] &&
      !primaryProducts.has(owners[s.id])
    )
      continue;
    if (s.group === "company" && !companyContext) continue;
    if (s.id === "apps" && !companyContext && !/\bMacs?\b/i.test(primary))
      continue;
    if (s.pattern.test(text)) tags.add(s.id);
  }
  if (
    (dedicated || explicit || macContext) &&
    /\bMacs?\b/i.test(primary) &&
    !/\b(?:Fleetwood Mac|Mac and cheese)\b/i.test(primary)
  )
    tags.add("mac");
  if (/\bApple TV\b/i.test(primary) && !tags.has("tv-plus"))
    tags.add(
      /\b(?:streaming|series|episodes?|seasons?|original films?)\b/i.test(
        primary,
      ) && !/\b(?:4K|hardware|set.top|remote)\b/i.test(primary)
        ? "tv-plus"
        : "home",
    );
  if (
    (explicit || tags.size > 0) &&
    /\b(?:phone cases?|protective cases?|cases? for|(?:iPhone|iPad)(?:\s+(?:\d+|Pro|Max|Air|mini|Duo|SE)){0,5}\s+cases?|screen protectors?|chargers?|accessories)\b/i.test(
      primary,
    )
  )
    tags.add("accessories");
  if (tags.has("ios")) tags.add("iphone");
  if (article.sourceId === "apple-developer-news") tags.add("developers");
  const typeText = plain(
    article.title + " " + (article.publisherTags || []).join(" "),
  );
  const kind: AppleKind | undefined = [
    "apple",
    "apple-developer-news",
  ].includes(article.sourceId)
    ? "Official announcement"
    : (companyContext || tags.size > 0) &&
        /\b(?:rumou?rs?|leaks?|leaked|reportedly|allegedly)\b/i.test(primary)
      ? "Rumor / leak"
      : !notProductReview.test(typeText) &&
          /\b(?:review|hands.on|tested)\b/i.test(typeText)
        ? "Review"
        : /\b(?:opinion|editorial|commentary)\b/i.test(typeText)
          ? "Opinion"
          : article.sourceId === "apple"
            ? "Official announcement"
            : undefined;
  if (kind === "Rumor / leak") tags.add("rumors");
  return { topics: [...tags], ...(kind ? { kind } : {}) };
}
const notProductReview =
  /\b(?:App Review|under review|judicial review|review guidelines)\b/i;
const classificationCache = new WeakMap<
  Article,
  { topics: AppleId[]; kind?: AppleKind }
>();
export function classifyApple(article: Article) {
  let result = classificationCache.get(article);
  if (result) return result;
  if (article.apple && Array.isArray(article.apple.topics)) {
    const topics = article.apple.topics.filter((id): id is AppleId =>
      appleSections.some((s) => s.id === id),
    );
    result = {
      topics: [...new Set(topics)],
      ...(appleKinds.includes(article.apple.kind as AppleKind)
        ? { kind: article.apple.kind as AppleKind }
        : {}),
    };
  } else result = deriveApple(article);
  for (const [os, product] of [
    ["ios", "iphone"],
    ["ipados", "ipad"],
    ["macos", "mac"],
    ["watchos", "watch"],
    ["tvos", "home"],
    ["visionos", "vision"],
  ] as const)
    if (result.topics.includes(os) && !result.topics.includes(product))
      result.topics.push(product);
  if (result.kind === "Review" && notProductReview.test(article.title))
    delete result.kind;
  if (["apple", "apple-developer-news"].includes(article.sourceId))
    result.kind = "Official announcement";
  classificationCache.set(article, result);
  return result;
}
export function matchesApple(article: Article, selection: AppleSelection) {
  if (selection === "all") return true;
  const ids = classifyApple(article).topics;
  const group = selection === "more" ? "company" : selection;
  return ids.some(
    (id) =>
      id === selection ||
      appleSections.some((s) => s.id === id && s.group === group),
  );
}
export function applePreferenceScore(
  article: Article,
  prefs: Pick<Preferences, "topics">,
) {
  const chosen = selectedApple(prefs.topics);
  return chosen.reduce((score, id) => score + appleRelevance(article, id), 0);
}
export function appleSourceTopics(source: Pick<Source, "id">): string[] {
  if (source.id === "9to5mac-arcade") return ["Apple Arcade"];
  if (source.id === "9to5mac-fitness") return ["Apple Fitness+"];
  if (source.id === "apple-developer-news")
    return ["Apple Developers & WWDC", "iOS", "iPadOS", "macOS", "visionOS"];
  if (["homekit-news", "applehome-authority"].includes(source.id))
    return ["Apple TV & Home"];
  return sourceHasAppleCoverage(source.id)
    ? appleSections.map((s) => s.name)
    : [];
}

export function sourceHasAppleCoverage(id: string) {
  return (
    applePublisherIds.includes(id) || ["the-verge", "arstechnica"].includes(id)
  );
}
export function appleSearchMatches(article: Article, query: string) {
  const words = query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const text = plain(
    [
      article.title,
      article.source,
      article.excerpt,
      (article.content || "").slice(0, 8000),
      ...(article.publisherTags || []),
      ...classifyApple(article).topics.map(
        (id) => appleSection(id)?.name || id,
      ),
    ].join(" "),
  ).toLocaleLowerCase();
  return words.every((word) => text.includes(word));
}
// A focused product headline leads over a secondary compatibility mention.
export function appleRelevance(article: Article, selection: AppleSelection) {
  const section = appleSection(selection);
  if (!section || !classifyApple(article).topics.includes(section.id)) return 0;
  const direct =
    section.pattern.test(article.title) ||
    (section.id === "mac" && /\bMacs?\b/i.test(article.title));
  const metadata = section.pattern.test(
    (article.publisherTags || []).join(" "),
  );
  return (
    (direct ? 6 : metadata ? 3 : 1) +
    (applePublisherIds.includes(article.sourceId) ? 1 : 0)
  );
}

export function appleRecommendationBoost(
  source: Pick<Source, "id" | "topics">,
  topics: readonly string[] = [],
) {
  if (
    ![
      "9to5mac-arcade",
      "9to5mac-fitness",
      "homekit-news",
      "applehome-authority",
      "apple-developer-news",
    ].includes(source.id)
  )
    return 0;
  const chosen = selectedApple(topics);
  return selectedApple(source.topics).some((id) => chosen.includes(id))
    ? 12
    : 0;
}
