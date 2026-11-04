import Foundation
import UserNotifications

enum FylogiaDailyBriefing {
  static let identifier = "com.fylogia.native.daily-briefing"
  static let topics = ["World News", "Technology", "Science"]

  static func timeComponents(_ value: String) -> DateComponents? {
    let parts = value.split(separator: ":")
    guard parts.count == 2, let hour = Int(parts[0]), let minute = Int(parts[1]),
      (0..<24).contains(hour), (0..<60).contains(minute)
    else { return nil }
    return DateComponents(hour: hour, minute: minute)
  }

  static func notificationBody(headlines: [String], topics: [String]) -> String {
    let selectedTopics = topics.filter(Self.topics.contains)
    let selectedHeadlines =
      headlines
      .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
      .filter { !$0.isEmpty }
      .prefix(2)
      .map { String($0.prefix(90)) }
    if !selectedHeadlines.isEmpty { return selectedHeadlines.joined(separator: " • ") }
    guard !selectedTopics.isEmpty else { return "Your daily news briefing is ready." }
    return "Your briefing is ready: \(selectedTopics.joined(separator: ", "))."
  }
}

@MainActor final class FylogiaNotificationScheduler {
  static let shared = FylogiaNotificationScheduler()
  private let center = UNUserNotificationCenter.current()

  func updateDailyBriefing(
    enabled: Bool, time: String, topics: [String], headlines: [String] = [],
    completion: ((Bool) -> Void)? = nil
  ) {
    guard enabled else {
      center.removePendingNotificationRequests(withIdentifiers: [FylogiaDailyBriefing.identifier])
      completion?(true)
      return
    }
    guard let components = FylogiaDailyBriefing.timeComponents(time) else {
      completion?(false)
      return
    }
    let selected = topics.filter(FylogiaDailyBriefing.topics.contains)
    center.requestAuthorization(options: [.alert, .sound]) { [weak self] granted, _ in
      Task { @MainActor in
        guard let self else { return }
        guard granted else {
          self.center.removePendingNotificationRequests(
            withIdentifiers: [FylogiaDailyBriefing.identifier])
          completion?(false)
          return
        }
        let content = UNMutableNotificationContent()
        content.title = "Your Fylogia daily briefing"
        content.body = FylogiaDailyBriefing.notificationBody(
          headlines: headlines, topics: selected)
        content.sound = .default
        if selected.count == 1, let topic = selected.first {
          let routeTopic = topic.replacingOccurrences(of: " ", with: "%20")
          content.userInfo["fylogiaRoute"] = "categories?fylogiaTopic=\(routeTopic)"
        } else {
          content.userInfo["fylogiaRoute"] = "home"
        }
        let request = UNNotificationRequest(
          identifier: FylogiaDailyBriefing.identifier,
          content: content,
          trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: true))
        self.center.add(request) { error in
          Task { @MainActor in completion?(error == nil) }
        }
      }
    }
  }
}
