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
    if open.exists && open.isHittable { open.tap() }
    let button = app.buttons[name].firstMatch
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
  @MainActor func testPortraitSpreadAndBoundDrag() {
    XCUIDevice.shared.orientation = .portrait
    let app = launch()
    let progress = app.staticTexts["Story 1–2 of 8"]
    XCTAssertTrue(progress.waitForExistence(timeout: 10))
    app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.28)).press(
      forDuration: 0.05,
      thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.08)))
    sleep(3)
    capture("bound-portrait-before", app: app)
    let group = app.descendants(matching: .any)[
      "News pages. Swipe horizontally or use the page buttons."
    ].firstMatch
    XCTAssertTrue(group.exists)
    print("BOUND group frame \(group.frame)")
    let nativeBook = app.otherElements["Native bound magazine"]
    XCTAssertTrue(
      nativeBook.waitForExistence(timeout: 8), "Must exercise native UIKit, not web fallback")
    XCTAssertEqual(nativeBook.value as? String, "spread=2;spine=mid")
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
    XCUIDevice.shared.orientation = .landscapeLeft
    sleep(3)
    XCTAssertTrue(progress.exists)
    capture("bound-landscape", app: app)
    XCUIDevice.shared.orientation = .portrait
  }
  @MainActor func testGoldenNavigationSettingsAndScreenshots() {
    XCUIDevice.shared.orientation = .portrait
    let app = launch()
    capture("native-portrait", app: app)
    navigate("Settings", app: app)
    XCTAssertTrue(app.staticTexts["Appearance"].waitForExistence(timeout: 5))
    app.descendants(matching: .any)["Light"].firstMatch.tap()
    XCTAssertTrue(app.descendants(matching: .any)["Light"].firstMatch.exists)
    app.descendants(matching: .any)["Editorial Green"].firstMatch.tap()
    app.descendants(matching: .any)["Midnight Navy"].firstMatch.tap()
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
  }
}
