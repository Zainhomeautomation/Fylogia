import Foundation

extension Notification.Name {
  static let fylogiaShortcutAvailable = Notification.Name("com.fylogia.native.shortcut-available")
}

enum FylogiaWidgetDeepLink {
  static func route(from url: URL) -> String? {
    guard url.scheme == "fylogia", url.host == "story",
      let id = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?
        .first(where: { $0.name == "id" })?.value,
      !id.isEmpty, id.count <= 500,
      id.unicodeScalars.allSatisfy({ !CharacterSet.controlCharacters.contains($0) })
    else { return nil }
    var components = URLComponents()
    components.queryItems = [URLQueryItem(name: "fylogiaStoryID", value: id)]
    guard let query = components.percentEncodedQuery else { return nil }
    return "article?\(query)"
  }
}
