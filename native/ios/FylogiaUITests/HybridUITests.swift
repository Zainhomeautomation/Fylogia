import XCTest

final class HybridUITests: XCTestCase {
  @MainActor private func launch() -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = ["--parity-testing"]
    app.launch()
    XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 20))
    XCTAssertTrue(app.buttons["Fylogia — Go to homepage"].firstMatch.waitForExistence(timeout: 20))
    return app
  }
  @MainActor private func navigate(_ name: String, app: XCUIApplication) {
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
    let drawer = app.otherElements.matching(
      NSPredicate(format: "label BEGINSWITH %@", "Main navigation")
    ).firstMatch
    XCTAssertTrue(drawer.waitForExistence(timeout: 5), "Main navigation drawer is missing")
    let button = drawer.buttons[name].firstMatch
    XCTAssertTrue(button.waitForExistence(timeout: 5))
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
  @MainActor func testAdaptiveFeedAndBoundDrag() {
    XCUIDevice.shared.orientation = .landscapeLeft
    let app = launch()
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
    sleep(1)
    let hidden = XCTNSPredicateExpectation(
      predicate: NSPredicate(format: "exists == false"), object: nativeBook)
    XCTAssertEqual(
      XCTWaiter.wait(for: [hidden], timeout: 5), .completed,
      "Native pages must not cover the overlay navigation")
    app.buttons["Close navigation"].tap()
    XCTAssertTrue(nativeBook.waitForExistence(timeout: 8))

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
  @MainActor func testArticleModesAndNavigationSurviveRotation() {
    XCUIDevice.shared.orientation = .portrait
    let app = launch()
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
  @MainActor func testGoldenNavigationSettingsAndScreenshots() {
    XCUIDevice.shared.orientation = .portrait
    let app = launch()
    capture("native-portrait", app: app)
    navigate("Settings", app: app)
    XCTAssertTrue(app.staticTexts["Appearance"].waitForExistence(timeout: 5))
    let light = app.switches.matching(NSPredicate(format: "label == %@", "Light")).firstMatch
    XCTAssertTrue(light.waitForExistence(timeout: 5))
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
    if app.keyboards.firstMatch.exists {
      app.buttons["Open navigation"].tap()
      let closeNavigation = app.buttons["Close navigation"]
      let drawerOpened = XCTNSPredicateExpectation(
        predicate: NSPredicate(format: "exists == true AND hittable == true"),
        object: closeNavigation)
      XCTAssertEqual(XCTWaiter.wait(for: [drawerOpened], timeout: 5), .completed)
      let keyboardDismissed = XCTNSPredicateExpectation(
        predicate: NSPredicate(format: "exists == false"), object: app.keyboards.firstMatch)
      XCTAssertEqual(XCTWaiter.wait(for: [keyboardDismissed], timeout: 5), .completed)
    }
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
  }
}
