import Foundation

struct Story: Codable, Identifiable {
  let id: String
  let source: String
  let title: String
  let url: String
  let excerpt: String
  let content: String
  let full: Bool
  let image: String?
  let contentDetails: Rights?
  struct Rights: Codable { let authorization: String? }
  var permittedFullText: Bool { full && contentDetails?.authorization == "permitted" }
  var body: String {
    Self.plainText(permittedFullText ? content : excerpt)
  }
  static func plainText(_ html: String) -> String {
    html.replacingOccurrences(
      of: "(?is)<(script|style)[^>]*>.*?</\\1>", with: "", options: .regularExpression
    )
    .replacingOccurrences(
      of: "(?i)</(p|h[1-6]|li|blockquote)>|<br\\s*/?>", with: "\n\n", options: .regularExpression
    )
    .replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression)
    .replacingOccurrences(of: "&amp;", with: "&")
    .replacingOccurrences(of: "&quot;", with: "\"")
    .replacingOccurrences(of: "&#39;", with: "'")
    .replacingOccurrences(of: "&nbsp;", with: " ")
    .replacingOccurrences(of: "&lt;", with: "<")
    .replacingOccurrences(of: "&gt;", with: ">")
    .trimmingCharacters(in: .whitespacesAndNewlines)
  }
  static var fixtures: [Story] {
    (1...4).map { n in
      Story(
        id: "fylogia-guide-\(n)", source: "Fylogia reader guide",
        title: "A little room to read — chapter \(n)", url: "https://fylogia.com",
        excerpt: "An original Fylogia interface test, not a news report.",
        content: (1...18).map {
          "Paragraph \($0). Your World, One Page at a Time. This original reader guide demonstrates how text flows across paper pages. Drag the edge to explore the next page, or use the accessible navigation buttons. Your reading position stays with the words as the available space changes."
        }.joined(separator: "\n\n"), full: true, image: nil,
        contentDetails: Rights(authorization: "permitted"))
    }
  }
}

struct ReadingAnchor: Codable, Equatable {
  var storyID: String
  var offset: Int
}

@MainActor final class Library {
  let defaults: UserDefaults
  var stories: [Story] = []
  var anchor: ReadingAnchor? {
    didSet {
      if let data = try? JSONEncoder().encode(anchor) {
        defaults.set(data, forKey: "readingAnchor.v1")
      }
    }
  }
  var saved: Set<String> {
    didSet { defaults.set(Array(saved), forKey: "savedIDs.v1") }
  }
  init(defaults: UserDefaults = .standard) {
    self.defaults = defaults
    anchor = defaults.data(forKey: "readingAnchor.v1").flatMap {
      try? JSONDecoder().decode(ReadingAnchor.self, from: $0)
    }
    saved = Set(defaults.stringArray(forKey: "savedIDs.v1") ?? [])
  }
  private var cacheURL: URL {
    FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("edition-v1.json")
  }
  func loadCache() {
    if let data = try? Data(contentsOf: cacheURL),
      let cached = try? JSONDecoder().decode([Story].self, from: data)
    {
      stories = cached
    }
  }
  func refresh() async throws {
    struct Edition: Decodable { let articles: [Story] }
    var request = URLRequest(url: URL(string: "https://fylogia.com/data/edition.json")!)
    request.timeoutInterval = 25
    let (data, response) = try await URLSession.shared.data(for: request)
    guard (response as? HTTPURLResponse)?.statusCode == 200, data.count < 30_000_000 else {
      throw URLError(.badServerResponse)
    }
    let edition = try JSONDecoder().decode(Edition.self, from: data)
    var ids = Set<String>()
    stories = Array(
      edition.articles.filter { !$0.title.isEmpty && ids.insert($0.id).inserted }.prefix(40))
    let directory = cacheURL.deletingLastPathComponent()
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    try JSONEncoder().encode(stories).write(to: cacheURL, options: .atomic)
    var excluded = cacheURL
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try excluded.setResourceValues(values)
  }
}
