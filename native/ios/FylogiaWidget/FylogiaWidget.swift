import Foundation
import SwiftUI
import WidgetKit

private struct WidgetStory: Codable, Hashable, Identifiable {
  let id: String
  let title: String
  let source: String
  let categories: [String]?

  var deepLink: URL {
    var components = URLComponents()
    components.scheme = "fylogia"
    components.host = "story"
    components.queryItems = [URLQueryItem(name: "id", value: id)]
    return components.url ?? URL(string: "fylogia://")!
  }
}

private struct EditionPayload: Decodable {
  let articles: [WidgetStory]
}

private struct FylogiaWidgetEntry: TimelineEntry {
  let date: Date
  let stories: [WidgetStory]
}

private struct FylogiaWidgetProvider: TimelineProvider {
  private let cacheKey = "com.fylogia.widget.latest-stories.v1"

  func placeholder(in context: Context) -> FylogiaWidgetEntry {
    FylogiaWidgetEntry(date: .now, stories: [])
  }

  func getSnapshot(in context: Context, completion: @escaping (FylogiaWidgetEntry) -> Void) {
    if context.isPreview {
      completion(placeholder(in: context))
    } else {
      completion(FylogiaWidgetEntry(date: .now, stories: cachedStories()))
    }
  }

  func getTimeline(
    in context: Context, completion: @escaping (Timeline<FylogiaWidgetEntry>) -> Void
  ) {
    Task {
      let fresh = await fetchStories()
      let stories = fresh.isEmpty ? cachedStories() : fresh
      if !fresh.isEmpty, let data = try? JSONEncoder().encode(fresh) {
        UserDefaults.standard.set(data, forKey: cacheKey)
      }
      let entry = FylogiaWidgetEntry(date: .now, stories: stories)
      let refresh =
        Calendar.current.date(byAdding: .hour, value: 1, to: .now) ?? .now.addingTimeInterval(3600)
      completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
  }

  private func cachedStories() -> [WidgetStory] {
    guard let data = UserDefaults.standard.data(forKey: cacheKey),
      let stories = try? JSONDecoder().decode([WidgetStory].self, from: data)
    else { return [] }
    return stories
  }

  private func fetchStories() async -> [WidgetStory] {
    var request = URLRequest(url: URL(string: "https://fylogia.com/data/edition.json")!)
    request.timeoutInterval = 15
    do {
      let (data, response) = try await URLSession.shared.data(for: request)
      guard (response as? HTTPURLResponse)?.statusCode == 200, data.count <= 30_000_000 else {
        return []
      }
      return Array(
        try JSONDecoder().decode(EditionPayload.self, from: data).articles
          .filter { !$0.id.isEmpty && !$0.title.isEmpty && !$0.source.isEmpty }
          .prefix(40))
    } catch {
      return []
    }
  }
}

private struct FylogiaWidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: FylogiaWidgetEntry

  private var visibleCount: Int {
    switch family {
    case .systemSmall: 1
    case .systemLarge: 4
    default: 2
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 6) {
        Image(systemName: "newspaper.fill").foregroundStyle(
          Color(red: 0.22, green: 0.40, blue: 0.30))
        Text("FYLOGIA").font(.caption.weight(.bold)).tracking(1.2)
        Spacer(minLength: 0)
        Text("LATEST").font(.system(size: 9, weight: .semibold)).foregroundStyle(.secondary)
      }
      if entry.stories.isEmpty {
        Spacer(minLength: 0)
        Text("Open Fylogia for your edition.").font(.subheadline.weight(.medium))
        Spacer(minLength: 0)
      } else {
        ForEach(entry.stories.prefix(visibleCount)) { story in
          Link(destination: story.deepLink) {
            VStack(alignment: .leading, spacing: 2) {
              Text(story.title).font(
                .system(size: family == .systemSmall ? 14 : 13, weight: .semibold)
              )
              .lineLimit(2).foregroundStyle(Color(red: 0.10, green: 0.14, blue: 0.12))
              if family != .systemSmall {
                Text(story.source).font(.caption2).lineLimit(1).foregroundStyle(.secondary)
              }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
          }
          .privacySensitive()
          if story.id != entry.stories.prefix(visibleCount).last?.id {
            Divider().overlay(Color(red: 0.79, green: 0.80, blue: 0.74))
          }
        }
      }
      Spacer(minLength: 0)
    }
    .padding(14)
    .containerBackground(Color(red: 0.97, green: 0.95, blue: 0.89), for: .widget)
  }
}

@main struct FylogiaNewsWidget: Widget {
  private let kind = "FylogiaNewsWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: FylogiaWidgetProvider()) { entry in
      FylogiaWidgetView(entry: entry)
    }
    .configurationDisplayName("Fylogia Headlines")
    .description("Recent headlines from your Fylogia edition.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}
