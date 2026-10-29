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
  Technology: ["Gadgets", "Software", "Cybersecurity"],
  Apple: ["iPhone", "iPad", "Mac"],
  AI: ["Research", "Tools", "Robotics"],
  "Smart Home": ["Home Assistant", "Automation", "Matter"],
  "3D Printing": ["Printers", "Materials", "Design"],
  Science: ["Climate", "Physics", "Biology"],
  Space: ["Astronomy", "Missions"],
  Aviation: ["Airlines", "Aircraft"],
  Travel: ["Destinations", "Culture"],
  Cars: ["Electric vehicles", "Motorsport"],
  Economy: ["Markets", "Policy"],
  Business: ["Startups", "Companies"],
  Politics: ["Elections", "Policy"],
  "World News": ["Diplomacy", "Current affairs"],
  Health: ["Research", "Wellbeing"],
  "Healthy Food": ["Nutrition", "Plant-based"],
  Cooking: ["Recipes", "Techniques"],
  Sports: ["Football", "Tennis", "Formula 1"],
  Gaming: ["PC", "Console", "Indie"],
  Photography: ["Cameras", "Technique"],
  Entertainment: ["Film", "Music", "Books"],
};
export interface Source {
  id: string;
  name: string;
  url: string;
  site: string;
  categories: string[];
  region: string;
  full?: boolean;
  custom?: boolean;
  validatedAt?: string;
  permissionUrl?: string;
  licenseLabel?: string;
  fullBodyField?: "description";
}
export const sources: Source[] = [
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
];
export interface ContentDetails {
  availability:
    "full" | "body-unverified" | "preview" | "subscription" | "unavailable";
  authorization: "permitted" | "unverified";
  method: "rss-content" | "rss-description" | "rss-summary" | "legacy-feed";
  retrievedAt: string;
  completeness: "publisher-body" | "excerpt" | "unknown";
}
export interface Article {
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
