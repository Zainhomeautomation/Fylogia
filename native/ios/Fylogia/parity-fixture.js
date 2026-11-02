(() => {
  const fixed = Date.parse("2026-11-02T10:00:00Z"),
    OriginalDate = Date;
  class FixtureDate extends OriginalDate {
    constructor(...a) {
      super(...(a.length ? a : [fixed]));
    }
    static now() {
      return fixed;
    }
  }
  window.Date = FixtureDate;
  const prefs = {
    complete: true,
    interests: ["Science"],
    topics: [],
    region: "Worldwide",
    sourceIds: ["nasa"],
    customSources: [],
    theme: "navy",
    reading: "pages",
    fontSize: 19,
    converter: false,
  };
  if (!localStorage.getItem("folio.v1.preferences"))
    localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
  const articles = Array.from({ length: 8 }, (_, i) => ({
    id: "native-parity-" + i,
    sourceId: "nasa",
    source: "Fylogia layout fixture",
    title: [
      "A new perspective on our changing world",
      "Inside the ideas shaping tomorrow",
      "The art of slowing down to read",
      "A closer look at the world around us",
    ][i % 4],
    url: "https://fylogia.com/",
    published: "2026-11-02T09:00:00Z",
    categories: ["Science"],
    region: "Worldwide",
    image: "/covers/nasa-spinoff-2025.jpg",
    excerpt:
      "An original layout fixture for comparing the same content, typography and reading controls across the golden website and native application.",
    content: Array.from(
      { length: 14 },
      (_, j) =>
        "<p>Section " +
        (j + 1) +
        ". Your World, One Page at a Time. This original Fylogia layout fixture checks complete paragraphs, responsive pagination and a comfortable reading position. It is interface test content, not a news report.</p>",
    ).join(""),
    full: true,
    contentOrigin: "publisher-feed",
    contentDetails: {
      authorization: "permitted",
      availability: "full",
      completeness: "complete",
    },
    offlineImagesAllowed: true,
  }));
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, options) => {
    const url = typeof input === "string" ? input : input.url || String(input);
    if (url.includes("data/edition.json"))
      return Promise.resolve(
        new Response(
          JSON.stringify({
            generatedAt: "2026-11-02T10:00:00Z",
            articles,
            statuses: [],
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
      );
    return originalFetch(input, options);
  };
})();
