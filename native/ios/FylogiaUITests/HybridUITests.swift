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
      ? app.staticTexts["Story 1â€“2 of 8"]
      : app.buttons.matching(
        NSPredicate(format: "label CONTAINS %@", "A new perspective on our changing world")
      ).firstMatch
    guard contentReady.waitForExistence(timeout: 60) else {
      attachReadinessDiagnostics(app, stage: "feed-content-unavailable")
      throw ReadinessError.feedUnavailable
    }

    let homepage = app.buttons["Fylogia â€” Go to homepage"].firstMatch
    guard homepage.waitForExistence(timeout: 10) else {
      attachReadinessDiagnostics(app, stage: "homepage-control-unavailable")
      throw ReadinessError.homepageControlUnavailable
    }
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
        predicate: NSPs^¼Û«h‘éì¶»§q«^v÷fR—BæB7V66W76gVÆÇ’6Æ÷6W2F†RG&vW"âF†RV&Æ–W"76W'F–öâF†BF†RÖv¦–æR66W76–&–Æ—G’VÆVÖVçB×W7BF—6V"F–Bæ÷B&W&W6VçBF†—2f—7VÂFW6–vâà¢ÒWFFVBFW7DFF—fTfVVDæD&÷VæDG&vFòv—Bf÷"†—GF&ÆRæf–vF–öâ6Æ÷6R6öçG&öÂÂF—BÂF†Vâ&WV—&RF†RæF—fRÖv¦–æRFò&V6öÖR†—GF&ÆRv–ââF†—26†V6·2÷fW&Æ’&V6†&–Æ—G’æB&W7F÷&VB&öö²–çFW&7F–öâ&F†W"F†â&VÖ÷f–ærF†R66W76–&–Æ—G’&WV—&VÖVçBâ¢¥52ó¢¢Â¦W&òf–ÇW&W2Â#CRãb6V6öæG2âF†R6ÖR'Vâ6ö×ÆWFVBF†RW†—7F–ær6æ6VÆVB÷6Æ÷röf7BöW‡G&VÖRG&ræB&÷FF–öâ76W'F–öç2â&W7VÇC¢õföÇVÖW2ôFWfVÆ÷ÖVçG2õ†6öFRõFW7E&W7VÇG2ôg–Æöv–Ö•DÖ–æ’ÔFF—fT÷fW&Æ’Ó##cRç†7&W7VÇF²ÆöræB„5FW7B67&VVç6†÷BGF6†ÖVçG3¢õföÇVÖW2ôFWfVÆ÷ÖVçG2õ†6öFRõFW7E&W7VÇG2ôg–Æöv–Ö•DÖ–æ’ÔFF—fT÷fW&Æ’Ó##cRæÆövæBF†R&W7VÇB'VæFÆRâF†R&–÷"&V6÷&F–ær—2BF†RF‚&÷fRà¢ÒFFVBFW7DöffÆ–æUDd6öçF–çV÷W567&öÆÆ–ævæBâ÷&–v–æÂV–v‡B×vRDb–âF†R&—G’f—‡GW&Rw2æöçW'6—7FVçB–æFW†VDD"7F÷&RâF†RFW7B6ö×–ÆW2æB6VÆV7G2÷'G&—B6öçF–çV÷W2&VF–ærv—F‚ÒÖöffÆ–æR×FW7Fâ—G26öÆR•BÖ–æ’GFV×Bv2¢¤$Äô4´TB&Vf÷&RF†R÷FW7B&öG’ÆVæ6†VB¢£¢„5FW7B'VææW"&W÷'FVB„5DFVÖöäW'&÷$FöÖ–â6öFSÓ†ÂF–ÖVB÷WBv—F–ærf÷"‚ÆöFVBæ÷F–f–6F–öæâæòDbT’76W'F–öç2&âæBF†RGFV×Bv2æ÷B&WVFVBâ&W7VÇC¢õföÇVÖW2ôFWfVÆ÷ÖVçG2õ†6öFRõFW7E&W7VÇG2ôg–Æöv–Ö•DÖ–æ’ÔöffÆ–æUDbÓ##cRç†7&W7VÇF²Æös¢õföÇVÖW2ôFWfVÆ÷ÖVçG2õ†6öFRõFW7E&W7VÇG2ôg–Æöv–Ö•DÖ–æ’ÔöffÆ–æUDbÓ##cRæÆövà¢Ò¢¥52ÂFW6·F÷vV$¶—BöæÇ“¢¢¢W†—7F–ær67&—G2÷FW7BÖ6öç6—7FVçB×&VFW'2æÖ§6&Vw&W76–öâ76VB6öçF–çV÷W2öÆ§’DbÆöF–æræBöffÆ–æR6öçF–çVF–öââfö7W6VBf—‡GW&R6Öö¶RÇ6ò÷VæVBF†R6VVFVBÆö6ÂDbÂ&VæFW&VBvRÂ7v—F6†VBæWGv÷&²66W72öfbÂæB&VæFW&VBvRc²67&VVç6†÷C¢õföÇVÖW2ôFWfVÆ÷ÖVçG2õ†6öFRõFW7E&W7VÇG2ôg–Æöv–ÕDbÔf—‡GW&RÔöffÆ–æRÓ##cR÷vRÓbÖöffÆ–æRçæv²Æös¢õföÇVÖW2ôFWfVÆ÷ÖVçG2õ†6öFRõFW7E&W7VÇG2ôg–Æöv–Ö•DÖ–æ’ÕDbÔf—‡GW&RÕ6Öö¶RÓ##cRæÆövâF†—2FöW2æ÷B&WÆ6RF†R&Æö6¶VBæF—fR•BT’FW7Bà¢ÒÖVÖ÷'’öâF†R‚t"Ö3¢FF—fR'Vâ&V6†VB#"Rg&VRv—F‚bãst"7v–âW6Rƒrãrt"F÷FÂ“²gFW"6‡WFF÷vâ—B&V6÷fW&VBFòSBRg&VRò"ãSrt"7vâDb'VææW"7F'GW&VÖ–æVBB#~(	33’Rg&VRv—F‚V²ö'6W'fVBRãs‚t"7vƒbãBt"F÷FÂ“²gFW"6‡WFF÷vâ—B&V6÷fW&VBFòSbRg&VRò"ãsRt"7vâ–çFW&æÂg&VR76R7F–VB&÷fR3’t"âF†R•BÖ–æ’v2w&6VgVÆÇ’6‡WBF÷vã²æò6–×VÆF÷"&VÖ–ç2&ö÷FVBâF†R&—G’FW7B7F÷&R—2æöçW'6—7FVçBæBæòW†—7F–ærÆ–'&'’v2&W6WBà ¢¢¤fö7W6VB&W7VÇC¢¢¢FF—fRæf–vF–öâö7W&Â÷&÷FF–öâ53²æF—fRDbT’66WFæ6R$Äô4´TBB„5FW7B66W76–&–Æ—G’×6W76–öâ–æ—F–Æ—¦F–öã²FW6·F÷vV$¶—BDbööffÆ–æR&V†f–÷"52âF†RgVÆÂ6–×VÆF÷"÷‡—6–6ÂÖFWf–6R66WFæ6RvFR&VÖ–ç2¢¤äòÔtò¢¢à