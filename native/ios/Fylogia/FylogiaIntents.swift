import AppIntents
import Foundation

enum FylogiaShortcutDestination: String, AppEnum {
  case forYou
  case saved
  case history
  case science
  case technology
  case worldNews

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Fylogia destination")
  static var caseDisplayRepresentations: [Self: DisplayRepresentation] = [
    .forYou: "For You",
    .saved: "Saved Articles",
    .history: "Reading History",
    .science: "Science",
    .technology: "Technology",
    .worldNews: "World News",
  ]

  var route: String {
    switch self {
    case .forYou: "home"
    case .saved: "saved"
    case .history: "history"
    case .science: "categories?fylogiaTopic=Science"
    case .technology: "categories?fylogiaTopic=Technology"
    case .worldNews: "categories?fylogiaTopic=World%20News"
    }
  }
}

enum FylogiaShortcutHandoff {
  static let defaultsKey = "com.fylogia.native.pending-shortcut"

  static func queue(_ destination: FylogiaShortcutDestination, defaults: UserDefaults = .standard) {
    queue(route: destination.route, defaults: defaults)
  }

  static func queue(route: String, defaults: UserDefaults = .standard) {
    defaults.set(route, forKey: defaultsKey)
  }

  static func consume(defaults: UserDefaults = .standard) -> String? {
    defer { defaults.removeObject(forKey: defaultsKey) }
    return defaults.string(forKey: defaultsKey)
  }
}

struct OpenFylogiaIntent: AppIntent {
  static var title: LocalizedStringResource = "Open Fylogia"
  static var description = IntentDescription("Open your Fylogia news edition.")
  static var openAppWhenRun = true

  func perform() async throws -> some IntentResult {
    FylogiaShortcutHandoff.queue(.forYou)
    return .result()
  }
}

struct OpenFylogiaDestinationIntent: AppIntent {
  static var title: LocalizedStringResource = "Open a Fylogia destination"
  static var description = IntentDescription(
    "Open saved stories, reading history, or a news category.")
  static var openAppWhenRun = true

  @Parameter(title: "Destination") var destination: FylogiaShortcutDestination

  func perform() async throws -> some IntentResult {
    FylogiaShortcutHandoff.queue(destination)
    return .result()
  }
}

struct FylogiaShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: OpenFylogiaIntent(),
      phrases: ["Open \(.applicationName)", "Read the news in \(.applicationName)"],
      shortTitle: "Open Fylogia",
      systemImageName: "newspaper"
    )
    AppShortcut(
      intent: OpenFylogiaDestinationIntent(),
      phrases: [
        "Open \(\.$destination) in \(.applicationName)",
        "Show \(\.$destination) in \(.applicationName)",
      ],
      shortTitle: "Fylogia destination",
      systemImageName: "bookmark"
    )
  }
}
