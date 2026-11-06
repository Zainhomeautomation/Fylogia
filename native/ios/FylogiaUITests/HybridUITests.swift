import XCTest

final class HybridUITests: XCTestCase {
  private enum ReadinessError: Error, CustomStringConvertible {
    case webViewUnavailable
    case feedUnavailable
    case homepageControlUnavailable

    var description: String {
      switch self {
      case .webViewUnavailable: "WebKit view did not attach within 30 seconds after launch."
      case .feedUnavailable: "Fylogia feed content did not become accessible within 60 seconds."
      case .homepageControlUnavailable:
        "Fylogia rendered feed content, but the homepage control was not accessible within 10 seconds."
      }
    }
  }

  @MainActor private func attachReadinessDiagnostics(_ app: XCUIApplication, stage: String) {
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "startup-\(stage)-screenshot"
    screenshot.lifetime = .keepAlways
    add(screenshot)

    let hierarchy = XCTAttachment(string: app.debugDescription)
    hierarchy.name = "startup-\(stage)-accessibility-hierarchy"
    hierarchy.lifetime = .keepAlways
    add(hierarchy)
  }

  @MainActor private func launch(
    arguments: [String] = ["--parity-testing"]
  ) throws -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = arguments
    app.launch()

    guard app.webViews.firstMatch.waitForExistence(timeout: 30) else {
      attachReadinessDiagnostics(app, stage: "webview-unavailable")
      throw ReadinessError.webViewUnavailable
    }

    let landscape =
      XCUIDevice.shared.orientation == .landscapeLeft
      || XCUIDevice.shared.orientation == .landscapeRight
    let contentReady =
      landscape
      ? app.staticTexts["Story 1–2 of 8"]
      : app.buttons.matching(
        NSPredicate(format: "label CONTAINS %@", "A new perspective on our changing world")
      ).firstMatch
    guard contentReady.waitForExistence(timeout: 60) else {
      attachReadinessDiagnostics(app, stage: "feed-content-unavailable")
      throw ReadinessError.feedUnavailable
    }

    let homepage = app.buttons["Fylogia — Go to homepage"].firstMatch
    guard homepage.waitForExistence(timeout: 10) else {
      attachReadinessDiagnostics(app, stage: "homepage-control-unavailable")
      throw ReadinessError.homepageControlUnavailable
    }
    return app
  }
  @MainActor private func navigate(_ name: String, app: XCUIApplication) {
    let sidebar = app.otherElements.matching(
      NSPredicate(format: "label BEGINSWITH %@", "Main navigation")
    ).firstMatch
    let sidebarRoute = sidebar.buttons[name].firstMatch

    // Wide iPad layouts keep the route list visible. Compact iPhone layouts
    // expose the same routes after opening the navigation menu.
    if sidebar.exists && sidebarRoute.exists && sidebarRoute.isHittable {
      sidebarRoute.tap()
      return
    }

    let open = app.buttons["Open navigation"]
    let close = app.buttons["Close navigation"]
    if !close.exists || !close.isHittable {
      XCTAssertTrue(open.waitForExistence(timeout: 5))
      XCTAssertTrue(open.isHittable, "Navigation opener must be hittable before route selection")
      open.tap()
      let drawerOpened = XCTNSPredicateExpectation(
        predicate: NSPredicate(format: "exists == true AND hittable == true"), object: close)
      XCTAssertEqual(XCTWaiter.wait(for: [drawerOpened], timeout: 5), .completed)
    }
    XCTAssertTrue(sidebar.waitForExistence(timeout: 5), "Main navigation is missing")
    let button = sidebar.buttons[name].firstMatch
    XCTAssertTrue(button.waitForExistence(timeout: 5))
    XCTAssertTrue(button.isHittable, "Navigation route \(name) must be reachable")
    button.tap()
  }
  @MainActor private func capture(_ name: String, app: XCUIApplication) {
    let web = app.webViews.firstMatch
    let a = XCTAttachment(screenshot: web.screenshot())
    a.name = name
    a.lifetime = .keepAlways
    add(a)
    print("PARITY viewport \(name) \(web.frame.width)x\(web.frame.height)")
  }
  @MainActor private func scrollToVisiblePDFPage(
    _ number: Int, app: XCUIApplication, maxGestures: Int = 10
  ) -> XCUIElement? {
    let canvas = app.descendants(matching: .any)["Magazine page \(number)"].firstMatch
    let webView = app.webViews.firstMatch
    let zoomToolbar = app.otherElements["Magazine zoom"]
    let footer = app.otherElements["section footer"]
    guard zoomToolbar.waitForExistence(timeout: 5), footer.waitForExistence(timeout: 5) else {
      return nil
    }
    let viewport = CGRect(
      x: webView.frame.minX,
      y: zoomToolbar.frame.maxY,
      width: webView.frame.width,
      height: max(0, footer.frame.minY - zoomToolbar.frame.maxY))
    let counter = app.staticTexts["Page \(number) of 8"]

    for gesture in 0..<maxGestures {
      if canvas.exists && canvas.frame.intersects(viewport) && counter.exists { return canvas }
      print("PDF page \(number) visibility gesture \(gesture + 1)/\(maxGestures)")
      let start = webView.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.82))
      let end = webView.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.30))
      start.press(
        forDuration: 0.08, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.15)
    }
    if canvas.exists {
      print("PDF page \(number) final frame \(canvas.frame), viewport \(viewport)")
    }
    return nil
  }
  @MainActor func testAdaptiveFeedAndBoundDrag() throws {
    XCUIDevice.shared.orientation = .landscapeLeft
    let app = try launch()
    let progress = app.staticTexts["Story 1–2 of 8"]
    XCTAssertTrue(progress.waitForExistence(timeout: 10))
    sleep(3)
    let controls = app.buttons["Edition controls"]
    XCTAssertTrue(controls.exists)
    controls.tap()
    XCTAssertTrue(app.buttons["Resume reading"].waitForExistence(timeout: 8))
    app.buttons["Resume reading"].tap()
    sleep(2)
    capture("bound-portrait-before", app: app)
    let group = app.descendants(matching: .any)[
      "News pages. Swipe horizontally or use the page buttons."
    ].firstMatch
    XCTAssertTrue(group.exists)
    print("BOUND group frame \(group.frame)")
    XCTAssertLessThan(group.frame.minY, 150)
    XCTAssertLessThanOrEqual(group.frame.maxY, app.frame.maxY - 10)
    let nativeBook = app.otherElements["Native bound magazine"]
    XCTAssertTrue(
      nativeBook.waitForExistence(timeout: 8), "Must exercise native UIKit, not web fallback")
    XCTAssertEqual(nativeBook.value as? String, "spread=2;spine=mid")
    app.buttons["Open navigation"].tap()
    let closeNavigation = app.buttons["Close navigation"]
    let overlayReady = XCTNSPredicateExpectation(
      predicate: NSPredicate(format: "exists == true AND hittable == true"),
      object: closeNavigation)
    XCTAssertEqual(
      XCTWaiter.wait(for: [overlayReady], timeout: 8), .completed,
      "Overlay navigation must remain reachable above the dimmed native pages")
    closeNavigation.tap()
    let bookRestored = XCTNSPredicateExpectation(
      predicate: NSPredicate(format: "exists == true AND hittable == true"), object: nativeBook)
    XCTAssertEqual(
      XCTWaiter.wait(for: [bookRestored], timeout: 8), .completed,
      "Closing navigation must restore the interactive native magazine")

    let right = group.coordinate(withNormalizedOffset: CGVector(dx: 0.98, dy: 0.65))
    let left = group.coordinate(withNormalizedOffset: CGVector(dx: 0.04, dy: 0.65))
    let partial = group.coordinate(withNormalizedOffset: CGVector(dx: 0.92, dy: 0.65))
    right.press(
      forDuration: 0.1, thenDragTo: partial, withVelocity: .slow, thenHoldForDuration: 0.2)
    sleep(2)
    XCTAssertTrue(progress.exists, "Short drag must cancel without advancing")
    right.press(forDuration: 0.15, thenDragTo: left, withVelocity: .slow, thenHoldForDuration: 0.2)
    XCTAssertTrue(app.staticTexts["Story 3–4 of 8"].waitForExistence(timeout: 8))
    sleep(2)
    capture("bound-portrait-after", app: app)
    left.press(forDuration: 0.1, thenDragTo: right, withVelocity: .fast, thenHoldForDuration: 0)
    XCTAssertTrue(progress.waitForExistence(timeout: 8))
    sleep(2)
    let outside = app.coordinate(withNormalizedOffset: .zero).withOffset(
      CGVector(dx: 2, dy: group.frame.minY + group.frame.height * 0.65))
    right.press(
      forDuration: 0.1, thenDragTo: outside, withVelocity: .slow, thenHoldForDuration: 0.3)
    sleep(2)
    // This drag crosses the entire book before leaving it. UIKit may settle at
    // its completion threshold: exactly one spread must advance, never two.
    let settled = app.staticTexts["Story 3–4 of 8"]
    XCTAssertTrue(settled.exists, "Full-width over-drag must settle exactly one spread")
    capture("bound-extreme-drag-settled", app: app)
    XCUIDevice.shared.orientation = .portrait
    sleep(3)
    XCTAssertTrue(
      app.staticTexts["Stories — swipe vertically to browse"].waitForExistence(timeout: 8))
    XCTAssertFalse(nativeBook.exists)
    let portraitPosition = app.otherElements.matching(
      NSPredicate(format: "label CONTAINS %@", "Scrolling news feed. Story")
    ).firstMatch
    XCTAssertTrue(portraitPosition.waitForExistence(timeout: 5))
    XCTAssertTrue(portraitPosition.label.contains("Scrolling news feed. Story 3 of 8"))
    capture("scrolling-portrait", app: app)
    XCUIDevice.shared.orientation = .landscapeLeft
    sleep(3)
    XCTAssertTrue(settled.exists)
    capture("bound-landscape", app: app)
    XCUIDevice.shared.orientation = .portrait
  }
  @MainActor func testOfflinePDFContinuousScrolling() throws {
    XCUIDevice.shared.orientation = .portrait
    let app = try launch(arguments: ["--parity-testing", "--offline-test"])
    navigate("Magazines", app: app)

    let openFixture = app.buttons["Open Fylogia Offline PDF Fixture"]
    XCTAssertTrue(openFixture.waitForExistence(timeout: 10))
    openFixture.tap()

    let firstPage = app.staticTexts["Page 1 of 8"]
    XCTAssertTrue(firstPage.waitForExistence(timeout: 20))
    let continuousPages = app.descendants(matching: .any)["Continuous magazine pages"]
      .firstMatch
    XCTAssertTrue(
      continuousPages.waitForExistence(timeout: 8),
      "The locally stored PDF must open in the continuous portrait reader while offline")
    let firstCanvas = app.descendants(matching: .any)["Magazine page 1"].firstMatch
    XCTAssertTrue(
      firstCanvas.waitForExistence(timeout: 15), "The first offline PDF page must render")

    for number in [4, 6, 8] {
      let canvas = scrollToVisiblePDFPage(number, app: app)
      XCTAssertNotNil(
        canvas,
        "Offline PDF page \(number) must lazy-render and become visible after scrolling")
      guard let canvas else { return }
      let counter = app.staticTexts["Page \(number) of 8"]
      XCTAssertTrue(
        counter.waitForExistence(timeout: 5),
        "The continuous reader should report page \(number) while it is visible")
      capture("offline-pdf-continuous-page-\(number)", app: app)
    }
  }
  @MainActor func testArticleModesAndNavigationSurviveRotation() throws {
    XCUIDevice.shared.orientation = .portrait
    let app = try launch()
    for pass in 0..<2 {
      let story = app.buttons.matching(
        NSPredicate(format: "label CONTAINS %@", "A new perspective on our changing world")
      ).firstMatch
      XCTAssertTrue(story.waitForExistence(timeout: 8))
      story.tap()
      let scrolling = app.staticTexts.matching(
        NSPredicate(format: "label BEGINSWITH %@", "Scroll reading")
      ).firstMatch
      XCTAssertTrue(scrolling.waitForExistence(timeout: 8))
      if pass == 0 { capture("consistent-portrait-article", app: app) }
      app.webViews.firstMatch.swipeUp()
      XCUIDevice.shared.orientation = .landscapeLeft
      let spread = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "Spread "))
        .firstMatch
      XCTAssertTrue(spread.waitForExistence(timeout: 10))
      let bound = app.otherElements["Native bound magazine"]
      XCTAssertTrue(bound.waitForExistence(timeout: 8))
      XCTAssertEqual(bound.value as? String, "spread=2;spine=mid")
      if pass == 0 { capture("consistent-landscape-article", app: app) }
      XCUIDevice.shared.orientation = .portrait
      XCTAssertTrue(scrolling.waitForExistence(timeout: 10))
      XCTAssertFalse(bound.exists)
      if pass == 0 {
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(scrolling.waitForExistence(timeout: 8))
      }
      app.buttons["Back to previous section"].tap()
      XCTAssertTrue(
        app.staticTexts["Stories — swipe vertically to browse"].waitForExistence(timeout: 8))
    }
  }
  @MainActor func testGoldenNavigationSettingsAndScreenshots() throws {
    XCUIDevice.shared.orientation = .portrait
    let app = try launch()
    capture("native-portrait", app: app)
    navigate("Settings", app: app)
    XCTAssertTrue(app.staticTexts["Appearance"].waitForExistence(timeout: 5))
    let light = app.switches.matching(NSPredicate(format: "label == %@", "Light")).firstMatch
    XCTAssertTrue(light.waitForExistence(timeout: 5))
    XCTAssertTrue(light.isHittable, "Settings Appearance choice must be reachable")
    light.tap()
    XCTAssertTrue(light.exists)
    app.switches.matching(NSPredicate(format: "label == %@", "Editorial Green")).firstMatch.tap()
    app.switches.matching(NSPredicate(format: "label == %@", "Midnight Navy")).firstMatch.tap()
    navigate("Categories", app: app)
    let categorySearch = app.textFields["Find a category"]
    XCTAssertTrue(categorySearch.waitForExistence(timeout: 5))
    categorySearch.tap()
    categorySearch.typeText("Science")
    XCTAssertTrue(
      app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Science ")).firstMatch
        .waitForExistence(timeout: 5))
    navigate("My Sources", app: app)
    XCTAssertTrue(
      app.textFields.firstMatch.waitForExistence(timeout: 5) || app.searchFields.firstMatch.exists)
    navigate("Saved Articles", app: app)
    navigate("Magazines", app: app)
    XCTAssertTrue(
      app.staticTexts["Magazines"].firstMatch.exists || app.buttons["Magazines"].firstMatch.exists)
    navigate("For You", app: app)
    XCUIDevice.shared.orientation = .landscapeLeft
    sleep(2)
    capture("native-landscape", app: app)
    XCTAssertTrue(app.buttons["Fylogia — Go to homepage"].firstMatch.exists)
    XCUIDevice.shared.orientation = .portrait

    let story = app.buttons.matching(
      NSPredicate(format: "label CONTAINS %@", "A new perspective on our changing world")
    ).firstMatch
    XCTAssertTrue(story.waitForExistence(timeout: 8), "The feed story must be accessible")
    story.tap()
    let article = app.staticTexts.matching(
      NSPredicate(format: "label BEGINSWITH %@", "Scroll reading")
    ).firstMatch
    XCTAssertTrue(article.waitForExistence(timeout: 8), "The article reading mode must be exposed")
    let back = app.buttons["Back to previous section"]
    XCTAssertTrue(back.waitForExistence(timeout: 5))
    XCTAssertTrue(back.isHittable, "Article navigation must expose a reachable return control")
  }

}
