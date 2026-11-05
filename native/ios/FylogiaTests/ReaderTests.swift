import WebKit
import XCTest

@testable import Fylogia

@MainActor final class ReaderTests: XCTestCase {
  func testShortcutHandoffQueuesAndConsumesDestinationOnce() {
    let suite = "com.fylogia.unit.\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: suite)!
    defer { defaults.removePersistentDomain(forName: suite) }
    FylogiaShortcutHandoff.queue(.worldNews, defaults: defaults)
    XCTAssertEqual(
      FylogiaShortcutHandoff.consume(defaults: defaults),
      "categories?fylogiaTopic=World%20News")
    XCTAssertNil(FylogiaShortcutHandoff.consume(defaults: defaults))
  }
  func testDailyBriefingTimeValidation() {
    XCTAssertEqual(FylogiaDailyBriefing.timeComponents("08:30")?.hour, 8)
    XCTAssertEqual(FylogiaDailyBriefing.timeComponents("08:30")?.minute, 30)
    XCTAssertNil(FylogiaDailyBriefing.timeComponents("25:00"))
    XCTAssertNil(FylogiaDailyBriefing.timeComponents("12:75"))
    XCTAssertNil(FylogiaDailyBriefing.timeComponents("later"))
    XCTAssertEqual(
      FylogiaDailyBriefing.notificationBody(
        headlines: [" First headline ", "Second headline", "Ignored"], topics: ["Science"]),
      "First headline • Second headline")
    XCTAssertEqual(
      FylogiaDailyBriefing.notificationBody(headlines: [], topics: ["Invalid"]),
      "Your daily news briefing is ready.")
  }
  func testStartupDiagnosticsValidateMissingDelayedAndFailedStages() {
    XCTAssertNil(NativeStartupStageEvent(message: [:]))
    XCTAssertNil(
      NativeStartupStageEvent(message: ["stage": "unknown", "elapsedMs": 1]))

    let delayed = NativeStartupStageEvent(
      message: [
        "stage": "storage-transaction-timeout", "elapsedMs": 5_000,
        "operationElapsedMs": 5_000,
      ])
    XCTAssertEqual(delayed?.elapsedMilliseconds, 5_000)
    XCTAssertEqual(delayed?.operationElapsedMilliseconds, 5_000)

    let failed = NativeStartupStageEvent(
      message: [
        "stage": "startup-failed", "elapsedMs": 12_001,
        "failureStage": "local-library", "errorName": "SecurityError",
        "privateMessage": "must not be retained",
      ])
    XCTAssertEqual(failed?.failureStage, "local-library")
    XCTAssertEqual(failed?.errorName, "SecurityError")
    XCTAssertNil(NativeStartupStageEvent(message: ["stage": "startup-failed", "elapsedMs": -1]))
    XCTAssertNil(
      NativeStartupStageEvent(message: ["stage": "startup-failed", "elapsedMs": 600_001]))
  }
  func testWidgetDeepLinkValidatesAndEncodesStoryRoute() {
    let url = URL(string: "fylogia://story?id=story-123")!
    XCTAssertEqual(
      FylogiaWidgetDeepLink.route(from: url),
      "article?fylogiaStoryID=story-123")
    XCTAssertNil(FylogiaWidgetDeepLink.route(from: URL(string: "https://fylogia.com/story-123")!))
    XCTAssertNil(FylogiaWidgetDeepLink.route(from: URL(string: "fylogia://story?id=%0A")!))
  }
  func testLocalCountryResponseIsReducedToValidatedCountryCode() throws {
    XCTAssertEqual(
      LocalWebServer.countryCode(from: Data(#"{"country":"om"}"#.utf8)), "OM")
    XCTAssertNil(LocalWebServer.countryCode(from: Data(#"{"country":"OMN"}"#.utf8)))
    XCTAssertNil(LocalWebServer.countryCode(from: Data(#"{"country":"O1"}"#.utf8)))
    XCTAssertNil(LocalWebServer.countryCode(from: Data(#"{"country":"<script>"}"#.utf8)))
    XCTAssertNil(LocalWebServer.countryCode(from: Data("not-json".utf8)))
    XCTAssertNil(LocalWebServer.countryCode(from: Data(repeating: 65, count: 4097)))
  }
  func testWebKitBridgeDoesNotRetainController() {
    weak var observed: HybridController?
    var web: WKWebView!
    autoreleasepool {
      let controller = HybridController()
      observed = controller
      let config = WKWebViewConfiguration()
      config.userContentController.add(WeakScriptHandler(controller), name: "fylogia")
      web = WKWebView(frame: .zero, configuration: config)
    }
    XCTAssertNil(observed, "A retained web configuration must not retain its scene controller")
    XCTAssertNotNil(web.configuration.userContentController)
  }
  func testBookGestureBoundsRejectExtremeAndInvalidCoordinates() {
    let bounds = CGRect(x: 0, y: 0, width: 794, height: 730)
    for point in [CGPoint(x: 0, y: 0), CGPoint(x: 397, y: 365), CGPoint(x: 794, y: 730)] {
      XCTAssertTrue(BoundBookController.validDrag(point, in: bounds))
    }
    for point in [
      CGPoint(x: -1, y: 200), CGPoint(x: 795, y: 200), CGPoint(x: 300, y: -1),
      CGPoint(x: 300, y: 731), CGPoint(x: CGFloat.infinity, y: 0), CGPoint(x: CGFloat.nan, y: 1),
    ] {
      XCTAssertFalse(BoundBookController.validDrag(point, in: bounds))
    }
  }
  func testPaginationHasNoMissingOrDuplicateCharacters() {
    for size in [
      CGSize(width: 350, height: 570), CGSize(width: 480, height: 790),
      CGSize(width: 600, height: 500),
    ] {
      let pages = Pagination.pages(stories: [Story.fixtures[0]], size: size)
      XCTAssertGreaterThan(pages.count, 1)
      var end = 0
      for page in pages {
        XCTAssertEqual(page.range.location, end)
        XCTAssertGreaterThan(page.range.length, 0)
        end = NSMaxRange(page.range)
      }
      XCTAssertEqual(end, pages[0].text.length)
    }
  }
  func testAnchorSurvivesResize() {
    let small = Pagination.pages(stories: Story.fixtures, size: CGSize(width: 350, height: 570))
    let anchor = small[3].anchor
    let wide = Pagination.pages(stories: Story.fixtures, size: CGSize(width: 480, height: 790))
    let restored = wide[Pagination.index(for: anchor, in: wide)]
    XCTAssertEqual(restored.story.id, anchor.storyID)
    XCTAssertTrue(NSLocationInRange(anchor.offset, restored.range))
  }
  func testWidthAndDynamicTypePolicy() {
    XCTAssertEqual(Pagination.columns(width: 390), 1)
    XCTAssertEqual(Pagination.columns(width: 900), 2)
    XCTAssertEqual(Pagination.columns(width: 900, textScale: 2), 1)
  }
  func testFullContentRequiresPermission() {
    let s = Story(
      id: "a", source: "Publisher", title: "Title", url: "https://example.com",
      excerpt: "Permitted preview", content: "Restricted full text", full: true, image: nil,
      contentDetails: nil)
    XCTAssertEqual(s.body, "Permitted preview")
    XCTAssertFalse(s.permittedFullText)
  }
  func testReadingStatePersists() {
    let name = "com.fylogia.unit.\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: name)!
    defer { defaults.removePersistentDomain(forName: name) }
    let first = Library(defaults: defaults)
    first.anchor = ReadingAnchor(storyID: "a", offset: 123)
    first.saved.insert("a")
    let second = Library(defaults: defaults)
    XCTAssertEqual(second.anchor, first.anchor)
    XCTAssertTrue(second.saved.contains("a"))
  }
  func testLocalSyncJournalIsAdditiveAndMergesTombstones() async throws {
    let name = "com.fylogia.unit.sync.\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: name)!
    defer { defaults.removePersistentDomain(forName: name) }
    let store = FylogiaLocalSyncStore(defaults: defaults, origin: "device-a")
    let legacy = FylogiaSyncRecord(
      collection: .savedArticle, key: "story-1", payload: Data("legacy".utf8),
      updatedAt: Date(timeIntervalSince1970: 10), origin: "legacy", isDeleted: false)
    let seeded = await store.seedIfMissing(legacy)
    XCTAssertTrue(seeded)
    try await store.put(
      .savedArticle, key: "story-1", payload: Data("new local value".utf8),
      at: Date(timeIntervalSince1970: 20))
    let reseeded = await store.seedIfMissing(legacy)
    XCTAssertFalse(reseeded, "Initial migration must never overwrite existing data")
    let remoteDelete = FylogiaSyncRecord(
      collection: .savedArticle, key: "story-1", payload: Data(),
      updatedAt: Date(timeIntervalSince1970: 30), origin: "device-b", isDeleted: true)
    await store.merge([remoteDelete])
    let merged = await store.snapshot()
    XCTAssertEqual(merged.count, 1)
    XCTAssertTrue(merged[0].isDeleted)
    let reopened = FylogiaLocalSyncStore(defaults: defaults, origin: "device-a")
    let reopenedSnapshot = await reopened.snapshot()
    XCTAssertEqual(reopenedSnapshot, merged, "Offline journal must survive app restarts")
  }
  func testBreakingNewsRequiresOptInAndIndependentConfirmation() {
    let now = Date(timeIntervalSince1970: 1_800_000_000)
    let first = FylogiaBreakingCandidate(
      storyID: "story-1", title: "Breaking: Central bank cuts rates", source: "News One",
      url: URL(string: "https://news-one.example/story")!, topics: ["World News"],
      publishedAt: now, isOfficialSource: false)
    let second = FylogiaBreakingCandidate(
      storyID: "story-1", title: "Central bank cuts rates — Breaking", source: "News Two",
      url: URL(string: "https://news-two.example/story")!, topics: ["World News"],
      publishedAt: now, isOfficialSource: false)
    XCTAssertTrue(
      FylogiaBreakingNewsDetector.classify(
        [first, second], preferences: FylogiaBreakingPreferences(), now: now
      ).isEmpty)
    var preferences = FylogiaBreakingPreferences(optedIn: true, topics: ["World News"])
    let alerts = FylogiaBreakingNewsDetector.classify(
      [first, second], preferences: preferences, now: now)
    XCTAssertEqual(alerts.count, 1, "Matching reports from multiple sources must deduplicate")
    guard let alert = alerts.first else { return XCTFail("High-confidence report was not emitted") }
    XCTAssertGreaterThanOrEqual(alert.confidence, 0.9)
    let gateSuite = "com.fylogia.unit.alert.\(UUID().uuidString)"
    let gateDefaults = UserDefaults(suiteName: gateSuite)!
    defer { gateDefaults.removePersistentDomain(forName: gateSuite) }
    var gate = FylogiaBreakingAlertGate(defaults: gateDefaults)
    XCTAssertTrue(gate.allow(alert, preferences: preferences, now: now))
    XCTAssertFalse(gate.allow(alert, preferences: preferences, now: now.addingTimeInterval(3600)))
    preferences.optedIn = false
    XCTAssertFalse(gate.allow(alert, preferences: preferences, now: now.addingTimeInterval(7200)))
  }
  func testBreakingPreferencesAreOptInByDefaultAndPersistSelectedTopics() {
    let name = "com.fylogia.unit.breaking-preferences.\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: name)!
    defer { defaults.removePersistentDomain(forName: name) }
    let store = FylogiaBreakingPreferenceStore(defaults: defaults)
    XCTAssertFalse(store.load().optedIn)
    store.save(FylogiaBreakingPreferences(optedIn: true, topics: ["Science", "Invalid"]))
    XCTAssertEqual(store.load().topics, ["Science"])
  }
  func testPaginationPerformance() {
    measure { _ = Pagination.pages(stories: Story.fixtures, size: CGSize(width: 480, height: 790)) }
  }
  func testImageReservesSpaceWithoutLosingText() {
    let base = Story.fixtures[0]
    let story = Story(
      id: base.id, source: base.source, title: base.title, url: base.url, excerpt: base.excerpt,
      content: base.content, full: base.full, image: "https://example.com/photo.jpg",
      contentDetails: base.contentDetails)
    let pages = Pagination.pages(stories: [story], size: CGSize(width: 390, height: 640))
    XCTAssertGreaterThan(pages[0].imageHeight, 0)
    XCTAssertEqual(pages[1].imageHeight, 0)
    XCTAssertEqual(pages.map(\.range.length).reduce(0, +), pages[0].text.length)
    // The Core Text frame's top must begin beneath the photo after the Y flip.
    let textTop = 640 - 30 - pages[0].textSize.height
    XCTAssertGreaterThanOrEqual(textTop, 20 + pages[0].imageHeight - 16)
  }
}
