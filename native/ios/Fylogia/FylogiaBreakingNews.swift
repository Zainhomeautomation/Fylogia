import CryptoKit
import Foundation
import UserNotifications

struct FylogiaBreakingCandidate: Sendable {
  var storyID: String
  var title: String
  var source: String
  var url: URL
  var topics: Set<String>
  var publishedAt: Date
  var isOfficialSource: Bool
}

struct FylogiaBreakingPreferences: Codable, Equatable {
  var optedIn = false
  var topics: Set<String> = []
  var dailyLimit = 3

  static let supportedTopics: Set<String> = ["World News", "Technology", "Science"]
}

struct FylogiaBreakingAlert: Equatable, Sendable {
  var storyID: String
  var title: String
  var storyURL: URL
  var topic: String
  var deduplicationKey: String
  var confidence: Double
}

enum FylogiaBreakingNewsDetector {
  private static let urgencyPhrases = [
    "breaking", "just in", "urgent", "developing now", "live updates",
  ]
  private static let ignorableUrgency = Set([
    "breaking", "urgent", "just", "in", "developing", "now", "live", "updates",
  ])

  static func classify(
    _ candidates: [FylogiaBreakingCandidate],
    preferences: FylogiaBreakingPreferences,
    now: Date = .now
  ) -> [FylogiaBreakingAlert] {
    guard preferences.optedIn else { return [] }
    let selected = preferences.topics.intersection(FylogiaBreakingPreferences.supportedTopics)
    guard !selected.isEmpty else { return [] }
    let recent = candidates.filter {
      !$0.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        && now.timeIntervalSince($0.publishedAt) >= 0
        && now.timeIntervalSince($0.publishedAt) <= 45 * 60
        && !$0.topics.isDisjoint(with: selected)
        && $0.url.scheme?.lowercased() == "https"
    }
    let groups = Dictionary(grouping: recent) { normalizedTitle($0.title) }
    return groups.compactMap { key, group in
      guard !key.isEmpty, let lead = group.max(by: { $0.publishedAt < $1.publishedAt }) else {
        return nil
      }
      let urgent = group.contains { item in
        let title = item.title.lowercased()
        return urgencyPhrases.contains(where: title.contains)
      }
      guard urgent else { return nil }
      let independent = Set(
        group.map { $0.source.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() }.filter
        { !$0.isEmpty })
      let official = group.contains(where: \.isOfficialSource)
      let confirmed = official || independent.count >= 2
      let confidence = official ? 0.95 : 0.90
      guard confirmed else { return nil }
      let topic = lead.topics.intersection(selected).sorted().first ?? selected.sorted()[0]
      return FylogiaBreakingAlert(
        storyID: lead.storyID,
        title: String(lead.title.trimmingCharacters(in: .whitespacesAndNewlines).prefix(120)),
        storyURL: lead.url, topic: topic, deduplicationKey: digest(key), confidence: confidence)
    }.sorted { $0.title < $1.title }
  }

  private static func normalizedTitle(_ title: String) -> String {
    let words = title.lowercased().components(separatedBy: CharacterSet.alphanumerics.inverted)
      .filter { !$0.isEmpty && !ignorableUrgency.contains($0) }
    return words.joined(separator: " ")
  }

  private static func digest(_ value: String) -> String {
    SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined()
  }
}

struct FylogiaBreakingPreferenceStore {
  private let defaults: UserDefaults
  private let key = "com.fylogia.native.breaking-preferences.v1"

  init(defaults: UserDefaults = .standard) { self.defaults = defaults }

  func load() -> FylogiaBreakingPreferences {
    guard let data = defaults.data(forKey: key),
      let saved = try? JSONDecoder().decode(FylogiaBreakingPreferences.self, from: data)
    else { return FylogiaBreakingPreferences() }
    return FylogiaBreakingPreferences(
      optedIn: saved.optedIn,
      topics: saved.topics.intersection(FylogiaBreakingPreferences.supportedTopics),
      dailyLimit: min(max(saved.dailyLimit, 1), 5))
  }

  func save(_ preferences: FylogiaBreakingPreferences) {
    let safe = FylogiaBreakingPreferences(
      optedIn: preferences.optedIn,
      topics: preferences.topics.intersection(FylogiaBreakingPreferences.supportedTopics),
      dailyLimit: min(max(preferences.dailyLimit, 1), 5))
    guard let data = try? JSONEncoder().encode(safe) else { return }
    defaults.set(data, forKey: key)
  }
}

/// Persistent, local-only throttle. Callers feed it stories already received
/// by the app; this component does not provide or imply a remote alert service.
struct FylogiaBreakingAlertGate {
  private let defaults: UserDefaults
  private let historyKey = "com.fylogia.native.breaking-delivery.v1"
  private let minimumInterval: TimeInterval = 30 * 60

  init(defaults: UserDefaults = .standard) { self.defaults = defaults }

  mutating func allow(
    _ alert: FylogiaBreakingAlert,
    preferences: FylogiaBreakingPreferences,
    now: Date = .now
  ) -> Bool {
    guard preferences.optedIn,
      preferences.topics.contains(alert.topic),
      preferences.dailyLimit > 0
    else { return false }
    var history = (defaults.dictionary(forKey: historyKey) as? [String: Date]) ?? [:]
    history = history.filter { now.timeIntervalSince($0.value) < 7 * 24 * 60 * 60 }
    guard history[alert.deduplicationKey] == nil else { return false }
    let recent = history.values.filter { now.timeIntervalSince($0) < 24 * 60 * 60 }
    guard recent.count < min(preferences.dailyLimit, 5),
      recent.max().map({ now.timeIntervalSince($0) >= minimumInterval }) ?? true
    else { return false }
    history[alert.deduplicationKey] = now
    defaults.set(history, forKey: historyKey)
    return true
  }

  mutating func release(_ alert: FylogiaBreakingAlert) {
    var history = (defaults.dictionary(forKey: historyKey) as? [String: Date]) ?? [:]
    history.removeValue(forKey: alert.deduplicationKey)
    defaults.set(history, forKey: historyKey)
  }
}

@MainActor final class FylogiaBreakingAlertScheduler {
  private let center: UNUserNotificationCenter
  private let defaults: UserDefaults

  init(center: UNUserNotificationCenter = .current(), defaults: UserDefaults = .standard) {
    self.center = center
    self.defaults = defaults
  }

  func schedule(
    _ candidates: [FylogiaBreakingCandidate],
    preferences: FylogiaBreakingPreferences,
    now: Date = .now
  ) async -> Int {
    guard preferences.optedIn else { return 0 }
    let settings = await center.notificationSettings()
    guard
      settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional
    else {
      return 0
    }
    let alerts = FylogiaBreakingNewsDetector.classify(
      candidates, preferences: preferences, now: now)
    var gate = FylogiaBreakingAlertGate(defaults: defaults)
    var scheduled = 0
    for alert in alerts where gate.allow(alert, preferences: preferences, now: now) {
      let content = UNMutableNotificationContent()
      content.title = "Breaking news · \(alert.topic)"
      content.body = alert.title
      content.sound = .default
      var route = URLComponents()
      route.queryItems = [URLQueryItem(name: "fylogiaStoryID", value: alert.storyID)]
      content.userInfo["fylogiaRoute"] = "article?\(route.percentEncodedQuery ?? "")"
      let request = UNNotificationRequest(
        identifier: "com.fylogia.native.breaking.\(alert.deduplicationKey)",
        content: content, trigger: nil)
      do {
        try await center.add(request)
        scheduled += 1
      } catch {
        gate.release(alert)
      }
    }
    return scheduled
  }
}
