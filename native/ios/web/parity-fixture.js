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
  const pdfBytes = (() => {
    const pages = 8;
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      `<< /Type /Pages /Kids [${Array.from({ length: pages }, (_, i) => `${4 + i * 2} 0 R`).join(" ")}] /Count ${pages} >>`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ];
    for (let i = 0; i < pages; i++) {
      const content = `BT /F1 28 Tf 48 700 Td (Fylogia offline test page ${i + 1}) Tj ET`;
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`,
        `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`,
      );
    }
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (let i = 0; i < objects.length; i++) {
      offsets.push(new TextEncoder().encode(pdf).length);
      pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xref = new TextEncoder().encode(pdf).length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)
      .join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new TextEncoder().encode(pdf).buffer;
  })();
  const pdfFixtureReady = new Promise((resolve, reject) => {
    const request = indexedDB.open("folio-magazines", 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("pdfs"))
        request.result.createObjectStore("pdfs", { keyPath: "id" });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction("pdfs", "readwrite");
      transaction.objectStore("pdfs").put({
        id: "fylogia-offline-pdf-test",
        title: "Fylogia Offline PDF Fixture",
        file: pdfBytes,
        description: "An isolated PDF used by the native offline reader test.",
      });
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error);
      };
    };
  });
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, options) => {
    const url = typeof input === "string" ? input : input.url || String(input);
    if (url.includes("data/edition.json"))
      return pdfFixtureReady.then(() =>
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
