import { appleSources } from "./apple-sources.ts";
import { appleSections, appleSourceTopics } from "./apple-taxonomy.ts";
import { sports, topicsForSportsSource } from "./sports-taxonomy.ts";
import { sportsSources } from "./sports-sources.ts";
import { lifestyleSources } from "./lifestyle-sources.ts";
import { sourceTopics } from "./interest-taxonomy.ts";
import { interestSources } from "./interest-sources.ts";
export { interestGroups } from "./interest-taxonomy.ts";
import { expandedSources } from "./expanded-sources.ts";
export const categories = [
  "Technology",
  "Apple",
  "AI",
  "Smart Home",
  "3D Printing",
  "Science",
  "Space",
  "Aviation",
  "Travel",
  "Cars",
  "Economy",
  "Business",
  "Politics",
  "World News",
  "Health",
  "Healthy Food",
  "Cooking",
  "Sports",
  "Gaming",
  "Photography",
  "Entertainment",
  "Computing",
  "Architecture",
  "Engineering",
  "History & Culture",
  "Marine",
  "Men’s Fashion",
  "Women’s Fashion",
  "Watches & Jewelry",
  "Luxury & Lifestyle",
  "Nature & Environment",
  "Home & Garden",
] as const;
export const regions = [
  "Worldwide",
  "Middle East",
  "Europe",
  "United States",
  "India",
  "Asia",
];
export const subcategories: Record<string, string[]> = {
  "Men’s Fashion": [
    "Menswear",
    "Luxury menswear",
    "Streetwear",
    "Sneakers",
    "Shoes",
    "Accessories",
    "Grooming",
    "Fragrances",
    "Designers",
    "Fashion weeks",
    "Seasonal collections",
  ],
  "Women’s Fashion": [
    "Womenswear",
    "Luxury fashion",
    "Streetwear",
    "Shoes",
    "Handbags",
    "Beauty",
    "Makeup",
    "Skincare",
    "Fragrances",
    "Designers",
    "Fashion weeks",
    "Seasonal collections",
  ],
  "Watches & Jewelry": [
    "Luxury watches",
    "Smartwatches",
    "Watchmaking",
    "Jewelry",
    "New releases",
  ],
  "Luxury & Lifestyle": [
    "Luxury living",
    "Premium products",
    "Luxury travel",
    "Experiences",
  ],
  "Nature & Environment": [
    "Wildlife",
    "Conservation",
    "Climate",
    "Sustainability",
  ],
  "Home & Garden": ["Home improvement", "Gardening", "Decoration", "Furniture"],
  Technology: ["Gadgets", "Software", "Cybersecurity", "Innovation"],
  Apple: appleSections.map((section) => section.name),
  AI: ["Research", "Tools", "Robotics"],
  "Smart Home": ["Home Assistant", "Automation", "Matter"],
  "3D Printing": ["Printers", "Materials", "Design"],
  Science: ["Climate", "Physics", "Biology"],
  Space: ["Astronomy", "Missions"],
  Aviation: ["Airlines", "Aircraft"],
  Travel: ["Destinations", "Culture"],
  Cars: [
    "Electric vehicles",
    "Motorsport",
    "Mobility",
    "Concept cars",
    "Automotive technology",
  ],
  Economy: ["Markets", "Policy"],
  Business: ["Startups", "Companies"],
  Politics: ["Elections", "Policy"],
  "World News": ["Diplomacy", "Current affairs"],
  Health: [
    "Research",
    "Wellbeing",
    "Fitness",
    "Exercise",
    "Wellness",
    "Nutrition",
  ],
  "Healthy Food": ["Nutrition", "Plant-based"],
  Cooking: [
    "Recipes",
    "Techniques",
    "Restaurants",
    "Food culture",
    "Drinks",
    "Culinary travel",
  ],
  Sports: sports.map((sport) => sport.topic),
  Gaming: ["PC", "Console", "Indie", "Esports"],
  Photography: [
    "Cameras",
    "Technique",
    "Digital art",
    "Creative software",
    "Visual design",
  ],
  Entertainment: [
    "Film",
    "Music",
    "Books",
    "Television",
    "Streaming",
    "Culture",
  ],
  Computing: [
    "Operating systems",
    "Linux",
    "Windows",
    "macOS",
    "PC hardware",
    "Laptops",
    "Networking",
    "Open source",
    "Software",
  ],
  Architecture: [
    "Buildings",
    "Interiors",
    "Urban design",
    "Sustainable design",
  ],
  Engineering: [
    "Civil engineering",
    "Construction",
    "Materials",
    "Facades",
    "Manufacturing",
    "Robotics",
  ],
  "History & Culture": ["History", "Archaeology", "Heritage", "Culture"],
  Marine: [
    "Diving",
    "Sailing",
    "Marine engineering",
    "Ocean science",
    "Boating",
  ],
};
export interface Source {
  id: string;
  name: string;
  url: string;
  site: string;
  categories: string[];
  topics?: string[];
  region: string;
  full?: boolean;
  custom?: boolean;
  validatedAt?: string;
  permissionUrl?: string;
  licenseLabel?: string;
  fullBodyField?: "description";
}
const catalogSources: Source[] = [
  {
    id: "global-voices",
    name: "Global Voices",
    url: "https://globalvoices.org/feed/",
    site: "https://globalvoices.org",
    categories: ["World News", "Politics", "Technology"],
    region: "Worldwide",
    full: true,
  },
  {
    id: "nasa-science",
    name: "NASA Science",
    url: "https://science.nasa.gov/feed/",
    site: "https://science.nasa.gov",
    categories: ["Science", "Space"],
    region: "Worldwide",
    full: true,
  },
  {
    id: "nasa",
    name: "NASA",
    url: "https://www.nasa.gov/feed/",
    site: "https://www.nasa.gov",
    categories: ["Space", "Science", "Aviation", "Technology"],
    region: "Worldwide",
    full: true,
  },
  {
    id: "bbc-world",
    name: "BBC · World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    site: "https://www.bbc.com/news/world",
    categories: ["World News", "Politics"],
    region: "Worldwide",
  },
  {
    id: "bbc-tech",
    name: "BBC · Technology",
    url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
    site: "https://www.bbc.com/news/technology",
    categories: ["Technology", "AI", "Smart Home"],
    region: "Worldwide",
  },
  {
    id: "bbc-business",
    name: "BBC · Business",
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    site: "https://www.bbc.com/news/business",
    categories: ["Business", "Economy"],
    region: "Worldwide",
  },
  {
    id: "bbc-health",
    name: "BBC · Health",
    url: "https://feeds.bbci.co.uk/news/health/rss.xml",
    site: "https://www.bbc.com/news/health",
    categories: ["Health", "Healthy Food"],
    region: "Worldwide",
  },
  {
    id: "bbc-science",
    name: "BBC · Science",
    url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    site: "https://www.bbc.com/news/science_and_environment",
    categories: ["Science", "Space"],
    region: "Worldwide",
  },
  {
    id: "bbc-sport",
    name: "BBC · Sport",
    url: "https://feeds.bbci.co.uk/sport/rss.xml",
    site: "https://www.bbc.com/sport",
    categories: ["Sports"],
    region: "Worldwide",
  },
  {
    id: "bbc-entertainment",
    name: "BBC · Culture",
    url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml",
    site: "https://www.bbc.com/news/entertainment_and_arts",
    categories: ["Entertainment", "Photography"],
    region: "Worldwide",
  },
  {
    id: "bbc-me",
    name: "BBC · Middle East",
    url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    site: "https://www.bbc.com/news/world/middle_east",
    categories: ["World News", "Politics"],
    region: "Middle East",
  },
  {
    id: "bbc-europe",
    name: "BBC · Europe",
    url: "https://feeds.bbci.co.uk/news/world/europe/rss.xml",
    site: "https://www.bbc.com/news/world/europe",
    categories: ["World News", "Politics"],
    region: "Europe",
  },
  {
    id: "bbc-us",
    name: "BBC · US & Canada",
    url: "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml",
    site: "https://www.bbc.com/news/world/us_and_canada",
    categories: ["World News", "Politics"],
    region: "United States",
  },
  {
    id: "bbc-asia",
    name: "BBC · Asia",
    url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml",
    site: "https://www.bbc.com/news/world/asia",
    categories: ["World News", "Politics"],
    region: "Asia",
  },
  {
    id: "hindu",
    name: "The Hindu · India",
    url: "https://www.thehindu.com/news/national/feeder/default.rss",
    site: "https://www.thehindu.com",
    categories: ["World News", "Politics"],
    region: "India",
  },
  {
    id: "apple",
    name: "Apple Newsroom",
    url: "https://www.apple.com/newsroom/rss-feed.rss",
    site: "https://www.apple.com/newsroom/",
    categories: ["Apple", "Technology"],
    region: "Worldwide",
  },
  {
    id: "homeassistant",
    name: "Home Assistant",
    url: "https://www.home-assistant.io/atom.xml",
    site: "https://www.home-assistant.io",
    categories: ["Smart Home", "Technology"],
    region: "Worldwide",
    full: true,
  },
  {
    id: "3dprint",
    name: "3DPrint.com",
    url: "https://3dprint.com/feed/",
    site: "https://3dprint.com",
    categories: ["3D Printing", "Technology"],
    region: "Worldwide",
  },
  {
    id: "mit-ai",
    name: "MIT News · AI",
    url: "https://news.mit.edu/rss/topic/artificial-intelligence2",
    site: "https://news.mit.edu",
    categories: ["AI", "Science", "Technology"],
    region: "Worldwide",
    full: true,
  },
  {
    id: "arstechnica",
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    site: "https://arstechnica.com",
    categories: ["Technology", "Gaming", "AI"],
    region: "Worldwide",
  },
  {
    id: "aviation",
    name: "Simple Flying",
    url: "https://simpleflying.com/feed/",
    site: "https://simpleflying.com",
    categories: ["Aviation", "Travel"],
    region: "Worldwide",
  },
  {
    id: "travel",
    name: "The Guardian · Travel",
    url: "https://www.theguardian.com/travel/rss",
    site: "https://www.theguardian.com/travel",
    categories: ["Travel"],
    region: "Worldwide",
  },
  {
    id: "cars",
    name: "Autoblog",
    url: "https://www.autoblog.com/rss.xml",
    site: "https://www.autoblog.com",
    categories: ["Cars"],
    region: "Worldwide",
  },
  {
    id: "food",
    name: "The Guardian · Food",
    url: "https://www.theguardian.com/food/rss",
    site: "https://www.theguardian.com/food",
    categories: ["Cooking", "Healthy Food"],
    region: "Worldwide",
  },
  {
    id: "gaming",
    name: "PC Gamer",
    url: "https://www.pcgamer.com/rss/",
    site: "https://www.pcgamer.com",
    categories: ["Gaming"],
    region: "Worldwide",
  },
  {
    id: "photo",
    name: "PetaPixel",
    url: "https://petapixel.com/feed/",
    site: "https://petapixel.com",
    categories: ["Photography"],
    region: "Worldwide",
  },
  ...expandedSources,
  ...interestSources,
  ...lifestyleSources,
  ...sportsSources,
  ...appleSources,
];
export const sources: Source[] = catalogSources.map((source) => {
  const detail = sourceTopics[source.id];
  const sportTopics = topicsForSportsSource(source.id);
  const appleTopics = appleSourceTopics(source);
  return detail || sportTopics.length || appleTopics.length
    ? {
        ...source,
        categories: [
          ...new Set([...source.categories, ...(detail?.categories || [])]),
        ],
        topics: [
          ...new Set([
            ...(source.topics || []),
            ...(detail?.topics || []),
            ...sportTopics,
            ...appleTopics,
          ]),
        ],
      }
    : source;
});
export interface ContentDetails {
  availability:
    "full" | "body-unverified" | "preview" | "subscription" | "unavailable";
  authorization: "permitted" | "unverified";
  method: "rss-content" | "rss-description" | "rss-summary" | "legacy-feed";
  retrievedAt: string;
  completeness: "publisher-body" | "excerpt" | "unknown";
}
export interface Article {
  publisherTags?: string[];
  apple?: { topics: string[]; kind?: string };
  contentDetails?: ContentDetails;
  feedContexts?: { sourceId: string; categories: string[]; region: string }[];
  alsoIn?: string[];
  duplicateCount?: number;
  author?: string;
  contentOrigin?: "publisher-feed" | "publisher-preview";
  previewReason?: string;
  offlineImagesAllowed?: boolean;
  id: string;
  sourceId: string;
  source: string;
  title: string;
  url: string;
  published: string;
  categories: string[];
  region: string;
  image?: string;
  excerpt: string;
  content: string;
  full: boolean;
}
export interface FeedStatus {
  appleVersion?: number;
  contentVersion?: number;
  bodyCount?: number;
  feedEntries?: number;
  latestPublished?: string;
  freshness?: "fresh" | "aging" | "stale" | "unknown";
  lastSuccess?: string;
  consecutiveFailures?: number;
  etag?: string;
  lastModified?: string;
  notModified?: boolean;
  retainedCount?: number;
  fullCount?: number;
  id: string;
  ok: boolean;
  count: number;
  checked: string;
  error?: string;
}
export interface Edition {
  pipelineVersion?: number;
  duplicatesRemoved?: number;
  generatedAt: string;
  articles: Article[];
  statuses: FeedStatus[];
}
export interface Preferences {
  complete: boolean;
  interests: string[];
  topics: string[];
  region: string;
  sourceIds: string[];
  customSources: Source[];
  theme: "system" | "light" | "dark" | "navy";
  reading: "pages" | "scroll";
  fontSize: number;
  converter: boolean;
}
export const defaults: Preferences = {
  complete: false,
  interests: ["Technology", "Science", "Space"],
  topics: [],
  region: "Worldwide",
  sourceIds: [],
  customSources: [],
  theme: "navy",
  reading: "pages",
  fontSize: 19,
  converter: false,
};
