import XCTest

final class ReaderUITests: XCTestCase {
  @MainActor func testTurnSaveResizeAndRestore() {
    let app = XCUIApplication()
    app.launchArguments = ["--ui-testing", "--reset-test-state"]
    app.launch()
    let progress = app.staticTexts["pageProgress"]
    XCTAssertTrue(progress.waitForExistence(timeout: 15))
    let initial = progress.label
    app.buttons["next"].tap()
    XCTAssertEqual(
      XCTWaiter.wait(
        for: [
          XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "label != %@", initial), object: progress)
        ], timeout: 5), .completed)
    sleep(1)
    XCTAssertNotEqual(progress.label, initial)
    app.buttons["save"].tap()
    XCTAssertEqual(app.buttons["save"].label, "Unsave story")
    let position = (progress.value as? String)?.components(separatedBy: "; ").dropFirst().joined(
      separator: "; ")
    XCUIDevice.shared.orientation = .landscapeLeft
    sleep(2)
    XCTAssertEqual(
      (progress.value as? String)?.components(separatedBy: "; ").dropFirst().joined(
        separator: "; "), position)
    app.terminate()
    app.launchArguments = ["--ui-testing"]
    app.launch()
    XCTAssertTrue(progress.waitForExistence(timeout: 15))
    XCTAssertEqual(
      (progress.value as? String)?.components(separatedBy: "; ").dropFirst().joined(
        separator: "; "), position)
    XCTAssertEqual(app.buttons["save"].label, "Unsave story")
    XCUIDevice.shared.orientation = .portrait
  }
  @MainActor func testReducedMotionNavigation() {
    let app = XCUIApplication()
    app.launchArguments = ["--ui-testing", "--reset-test-state", "--reduce-motion"]
    app.launch()
    let p = app.staticTexts["pageProgress"]
    XCTAssertTrue(p.waitForExistence(timeout: 15))
    let initial = p.label
    app.buttons["next"].tap()
    sleep(1)
    XCTAssertNotEqual(p.label, initial)
    app.buttons["previous"].tap()
    sleep(1)
    XCTAssertEqual(p.label, initial)
  }
  @MainActor func testFingerCurlForwardAndBack() {
    let app = XCUIApplication()
    app.launchArguments = ["--ui-testing", "--reset-test-state"]
    app.launch()
    let progress = app.staticTexts["pageProgress"]
    XCTAssertTrue(progress.waitForExistence(timeout: 15))
    let initial = progress.label
    let start = app.coordinate(withNormalizedOffset: CGVector(dx: 0.93, dy: 0.7))
    let end = app.coordinate(withNormalizedOffset: CGVector(dx: 0.15, dy: 0.7))
    start.press(forDuration: 0.15, thenDragTo: end)
    XCTAssertEqual(
      XCTWaiter.wait(
        for: [
          XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "label != %@", initial), object: progress)
        ], timeout: 5), .completed)
    let evidence = XCTAttachment(screenshot: app.screenshot())
    evidence.name = "Native curl after finger turn"
    evidence.lifetime = .keepAlways
    add(evidence)
    app.buttons["previous"].tap()
    XCTAssertEqual(
      XCTWaiter.wait(
        for: [
          XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "label == %@", initial), object: progress)
        ], timeout: 5), .completed)
  }
}
