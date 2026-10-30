import test from "node:test";
import assert from "node:assert/strict";
import {
  appleSections,
  appleSection,
  selectedApple,
  deriveApple,
  classifyApple,
  matchesApple,
  applePreferenceScore,
  publisherTags,
  appleSearchMatches,
  appleRelevance,
} from "../src/apple-taxonomy.ts";
import { defaults, sources, subcategories } from "../src/catalog.ts";
import { feedArticle } from "../scripts/feed-content.mjs";
import {
  deduplicateArticles,
  sourceMatches,
  withCurrentCategories,
  recommendSources,
} from "../src/source-utils.ts";
import { normalizeLibraryValue } from "../src/library-data.ts";
import { createDailyMagazine } from "../src/daily-magazine.ts";
const story = (change = {}) => ({
  id: "https://publisher.test/story",
  url: "https://publisher.test/story",
  sourceId: "the-verge",
  source: "The Verge",
  title: "Publisher story",
  excerpt: "",
  content: "",
  full: false,
  published: "2026-10-30T12:00:00Z",
  categories: ["Technology"],
  region: "Worldwide",
  ...change,
});
test("28 Apple topics are unique and original preference tokens and aliases survive", () => {
  assert.equal(appleSections.length, 28);
  assert.equal(new Set(appleSections.map((s) => s.id)).size, 28);
  assert.equal(new Set(subcategories.Apple).size, 28);
  for (const t of [
    "iPhone",
    "iPad",
    "Mac",
    "macOS",
    "iOS",
    "iPadOS",
    "Apple Watch",
  ])
    assert.ok(subcategories.Apple.includes(t));
  assert.deepEqual(
    selectedApple([
      "Apple Home",
      "Apple TV",
      "HomePod",
      "Apple Intelligence",
      "iPhone",
    ]),
    ["home", "intelligence", "iphone"],
  );
  assert.equal(appleSection("AirPods").id, "audio");
});
test("classification uses supplied text and RSS/Atom metadata beyond headlines", () => {
  const a = story({
    publisherTags: ["iPadOS"],
    content:
      "<p>New compatibility features are available for iPad Pro and Apple Pencil.</p>",
  });
  assert.ok(classifyApple(a).topics.includes("ipados"));
  assert.ok(classifyApple(a).topics.includes("ipad"));
  assert.ok(classifyApple(a).topics.includes("accessories"));
  assert.deepEqual(
    publisherTags({
      category: [{ "@_term": "HomePod" }, "#example", "HomePod"],
    }),
    ["HomePod", "#example"],
  );
  assert.ok(
    deriveApple(
      story({ publisherTags: ["HomePod", "Matter"] }),
    ).topics.includes("home"),
  );
});
test("all products, operating systems, services and company sections have bounded evidence rules", () => {
  const cases = {
    iphone: "iPhone Pro camera review",
    ipad: "iPad Air productivity",
    mac: "MacBook Air and Apple silicon",
    watch: "Apple Watch Ultra fitness",
    home: "HomePod Matter update",
    audio: "AirPods Pro release",
    vision: "Apple Vision Pro spatial computing",
    accessories: "MagSafe charger for iPhone",
    ios: "iOS security update",
    ipados: "iPadOS beta",
    macos: "macOS compatibility update",
    watchos: "watchOS beta",
    tvos: "tvOS software update",
    visionos: "visionOS new features",
    intelligence: "Apple Intelligence Siri announcement",
    "tv-plus": "Apple TV+ original series",
    music: "Apple Music playlists",
    arcade: "Apple Arcade releases",
    "news-plus": "Apple News+ publications",
    icloud: "iCloud backup",
    fitness: "Apple Fitness+ workout",
    wallet: "Apple Pay Wallet update",
    apps: "iPhone App Store applications",
    events: "Apple announces a new event",
    rumors: "iPhone rumors and leaks",
    patents: "Apple patent for an iPhone",
    business: "Apple earnings and AAPL stock",
    developers: "Apple Developer WWDC Xcode SDK",
  };
  for (const [id, title] of Object.entries(cases))
    assert.ok(deriveApple(story({ title })).topics.includes(id), id);
});
test("operating systems also tag their related products, without duplicate categories", () => {
  for (const [os, product] of [
    ["iPadOS", "ipad"],
    ["macOS", "mac"],
    ["watchOS", "watch"],
    ["tvOS", "home"],
    ["visionOS", "vision"],
  ]) {
    const ids = deriveApple(story({ title: os + " update" })).topics;
    assert.ok(ids.includes(product));
    assert.equal(ids.length, new Set(ids).size);
  }
  assert.ok(
    deriveApple(story({ title: "iOS update" })).topics.includes("iphone"),
  );
});
test("generic watches, Android apps, television, AI and unrelated music are not Apple products", () => {
  for (const title of [
    "Samsung Galaxy Watch review",
    "Android app store changes",
    "Google AI models",
    "Meta Quest mixed reality review",
    "Fleetwood Mac album review",
    "Apple harvest brings record fruit sales",
  ])
    assert.deepEqual(
      deriveApple(story({ title, categories: ["World News"] })).topics,
      [],
      title,
    );
});
test("Apple TV hardware and streaming service stay distinct", () => {
  assert.ok(
    matchesApple(story({ title: "Apple TV 4K remote review" }), "home"),
  );
  assert.equal(
    matchesApple(story({ title: "Apple TV+ original series" }), "home"),
    false,
  );
  assert.ok(
    matchesApple(
      story({ title: "Apple TV original series starts streaming" }),
      "tv-plus",
    ),
  );
  assert.equal(
    matchesApple(story({ title: "Apple TV 4K hardware launch" }), "tv-plus"),
    false,
  );
});
test("rumor, review, opinion and official labels are evidence based, not publisher-name guesses", () => {
  assert.equal(
    classifyApple(
      story({ sourceId: "macrumors", title: "Apple releases iOS update" }),
    ).kind,
    undefined,
  );
  assert.equal(
    classifyApple(story({ title: "iPhone reportedly gains a new camera" }))
      .kind,
    "Rumor / leak",
  );
  assert.equal(
    classifyApple(story({ title: "iPhone camera review" })).kind,
    "Review",
  );
  assert.equal(
    classifyApple(
      story({
        title: "Apple changes its approach",
        publisherTags: ["Opinion"],
      }),
    ).kind,
    "Opinion",
  );
  assert.equal(
    classifyApple(story({ sourceId: "apple", title: "Apple introduces iPad" }))
      .kind,
    "Official announcement",
  );
});
test("RSS raw body supplies classification without storing unlicensed full article content", () => {
  const a = feedArticle(
    {
      title: "A new approach",
      link: "https://publisher.test/apple",
      pubDate: "Fri, 30 Oct 2026 12:00:00 GMT",
      category: ["Apple", "Software"],
      "content:encoded":
        "<h2>Update</h2><p>" +
        "The new iPadOS update brings iPad productivity features. ".repeat(45) +
        "</p>",
    },
    {
      id: "the-verge",
      name: "The Verge",
      categories: ["Technology"],
      region: "Worldwide",
    },
  );
  assert.ok(a.apple.topics.includes("ipados"));
  assert.ok(a.apple.topics.includes("ipad"));
  assert.equal(a.full, false);
  assert.ok(a.content.length < 1000);
  assert.equal(a.publisherTags[0], "Apple");
});
test("duplicate handling retains both publisher topic contexts and classification labels", () => {
  const base = story({
    title: "iPadOS software news with a sufficiently long unique headline",
    apple: { topics: ["ipad"], kind: "Review" },
    publisherTags: ["iPad"],
  });
  const merged = deduplicateArticles([
    { id: "first", articles: [base] },
    {
      id: "second",
      articles: [
        { ...base, apple: { topics: ["ipados"] }, publisherTags: ["iPadOS"] },
      ],
    },
  ]);
  assert.equal(merged.articles.length, 1);
  assert.deepEqual(
    new Set(merged.articles[0].apple.topics),
    new Set(["ipad", "ipados"]),
  );
  assert.equal(merged.articles[0].apple.kind, "Review");
  assert.deepEqual(
    new Set(merged.articles[0].publisherTags),
    new Set(["iPad", "iPadOS"]),
  );
});
test("general technology sources add only relevant stories to Apple and are discoverable", () => {
  const source = sources.find((s) => s.id === "arstechnica");
  const directory = new Map([[source.id, source]]);
  assert.ok(sourceMatches(source, "", "Apple", "All regions", "All content"));
  assert.ok(
    withCurrentCategories(
      story({ sourceId: source.id, title: "MacBook Pro review" }),
      directory,
    ).categories.includes("Apple"),
  );
  assert.equal(
    withCurrentCategories(
      story({ sourceId: source.id, title: "Linux kernel update" }),
      directory,
    ).categories.includes("Apple"),
    false,
  );
});
test("Apple product scoring favors followed products without hiding other interests", () => {
  const prefs = {
    ...defaults,
    complete: true,
    interests: ["Apple", "Space"],
    topics: ["iPad"],
    sourceIds: ["apple", "nasa"],
  };
  const ipad = story({ id: "ipad", sourceId: "apple", title: "iPad camera" }),
    phone = story({ id: "phone", sourceId: "apple", title: "iPhone camera" });
  assert.ok(
    applePreferenceScore(ipad, prefs) > applePreferenceScore(phone, prefs),
  );
  const daily = createDailyMagazine(
    [ipad, phone],
    prefs,
    new Date("2026-10-30T13:00:00Z"),
  );
  assert.equal(daily.stories[0].id, "ipad");
  assert.ok(daily.stories.some((s) => s.id === "phone"));
  assert.ok(recommendSources(sources, prefs, []).some((s) => s.id === "apple"));
});
test("Apple classification survives library backup normalization without changing old article compatibility", () => {
  const a = story({
    apple: { topics: ["ipad", "ipados"], kind: "Review" },
    publisherTags: ["iPadOS"],
  });
  const [restored] = normalizeLibraryValue("saved", [a]);
  assert.deepEqual(restored.apple, a.apple);
  assert.deepEqual(restored.publisherTags, a.publisherTags);
  assert.equal(
    normalizeLibraryValue("saved", [story()])[0].title,
    "Publisher story",
  );
  const invalid = normalizeLibraryValue("saved", [
    story({ apple: { topics: ["not-a-topic"] } }),
  ])[0];
  assert.equal(invalid.apple, undefined);
});

test("Apple search matches separate product terms while the selected topic remains authoritative", () => {
  const a = story({
    title: "iPhone Pro Max gets a new camera",
    publisherTags: ["Photography"],
  });
  assert.ok(appleSearchMatches(a, "iPhone camera"));
  assert.ok(matchesApple(a, "iphone"));
  assert.equal(matchesApple(a, "ipad"), false);
  assert.equal(appleSearchMatches(a, "iPhone batteries"), false);
});

test("an Apple publisher does not make unrelated product, company or router stories Apple sections", () => {
  for (const title of [
    "Samsung Galaxy camera rumors",
    "NVIDIA earnings report",
    "Android app store update",
    "Samsung phone cases",
  ]) {
    assert.deepEqual(
      deriveApple(story({ sourceId: "9to5mac", title })).topics,
      [],
      title,
    );
  }
  assert.deepEqual(
    deriveApple(story({ title: "Cisco IOS security update" })).topics,
    [],
  );
});
test("publisher-advertised service feeds supply scoped metadata without fabricating article bodies", () => {
  const a = feedArticle(
    {
      title: "New games available this month",
      link: "https://9to5mac.com/example",
      description: "Publisher preview",
      pubDate: "Fri, 30 Oct 2026 12:00:00 GMT",
    },
    {
      id: "9to5mac-arcade",
      name: "9to5Mac · Apple Arcade",
      categories: ["Apple"],
      region: "Worldwide",
    },
  );
  assert.ok(a.apple.topics.includes("arcade"));
  assert.equal(a.full, false);
});

test("scientist names, unrelated world stories and late related-story footers are not Apple evidence", () => {
  assert.deepEqual(
    deriveApple(
      story({
        title: "AI model decodes cells",
        content:
          "<p>Researcher Siri studies cells using artificial intelligence.</p>",
      }),
    ).topics,
    [],
  );
  assert.deepEqual(
    deriveApple(
      story({
        title: "Royal appearances",
        categories: ["Entertainment"],
        content:
          "<p>The princess once used an iPad at a public appearance.</p>",
      }),
    ).topics,
    [],
  );
  assert.deepEqual(
    deriveApple(
      story({
        title: "Surface wallpapers",
        content:
          "<p>" +
          "Windows wallpaper design. ".repeat(150) +
          "</p><p>Related: iOS update</p>",
      }),
    ).topics,
    [],
  );
});

test("an iPhone legal case is not a phone accessory", () => {
  assert.equal(
    deriveApple(
      story({ title: "iPhone customs row triggers a police case" }),
    ).topics.includes("accessories"),
    false,
  );
  assert.ok(
    deriveApple(
      story({ title: "iPhone 18 Pro Max cases reviewed" }),
    ).topics.includes("accessories"),
  );
});

test("a focused iPhone story does not become a Mac or macOS story through secondary body mentions", () => {
  const a = story({
    sourceId: "macworld",
    title: "14 new things your iPhone can do in iOS 27",
    content:
      "<p>New iPhone camera features are available. Some comparisons mention macOS on MacBook Pro.</p>",
  });
  const tags = deriveApple(a).topics;
  assert.ok(tags.includes("iphone"));
  assert.ok(tags.includes("ios"));
  assert.equal(tags.includes("macos"), false);
  assert.equal(tags.includes("mac"), false);
  assert.ok(
    deriveApple(
      story({
        title: "A new approach",
        content: "<p>The new macOS release updates MacBook features.</p>",
      }),
    ).topics.includes("macos"),
  );
});

test("a focused product headline ranks above a secondary platform mention", () => {
  const direct = story({ title: "iPhone Pro camera review" }),
    compatibility = story({
      title: "YouTube playback bug",
      content: "<p>The bug also affects iPhone viewers.</p>",
    });
  assert.ok(
    appleRelevance(direct, "iphone") > appleRelevance(compatibility, "iphone"),
  );
});

test("following a service recommends its scoped feed and delivers matching stories", () => {
  for (const [topic, id] of [
    ["Apple Arcade", "9to5mac-arcade"],
    ["Apple Fitness+", "9to5mac-fitness"],
  ]) {
    const picks = recommendSources(
      sources,
      { interests: ["Apple"], region: "Worldwide", topics: [topic] },
      [],
      3,
    );
    assert.ok(
      picks.some((s) => s.id === id),
      topic,
    );
  }
});
test("publisher attribution and taglines are never primary article evidence", () => {
  const footer =
    " The post New HomePod mini 2 availability appeared first on Cult of Mac. Your source for the latest Apple news, rumors, analysis, reviews, how-tos and deals.";
  const a = story({
    sourceId: "cult-of-mac",
    title: "HomePod mini 2 is now available",
    excerpt: "Orders are shipping today." + footer,
    content: "<p>HomePod mini 2 is available.</p><p>" + footer + "</p>",
  });
  const c = deriveApple(a);
  assert.ok(c.topics.includes("home"));
  assert.equal(c.topics.includes("mac"), false);
  assert.equal(c.topics.includes("rumors"), false);
  assert.equal(c.kind, undefined);
  assert.equal(
    deriveApple({
      ...a,
      title: "iPhone webcam review",
      excerpt: "We tested the webcam." + footer,
    }).kind,
    "Review",
  );
});
test("general tech feeds recognize Mac product names and contextual metadata at the evidence gate", () => {
  for (const title of [
    "Mac mini review",
    "Mac Studio gains new ports",
    "Mac.apk runs Android apps on my Mac",
  ]) {
    assert.ok(
      deriveApple(
        story({ sourceId: "android-police", title, publisherTags: ["Mac"] }),
      ).topics.includes("mac"),
      title,
    );
  }
  assert.deepEqual(
    deriveApple(story({ title: "MAC address randomization" })).topics,
    [],
  );
  assert.deepEqual(
    deriveApple(story({ title: "Fleetwood Mac review" })).topics,
    [],
  );
});
