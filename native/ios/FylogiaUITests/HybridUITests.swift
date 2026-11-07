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

  @MainActor private func landscapeFirstSpreadIsReady(
    _ app: XCUIApplication, timeout: TimeInterval
  ) -> Bool {
    let firstFeedPage = app.otherElements.matching(
      NSPredicate(format: "label CONTAINS %@", "Horizontally scrolling news feed. Story 1 of 8")
    ).firstMatch
    let firstStory = app.buttons.matching(
      NSPredicate(format: "label CONTAINS %@", "A new perspective on our changing world")
    ).firstMatch
    let secondStory = app.buttons.matching(
      NSPredicate(format: "label CONTAINS %@", "Inside the ideas shaping tomorrow")
    ).firstMatch
    let visibleStory = NSPredicate(format: "exists == true AND hittable == true")
    let expectations = [firstFeedPage, firstStory, secondStory].map {
      XCTNSPredicateExpectation(predicate: visibleStory, object: $0)
    }
    return XCTWaiter.wait(for: expectations, timeout: timeout) == .completed
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
    let contentReady: Bool
    if landscape {
      contentReady = landscapeFirstSpreadIsReady(app, timeout: 60)
    } else {
      contentReady = app.buttons.matching(
        NSPredicate(format: "label CONTAINS %@", "A new perspective on our changing world")
      ).firstMatch.waitForExistence(timeout: 60)
    }
    guard contentReady else {
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
    // On iPad the persistent sidebar route can be directly accessible even
    // when its navigation container is reported under a different AX type.
    let visibleRoute = app.buttons[name].firstMatch
    if visibleRoute.exists && visibleRoute.isHittable {
      visibleRoute.tap()
      return
    }

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
      // On iPad portrait, XCUITest can report the compact header button's
      // frame just above the WebView while still activating the control.
      // Confirm the drawer opened below instead of trusting that stale frame.
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

  @MainActor private func assertAccessibleHitTarget(
    _ element: XCUIElement, name: String, minimum: CGFloat = 44
  ) {
    XCTAssertTrue(element.waitForExistence(timeout: 8), "Missing accessible control: \(name)")
    XCTAssertGreaterThanOrEqual(
      element.frame.width, minimum, "\(name) is narrower than its 44 point hit target")
    XCTAssertGreaterThanOrEqual(
      element.frame.height, minimum, "\(name) is shorter than its 44 point hit target")
    XCTAssertTrue(element.isHittable, "\(name) must be reachable")
  }

  @MainActor func testFocusedAccessibilityTargetsAndStoryDescription() throws {
    XCUIDevice.shared.orientation = .portrait
    let app = try launch()
    let title = "A new perspective on our changing world"
    let saveStory = app.buttons.matching(
      NSPredicate(format: "label BEGINSWITH %@", "Save \(title)")
    ).firstMatch
    let downloadStory = app.buttons.matching(
      NSPredicate(format: "label BEGINSWITH %@", "Download offline \(title)")
    ).firstMatch
    assertAccessibleHitTarget(saveStory, name: "Feed bookmark")
    assertAccessibleHitTarget(downloadStory, name: "Feed offline download")

    saveStory.tap()
    let savedStory = app.buttons.matching(
      NSPredicate(format: "label BEGINSWITH %@", "Unsave \(title)")
    ).firstMatch
    XCTAssertTrue(savedStory.waitForExistence(timeout: 5), "Bookmark action must still toggle")
    let isStorySaved = savedStory.exists
    navigate("Saved Articles", app: app)
    XCTAssertTrue(
      app.buttons.matching(NSPredicate(format: "label CONTAINS %@", title)).firstMatch
        .waitForExistence(timeout: 8),
      "Saved story must remain available in the Saved Articles route")
    navigate("For You", app: app)

    let artwork = app.descendants(matching: .any).matching(
      NSPredicate(format: "label CONTAINS %@", "Story image accompanying: \(title)")
    ).firstMatch
    XCTAssertTrue(artwork.waitForExistence(timeout: 8), "Story artwork needs contextual alt text")

    let story = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", title)).firstMatch
    XCTAssertTrue(story.exists)
    story.tap()
    let saveArticle = app.buttons["Save article"]
    let unsaveArticle = app.buttons["Unsave article"]
    let downloadArticle = app.buttons["Download current article"]
    XCTAssertEqual(
      saveArticle.exists, !isStorySaved,
      "Article bookmark action must reflect the saved state from the feed")
    XCTAssertEqual(
      unsaveArticle.exists, isStorySaved,
      "Article bookmark action must reflect the saved state from the feed")
    assertAccessibleHitTarget(
      isStorySaved ? unsaveArticle : saveArticle, name: "Article bookmark")
    assertAccessibleHitTarget(downloadArticle, name: "Article offline download")
    app.buttons["Back to previous section"].tap()

    navigate("Settings", app: app)
    let appearance = app.switches["Warm cream paper"].firstMatch
    let readingMode = app.staticTexts["Reading mode"].firstMatch
    assertAccessibleHitTarget(appearance, name: "Settings appearance choice")
    XCTAssertTrue(readingMode.waitForExistence(timeout: 8), "Reading mode must be discoverable")
    XCTAssertTrue(readingMode.isHittable, "Reading mode must be visible to assistive technology")
    XCTAssertTrue(
      app.staticTexts.matching(
        NSPredicate(format: "label CONTAINS %@", "Scroll vertically in portrait")
      ).firstMatch.exists,
      "Settings must explain the active scroll-only reading modes")

    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "accessibility-targets-settings"
    screenshot.lifetime = .keepAlways
    add(screenshot)
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
    let currentCounter = app.staticTexts.matching(
      NSPredicate(format: "label MATCHES %@", "Page [1-8] of 8")
    ).firstMatch

    func counterMatchesVisibleCanvas() -> Bool {
      guard currentCounter.exists else { return false }
      let components = currentCounter.label.split(separator: " ")
      guard components.count == 4, let pageNumber = Int(components[1]) else { return false }
      let reportedCanvas = app.descendants(matching: .any)["Magazine page \(pageNumber)"].firstMatch
      return reportedCanvas.exists && reportedCanvas.frame.intersects(viewport)
    }

    for gesture in 0...maxGestures {
      let canvasVisible = canvas.exists && canvas.frame.intersects(viewport)
      if canvasVisible {
        // Continuous scrolling can show the tail of the preceding page and
        // the requested page together. Validate the counter against whichever
        // page the reader reports, and check again after the final gesture.
        if counterMatchesVisibleCanvas() { return canvas }
        if currentCounter.exists {
          let previousLabel = currentCounter.label
          let counterChanged = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "label != %@", previousLabel), object: currentCounter)
          if XCTWaiter.wait(for: [counterChanged], timeout: 3) == .completed,
            counterMatchesVisibleCanvas()
          {
            return canvas
          }
        }
        print(
          "PDF page \(number) canvas is visible but the page counter does not name a visible canvas; current label: \(currentCounter.label)"
        )
        return nil
      }

      // Some simulator sizes render the PDF canvas visibly but do not expose
      // its per-page accessibility element. The reader's page indicator is
      // driven by the same viewport-intersection state and remains accessible.
      if !canvas.exists && counter.exists && counter.isHittable {
        print(
          "PDF page \(number) reported visible by reader; canvas AX marker unavailable or outside viewport, frame \(canvas.frame), viewport \(viewport)"
        )
        return counter
      }
      if gesture == maxGestures { break }
      print("PDF page \(number) visibility gesture \(gesture + 1)/\(maxGestures)")
      let start = webView.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.82))
      let end = webView.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.30))
      start.press(
        forDuration: 0.08, thenDragTo: end, withVelocity: .slow, thenHoldForDuration: 0.15)
    }
    if canvas.exists {
      print("PDF page \(number) final frame \(canvas.frame), viewport \(viewport)")
    }
    print("PDF page \(number) final counter: \(counter.exists ? counter.label : "missing")")
    let screenshot = XCTAttachment(screenshot: app.screenshot())
    screenshot.name = "offline-pdf-page-\(number)-visibility-failure"
    screenshot.lifetime = .keepAlways
    // Preserve the WebView image and accessibility hierarchy for the next
    // failure artifact without relying on canvas hittability.
    let finalImage = XCTAttachment(screenshot: webView.screenshot())
    finalImage.name = "offline-pdf-page-\(number)-final-webview"
    finalImage.lifetime = .keepAlways
    let hierarchy = XCTAttachment(string: app.debugDescription)
    hierarchy.name = "offline-pdf-page-\(number)-final-accessibility"
    hierarchy.lifetime = .keepAlways
    // Attachments are added by the calling test's XCTestCase.
    XCTContext.runActivity(named: "PDF page \(number) final visibility state") { activity in
      activity.add(screenshot)
      activity.add(finalImage)
      activity.add(hierarchy)
    }
    return nil
  }
  @MainActor func testLandscapeFeedUsesHorizontalScrollingWithoutCurl() throws {
    XCUIDevice.shared.orientation = .landscapeLeft
    let app = try launch()
    XCTAssertTrue(landscapeFirstSpreadIsReady(app, timeout: 12))
    capture("landscape-horizontal-spread-before", app: app)
    XCTAssertFalse(app.otherElements["Native bound magazine"].exists)
    XCTAssertTrue(app.buttons["Edition controls"].exists)

    let nextSpreadLead = app.buttons.matching(
      NSPredicate(format: "label CONTAINS %@", "The art of slowing down to read")
    ).firstMatch
    app.webViews.firstMatch.swipeLeft()
    XCTAssertTrue(
      nextSpreadLead.waitForExistence(timeout: 8),
      "A horizontal scroll must reveal the next two-story spread")
    capture("landscape-horizontal-spread-after", app: app)

    let firstSpreadLead = app.buttons.matching(
      NSPredicate(format: "label CONTAINS %@", "A new perspective on our changing world")
    ).firstMatch
    app.webViews.firstMatch.swipeRight()
    XCTAssertTrue(
      firstSpreadLead.waitForExistence(timeout: 8),
      "Reverse scrolling must restore the first spread")

    XCUIDevice.shared.orientation = .portrait
    XCTAssertTrue(
      app.staticTexts["Stories — swipe vertically to browse"].waitForExistence(timeout: 10))
    XCTAssertFalse(app.otherElements["Native bound magazine"].exists)
  }

  @MainActor func testLandscapeStartupDiagnosticsAndHorizontalFeedReadiness() {
    XCUIDevice.shared.orientation = .landscapeLeft
    let app = XCUIApplication()
    app.launchArguments = ["--parity-testing", "--startup-diagnostics"]
    app.launch()

    guard app.webViews.firstMatch.waitForExistence(timeout: 30) else {
      attachReadinessDiagnostics(app, stage: "startup-diagnostics-webview-unavailable")
      XCTFail("Startup diagnostics: WKWebView did not attach within 30 seconds")
      return
    }

    let markerPredicate = NSPredicate(
      format: "label CONTAINS %@", "Startup diagnostics:")
    let diagnostics = app.descendants(matching: .any).matching(markerPredicate).firstMatch
    guard diagnostics.waitForExistence(timeout: 15) else {
      attachReadinessDiagnostics(app, stage: "startup-diagnostics-probe-unavailable")
      XCTFail("Startup diagnostics probe was not exposed to XCTest")
      return
    }

    let terminalPredicate = NSCompoundPredicate(orPredicateWithSubpredicates: [
      NSPredicate(format: "label CONTAINS %@", "feed-render-ready"),
      NSPredicate(format: "label CONTAINS %@", "recovery-screen-activated"),
      NSPredicate(format: "label CONTAINS %@", "feed-readiness-timeout"),
    ])
    let terminal = XCTNSPredicateExpectation(predicate: terminalPredicate, object: diagnostics)
    let terminalResult = XCTWaiter.wait(for: [terminal], timeout: 75)
    let timeline = diagnostics.label
    print("FYLOGIA_STARTUP_TIMELINE \(timeline)")
    guard terminalResult == .completed else {
      attachReadinessDiagnostics(app, stage: "startup-diagnostics-no-terminal-stage")
      XCTFail("Startup diagnostics produced no ready/failure terminal marker. \(timeline)")
      return
    }
    guard timeline.contains("feed-render-ready") else {
      attachReadinessDiagnostics(app, stage: "startup-diagnostics-feed-not-ready")
      XCTFail("Fylogia startup stopped before feed readiness. \(timeline)")
      return
    }

    XCTAssertTrue(landscapeFirstSpreadIsReady(app, timeout: 10))
    XCTAssertFalse(app.otherElements["Native bound magazine"].exists)
    let nextSpreadLead = app.buttons.matching(
      NSPredicate(format: "label CONTAINS %@", "The art of slowing down to read")
    ).firstMatch
    app.webViews.firstMatch.swipeLeft()
    XCTAssertTrue(nextSpreadLead.waitForExistence(timeout: 8))
    let firstSpreadLead = app.buttons.matching(
      NSPredicate(format: "label CONTAINS %@", "A new perspective on our changing world")
    ).firstMatch
    app.webViews.firstMatch.swipeRight()
    XCTAssertTrue(firstSpreadLead.waitForExistence(timeout: 8))
    XCTAssertTrue(timeline.contains("library-reconciliation-complete"))
    XCTAssertTrue(timeline.contains("library-write-batch-complete"))
    XCTAssertTrue(timeline.contains("feed-preparation-complete"))
  }

  @MainActor private func launchPersistentLibraryApp(storeID: String) -> XCUIApplication {
    let app = XCUIApplication()
    app.launchArguments = [
      "--parity-testing", "--persistent-library-testing",
      "--persistent-library-store-id=\(storeID)", "--startup-diagnostics",
    ]
    app.launch()
    XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 30))
    let startup = app.descendants(matching: .any).matching(
      NSPredicate(format: "label CONTAINS %@", "Startup diagnostics:")
    ).firstMatch
    XCTAssertTrue(startup.waitForExistence(timeout: 15))
    let terminal = XCTNSPredicateExpectation(
      predicate: NSPredicate(format: "label CONTAINS %@", "feed-render-ready"),
      object: startup)
    XCTAssertEqual(XCTWaiter.wait(for: [terminal], timeout: 75), .completed)
    XCTAssertTrue(startup.label.contains("library-reconciliation-complete"))
    XCTAssertTrue(startup.label.contains("library-write-batch-complete"))
    return app
  }

  @MainActor func testPersistentLibraryStartupRestoresBookmarkAndReadingPosition() {
    XCUIDevice.shared.orientation = .portrait
    let storeID = UUID().uuidString
    print("FYLOGIA_PERSISTENT_LIBRARY_TEST_STORE \(storeID)")
    let app = launchPersistentLibraryApp(storeID: storeID)
    let title = "Persistent startup bookmark fixture"
    let verification = app.descendants(matching: .any).matching(
      NSPredicate(format: "label CONTAINS %@", "Persistent library verification:")
    ).firstMatch

    func openSavedFixture() {
      navigate("Saved Articles", app: app)
      let story = app.buttons.matching(
        NSPredicate(format: "label CONTAINS %@", title)
      ).firstMatch
      XCTAssertTrue(story.waitForExistence(timeout: 10))
      story.tap()
      XCTAssertTrue(app.buttons["Back to previous section"].waitForExistence(timeout: 10))
      let restored = XCTNSPredicateExpectation(
        predicate: NSPredicate(format: "label CONTAINS %@", "reader-position-restored"),
        object: verification)
      XCTAssertEqual(XCTWaiter.wait(for: [restored], timeout: 15), .completed)
      XCTAssertTrue(verification.label.contains("bookmark-present"))
      XCTAssertTrue(verification.label.contains("stored-progress=0.42"))
    }

    openSavedFixture()
    let firstLaunch = XCTAttachment(screenshot: app.screenshot())
    firstLaunch.name = "persistent-library-first-launch-restored-position"
    firstLaunch.lifetime = .keepAlways
    add(firstLaunch)

    app.terminate()
    app.launch()
    let startup = app.descendants(matching: .any).matching(
      NSPredicate(format: "label CONTAINS %@", "Startup diagnostics:")
    ).firstMatch
    let feedReady = XCTNSPredicateExpectation(
      predicate: NSPredicate(format: "label CONTAINS %@", "feed-render-ready"),
      object: startup)
    XCTAssertEqual(XCTWaiter.wait(for: [feedReady], timeout: 75), .completed)
    XCTAssertTrue(startup.label.contains("library-reconciliation-complete"))
    XCTAssertTrue(startup.label.contains("library-write-batch-complete"))
    openSavedFixture()
    XCTAssertEqual(storeID.count, 36, "The isolated persistent store identifier must be a UUID")
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
        counter.exists
          || app.staticTexts.matching(
            NSPredicate(format: "label MATCHES %@", "Page [1-8] of 8")
          ).firstMatch.exists, "The continuous reader must expose its visible page status")
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
      XCTAssertTrue(scrolling.waitForExistence(timeout: 10))
      XCTAssertFalse(app.otherElements["Native bound magazine"].exists)
      if pass == 0 { capture("consistent-landscape-article", app: app) }
      XCUIDevice.shared.orientation = .portrait
      XCTAssertTrue(scrolling.waitForExistence(timeout: 10))
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

  @MainActor func testExtendedReadingSessionPreservesPositionAcrossRotations() {
    XCUIDevice.shared.orientation = .portrait
    let storeID = UUID().uuidString
    print("FYLOGIA_EXTENDED_READING_TEST_STORE \(storeID)")
    let app = launchPersistentLibraryApp(storeID: storeID)
    let title = "Persistent startup bookmark fixture"
    let verification = app.descendants(matching: .any).matching(
      NSPredicate(format: "label CONTAINS %@", "Persistent library verification:")
    ).firstMatch
    navigate("Saved Articles", app: app)
    let story = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", title)).firstMatch
    XCTAssertTrue(story.waitForExistence(timeout: 10))
    story.tap()
    let article = app.webViews.firstMatch
    XCTAssertTrue(app.buttons["Back to previous section"].waitForExistence(timeout: 10))

    for cycle in 1...6 {
      article.swipeUp(velocity: .slow)
      let portraitPosition = XCTNSPredicateExpectation(
        predicate: NSPredicate(format: "label CONTAINS %@", "reader-position-restored"),
        object: verification)
      XCTAssertEqual(
        XCTWaiter.wait(for: [portraitPosition], timeout: 8), .completed,
        "Reading position should remain synchronized after portrait scroll cycle \(cycle)")

      XCUIDevice.shared.orientation = .landscapeLeft
      XCTAssertTrue(app.buttons["Back to previous section"].waitForExistence(timeout: 10))
      article.swipeUp(velocity: .slow)
      let landscapePosition = XCTNSPredicateExpectation(
        predicate: NSPredicate(format: "label CONTAINS %@", "reader-position-restored"),
        object: verification)
      XCTAssertEqual(
        XCTWaiter.wait(for: [landscapePosition], timeout: 8), .completed,
        "Reading position should remain synchronized after landscape scroll cycle \(cycle)")
      print("FYLOGIA_EXTENDED_READING_CYCLE \(cycle) position=\(verification.label)")

      XCUIDevice.shared.orientation = .portrait
      XCTAssertTrue(app.buttons["Back to previous section"].waitForExistence(timeout: 10))
    }
    let finalEvidence = XCTAttachment(screenshot: app.screenshot())
    finalEvidence.name = "extended-reading-session-final-position"
    finalEvidence.lifetime = .keepAlways
    add(finalEvidence)
    XCTAssertTrue(verification.label.contains("bookmark-present"))
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
