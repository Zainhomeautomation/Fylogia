// Additive labels preserve all existing category and topic preference strings.
export const interestGroups = [
  {
    name: "Technology & Computing",
    categories: [
      "Technology",
      "Apple",
      "AI",
      "Computing",
      "Smart Home",
      "3D Printing",
      "Gaming",
    ],
  },

  {
    name: "Fashion & Lifestyle",
    categories: [
      "Men’s Fashion",
      "Women’s Fashion",
      "Watches & Jewelry",
      "Luxury & Lifestyle",
    ],
  },
  {
    name: "Home & Nature",
    categories: ["Home & Garden", "Nature & Environment"],
  },
  {
    name: "Science & Design",
    categories: [
      "Science",
      "Space",
      "Architecture",
      "Engineering",
      "Photography",
    ],
  },
  {
    name: "World & Ideas",
    categories: [
      "World News",
      "Politics",
      "Business",
      "Economy",
      "History & Culture",
    ],
  },
  {
    name: "Life & Exploration",
    categories: [
      "Aviation",
      "Travel",
      "Cars",
      "Marine",
      "Health",
      "Healthy Food",
      "Cooking",
      "Sports",
      "Entertainment",
    ],
  },
];
export const sourceTopics: Record<
  string,
  { categories: string[]; topics: string[] }
> = {
  "apartment-therapy": {
    categories: ["Home & Garden", "Architecture"],
    topics: ["Interiors", "Decoration", "Home improvement"],
  },
  "smithsonian-magazine": {
    categories: ["History & Culture"],
    topics: ["History", "Archaeology", "Culture", "Heritage"],
  },
  arstechnica: {
    categories: ["Computing"],
    topics: ["Operating systems", "PC hardware", "Cybersecurity"],
  },
  "fedora-magazine": {
    categories: ["Computing"],
    topics: ["Linux", "Operating systems"],
  },
  "mozilla-hacks": {
    categories: ["Computing"],
    topics: ["Software", "Web development"],
  },
  gamingonlinux: {
    categories: ["Computing"],
    topics: ["Linux", "PC hardware"],
  },
  homeassistant: {
    categories: ["Computing"],
    topics: ["Automation", "Linux", "Networking"],
  },
  hackster: {
    categories: ["Computing", "Engineering"],
    topics: ["Robotics", "Manufacturing", "Networking"],
  },
  "3dprint": {
    categories: ["Engineering"],
    topics: ["Manufacturing", "Materials", "Design"],
  },
  "3d-printing-industry": {
    categories: ["Engineering"],
    topics: ["Manufacturing", "Materials"],
  },
  "3dprintbeginner": {
    categories: ["Engineering"],
    topics: ["Manufacturing", "Materials", "Design"],
  },
  nasa: {
    categories: ["Engineering"],
    topics: ["Materials", "Robotics", "Manufacturing"],
  },
  dezeen: {
    categories: ["Architecture", "Engineering"],
    topics: ["Buildings", "Interiors", "Urban design", "Facades"],
  },
  "design-milk": {
    categories: ["Architecture"],
    topics: ["Interiors", "Buildings", "Design"],
  },
};
const aliases: Record<string, string[]> = {
  "Open source": ["open source", "open-source"],
  Facades: ["facade", "facades", "façade", "façades"],
  Diving: ["diving", "dive", "scuba"],
  Boating: ["boat", "boats", "boating", "yacht", "yachts"],
  Mac: ["Mac", "MacBook", "macOS"],
  AI: ["AI", "artificial intelligence"],
  PC: ["PC", "PCs"],
  "Operating systems": [
    "operating system",
    "operating systems",
    "Linux",
    "Windows",
    "macOS",
    "iOS",
    "iPadOS",
    "Android",
    "BSD",
  ],
  "PC hardware": [
    "PC",
    "PCs",
    "processor",
    "CPU",
    "GPU",
    "graphics card",
    "motherboard",
  ],
  "Civil engineering": [
    "civil engineering",
    "structural engineering",
    "construction",
    "bridge",
    "bridges",
    "infrastructure",
  ],
  Archaeology: ["archaeology", "archaeological", "archaeologist", "excavation"],
  "Marine engineering": [
    "marine engineering",
    "shipbuilding",
    "maritime",
    "vessel",
    "vessels",
  ],
  "Ocean science": ["ocean", "oceans", "marine biology", "coral", "corals"],
};
const patterns = new Map<string, RegExp[]>();
export function topicMatchesText(topic: string, text: string) {
  let compiled = patterns.get(topic);
  if (!compiled) {
    compiled = (aliases[topic] || [topic]).map((value) => {
      const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(
        String.raw`(^|[^\p{L}\p{N}])${escaped}(?=$|[^\p{L}\p{N}])`,
        "iu",
      );
    });
    if (patterns.size >= 256) patterns.delete(patterns.keys().next().value!);
    patterns.set(topic, compiled);
  }
  return compiled.some((pattern) => pattern.test(text));
}

export function normalizeInterestSearch(value: string) {
  return value.normalize("NFKC").replace(/[‘’]/g, "'").toLocaleLowerCase();
}
