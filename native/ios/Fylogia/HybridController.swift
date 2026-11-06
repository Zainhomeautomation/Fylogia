import AVFoundation
import SafariServices
import UIKit
import UserNotifications
import WebKit

/// WebKit retains registered handlers. Keep the controller's lifetime scene-owned.
@MainActor final class WeakScriptHandler: NSObject, WKScriptMessageHandler {
  weak var target: (any WKScriptMessageHandler)?
  init(_ target: any WKScriptMessageHandler) { self.target = target }
  func userContentController(
    _ controller: WKUserContentController, didReceive message: WKScriptMessage
  ) {
    target?.userContentController(controller, didReceive: message)
  }
}

@MainActor
final class HybridController: UIViewController, WKNavigationDelegate, WKUIDelegate,
  WKScriptMessageHandler, UNUserNotificationCenterDelegate
{
  private(set) var web: WKWebView!
  private var server: LocalWebServer?
  private var curl: UIPageViewController?
  private var bound: BoundBookController?
  private var preparingBound = false
  private var boundGeneration = 0
  private var cover: UIImageView?
  private var sound: AVAudioPlayer?
  private var haptics = false
  private var sounds = false
  private var turnStart = Date()
  override func viewDidLoad() {
    super.viewDidLoad()
    NativeStartupDiagnostics.mark("hybrid-controller-view-loaded")
    NotificationCenter.default.addObserver(
      self, selector: #selector(appDidBecomeActive),
      name: UIApplication.didBecomeActiveNotification,
      object: nil)
    NotificationCenter.default.addObserver(
      self, selector: #selector(pendingShortcutAvailable),
      name: .fylogiaShortcutAvailable, object: nil)
    UNUserNotificationCenter.current().delegate = self
    view.backgroundColor = UIColor(red: 10 / 255, green: 16 / 255, blue: 24 / 255, alpha: 1)
    let config = WKWebViewConfiguration()
    config.userContentController.add(WeakScriptHandler(self), name: "fylogia")
    let testing = ProcessInfo.processInfo.arguments.contains("--parity-testing")
    if ProcessInfo.processInfo.arguments.contains("--startup-diagnostics") {
      let source = #"""
        (function(){
          const events = [];
          const update = () => {
            let probe = document.getElementById("fylogia-startup-diagnostics");
            if (!probe && document.body) {
              probe = document.createElement("div");
              probe.id = "fylogia-startup-diagnostics";
              probe.setAttribute("role", "status");
              probe.setAttribute("aria-label", "Fylogia startup diagnostics");
              probe.style.cssText = "position:fixed;left:0;bottom:0;width:2px;height:2px;overflow:hidden;opacity:.02;z-index:2147483647";
              document.body.appendChild(probe);
            }
            if (probe) {
              probe.textContent = "Startup diagnostics: " + events.map(event => {
                const parts = [event.stage, event.elapsedMs + "ms"];
                if (Number.isFinite(event.operationElapsedMs)) parts.push("op=" + event.operationElapsedMs + "ms");
                if (event.failureStage) parts.push("failure=" + event.failureStage);
                if (event.errorName) parts.push("error=" + event.errorName);
                return parts.join(" ");
              }).join(" | ");
            } else {
              document.addEventListener("DOMContentLoaded", update, { once: true });
            }
          };
          window.__fylogiaRecordStartupDiagnosticForTests = event => {
            if (!event || typeof event.stage !== "string" || !Number.isFinite(event.elapsedMs)) return;
            const safeEvent = {
              stage: event.stage,
              elapsedMs: Math.round(event.elapsedMs),
              ...(Number.isFinite(event.operationElapsedMs) ? { operationElapsedMs: Math.round(event.operationElapsedMs) } : {}),
              ...(typeof event.failureStage === "string" ? { failureStage: event.failureStage } : {}),
              ...(typeof event.errorName === "string" ? { errorName: event.errorName } : {}),
            };
            const existing = events.findIndex(item => item.stage === safeEvent.stage);
            if (existing < 0) events.push(safeEvent);
            else if (safeEvent.failureStage || safeEvent.errorName) events[existing] = safeEvent;
            if (events.length > 32) events.shift();
            update();
          };
        })();
        """#
      config.userContentController.addUserScript(
        WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }
    if testing {
      // Isolated test store; never resets or replaces the reviewer's real library.
      config.websiteDataStore = .nonPersistent()
      if let url = Bundle.main.url(forResource: "parity-fixture", withExtension: "js"),
        let script = try? String(contentsOf: url, encoding: .utf8)
      {
        config.userContentController.addUserScript(
          WKUserScript(source: script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
      }
    }
    registerForTraitChanges([UITraitPreferredContentSizeCategory.self]) {
      (controller: HybridController, _: UITraitCollection) in controller.updateTextScale()
    }
    NativeStartupDiagnostics.mark("webview-creation-start")
    web = WKWebView(frame: .zero, configuration: config)
    NativeStartupDiagnostics.mark("webview-created")
    web.navigationDelegate = self
    web.uiDelegate = self
    web.isOpaque = false
    web.backgroundColor = view.backgroundColor
    web.scrollView.backgroundColor = view.backgroundColor
    web.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(web)
    NSLayoutConstraint.activate([
      web.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
      web.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
      web.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      web.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
    ])
    guard let root = Bundle.main.url(forResource: "WebAssets", withExtension: nil) else {
      NativeStartupDiagnostics.mark("web-assets-missing")
      fail("Bundled golden interface is missing. Run build-web.mjs before building the app.")
      return
    }
    let server = LocalWebServer(
      root: root, offline: ProcessInfo.processInfo.arguments.contains("--offline-test"))
    self.server = server
    do {
      NativeStartupDiagnostics.mark("local-server-start")
      try server.start { [weak self] result in
        DispatchQueue.main.async {
          guard let self else { return }
          switch result {
          case .success:
            NativeStartupDiagnostics.mark("local-server-ready")
            self.web.load(URLRequest(url: URL(string: "http://127.0.0.1:\(LocalWebServer.port)/")!))
          case .failure(let error):
            NativeStartupDiagnostics.mark("local-server-failed")
            self.fail("Local interface could not start: \(error.localizedDescription)")
          }
        }
      }
    } catch { fail(error.localizedDescription) }
  }
  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    deliverPendingShortcut()
  }
  @objc private func appDidBecomeActive() {
    deliverPendingShortcut()
  }
  @objc private func pendingShortcutAvailable() {
    deliverPendingShortcut()
  }
  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    NativeStartupDiagnostics.mark("web-navigation-finished")
    updateTextScale()
    deliverPendingShortcut()
  }
  func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
    // WebKit exposes navigation lifecycle, not a separate content-process launch callback.
    NativeStartupDiagnostics.mark("web-content-startup-requested")
  }
  func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
    NativeStartupDiagnostics.mark("web-content-document-committed")
  }
  func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
    NativeStartupDiagnostics.mark("web-content-process-terminated")
  }
  func webView(
    _ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!,
    withError error: Error
  ) {
    NativeStartupDiagnostics.mark("web-navigation-provisional-failed")
  }
  func webView(
    _ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error
  ) {
    NativeStartupDiagnostics.mark("web-navigation-failed")
  }
  private func deliverPendingShortcut() {
    guard let web, web.url != nil, !web.isLoading else { return }
    guard let route = FylogiaShortcutHandoff.consume() else { return }
    guard let encoded = try? JSONEncoder().encode(route),
      let json = String(data: encoded, encoding: .utf8)
    else { return }
    web.evaluateJavaScript("window.__fylogiaDeliverNativeShortcut?.(\(json))")
  }
  func userNotificationCenter(
    _ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    if let route = response.notification.request.content.userInfo["fylogiaRoute"] as? String {
      FylogiaShortcutHandoff.queue(route: route)
      NotificationCenter.default.post(name: .fylogiaShortcutAvailable, object: nil)
    }
    completionHandler()
  }
  func userNotificationCenter(
    _ center: UNUserNotificationCenter, willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([.banner, .sound])
  }
  private func updateTextScale() {
    let scale = max(1, UIFontMetrics.default.scaledValue(for: 17) / 17)
    web?.evaluateJavaScript(
      "document.documentElement.dataset.nativeTextScale='\(scale)'; window.dispatchEvent(new Event('resize'));"
    )
  }
  private func fail(_ message: String) {
    let label = UILabel()
    label.text = message
    label.numberOfLines = 0
    label.textColor = .white
    label.frame = view.bounds.insetBy(dx: 24, dy: 100)
    label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    view.addSubview(label)
  }
  func webView(
    _ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
    decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
  ) {
    guard let url = action.request.url else {
      decisionHandler(.cancel)
      return
    }
    if url.host == "127.0.0.1", url.port == Int(LocalWebServer.port), url.scheme == "http" {
      decisionHandler(.allow)
      return
    }
    if ["blob", "about"].contains(url.scheme ?? "") {
      decisionHandler(.allow)
      return
    }
    decisionHandler(.cancel)
    if action.navigationType == .linkActivated, ["https", "http"].contains(url.scheme ?? "") {
      present(SFSafariViewController(url: url), animated: true)
    }
  }
  func webView(
    _ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
    for action: WKNavigationAction, windowFeatures: WKWindowFeatures
  ) -> WKWebView? {
    if let url = action.request.url, ["https", "http"].contains(url.scheme ?? "") {
      present(SFSafariViewController(url: url), animated: true)
    }
    return nil
  }
  func userContentController(
    _ userContentController: WKUserContentController, didReceive message: WKScriptMessage
  ) {
    guard message.frameInfo.isMainFrame, message.frameInfo.securityOrigin.host == "127.0.0.1",
      message.frameInfo.securityOrigin.port == Int(LocalWebServer.port),
      let body = message.body as? [String: Any]
    else { return }
    if body["action"] as? String == "startupStage" {
      NativeStartupDiagnostics.recordJavaScript(body["event"] ?? [:])
      return
    }
    if body["action"] as? String == "preferences" {
      haptics = body["haptics"] as? Bool ?? false
      sounds = body["sound"] as? Bool ?? false
      return
    }
    if body["action"] as? String == "notificationPreferences" {
      let enabled = body["enabled"] as? Bool ?? false
      let time = body["time"] as? String ?? "08:00"
      let topics = body["topics"] as? [String] ?? []
      let headlines = body["headlines"] as? [String] ?? []
      FylogiaNotificationScheduler.shared.updateDailyBriefing(
        enabled: enabled, time: time, topics: topics, headlines: headlines
      ) { [weak self] accepted in
        guard let self else { return }
        self.web.evaluateJavaScript(
          "window.__fylogiaNotificationAuthorization?.(\(accepted ? "true" : "false"))")
      }
      return
    }
    if body["action"] as? String == "breakingPreferences" {
      let preferences = FylogiaBreakingPreferences(
        optedIn: body["optedIn"] as? Bool ?? false,
        topics: Set(body["topics"] as? [String] ?? []))
      FylogiaBreakingPreferenceStore().save(preferences)
      guard preferences.optedIn else { return }
      UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) {
        [weak self] granted, _ in
        Task { @MainActor in
          guard let self else { return }
          if !granted {
            FylogiaBreakingPreferenceStore().save(
              FylogiaBreakingPreferences(optedIn: false, topics: []))
            self.web.evaluateJavaScript("window.__fylogiaBreakingAuthorization?.(false)")
          } else {
            self.web.evaluateJavaScript("window.__fylogiaSendBreakingCandidates?.()")
          }
        }
      }
      return
    }
    if body["action"] as? String == "breakingCandidates" {
      let preferences = FylogiaBreakingPreferenceStore().load()
      guard preferences.optedIn, let raw = body["candidates"] as? [[String: Any]] else { return }
      let formatter = ISO8601DateFormatter()
      let candidates = raw.compactMap { item -> FylogiaBreakingCandidate? in
        guard let storyID = item["storyID"] as? String, !storyID.isEmpty,
          let title = item["title"] as? String, title.count <= 500,
          let source = item["source"] as? String, !source.isEmpty,
          let urlText = item["url"] as? String, let url = URL(string: urlText),
          url.scheme?.lowercased() == "https",
          let published = item["published"] as? String,
          let publishedAt = formatter.date(from: published)
        else { return nil }
        let topics = Set(item["topics"] as? [String] ?? [])
          .intersection(FylogiaBreakingPreferences.supportedTopics)
        return FylogiaBreakingCandidate(
          storyID: storyID, title: title, source: source, url: url,
          topics: topics, publishedAt: publishedAt, isOfficialSource: false)
      }
      Task { @MainActor in
        _ = await FylogiaBreakingAlertScheduler().schedule(candidates, preferences: preferences)
      }
      return
    }
    if let action = body["action"] as? String, action.hasPrefix("bound") {
      if action == "boundHide" {
        // Keep a prepared native page snapshot out of VoiceOver/UI automation
        // as soon as a web overlay opens, even if UIKit is finishing a curl.
        bound?.view.accessibilityElementsHidden = true
        if bound?.turning != true { removeBound() }
        return
      }
      if action == "boundTurn" {
        bound?.turn(forward: body["forward"] as? Bool ?? true)
        return
      }
      if action == "boundPrepare", let values = body["rect"] as? [String: Double],
        let x = values["x"], let y = values["y"], let width = values["width"],
        let height = values["height"],
        [x, y, width, height].allSatisfy({ $0.isFinite })
      {
        let rect = CGRect(x: x, y: y, width: width, height: height).intersection(web.bounds)
        if rect.width > 100 && rect.height > 100 {
          prepareBound(
            rect: rect, spread: body["spread"] as? Int == 2 ? 2 : 1,
            previous: body["previous"] as? Bool ?? false, next: body["next"] as? Bool ?? false)
        }
      }
      return
    }
    guard body["action"] as? String == "curl", curl == nil,
      let values = body["rect"] as? [String: Double], let x = values["x"], let y = values["y"],
      let width = values["width"], let height = values["height"],
      [x, y, width, height].allSatisfy({ $0.isFinite })
    else { return }
    let rect = CGRect(x: x, y: y, width: width, height: height).intersection(web.bounds)
    guard rect.width > 100, rect.height > 100 else { return }
    animate(
      rect: rect, forward: body["forward"] as? Bool ?? true,
      spread: body["spread"] as? Int == 2 ? 2 : 1)
  }
  override func didReceiveMemoryWarning() {
    super.didReceiveMemoryWarning()
    // Discard only regenerable snapshots, never the web library or offline store.
    removeBound()
    web?.evaluateJavaScript("window.__fylogiaSuspendBound?.()")
  }
  private func removeBound() {
    boundGeneration += 1
    preparingBound = false
    if let bound {
      bound.willMove(toParent: nil)
      bound.view.removeFromSuperview()
      bound.removeFromParent()
    }
    bound = nil
    cover?.removeFromSuperview()
    cover = nil
    web?.evaluateJavaScript("window.__fylogiaClearBoundPreview?.()")
  }
  private func prepareBound(rect: CGRect, spread: Int, previous: Bool, next: Bool) {
    guard !preparingBound, bound?.turning != true else { return }
    removeBound()
    preparingBound = true
    let generation = boundGeneration
    let start = Date()
    snapshot(rect) { [weak self] current in
      guard let self, self.boundGeneration == generation, let current else { return }
      let cover = UIImageView(image: current)
      cover.frame = self.web.convert(rect, to: self.view)
      self.view.addSubview(cover)
      self.cover = cover
      self.neighbor(rect: rect, forward: false, enabled: previous) { [weak self] previousImage in
        guard let self, self.boundGeneration == generation else { return }
        self.neighbor(rect: rect, forward: true, enabled: next) { [weak self] nextImage in
          guard let self, self.boundGeneration == generation else { return }
          self.web.evaluateJavaScript("window.__fylogiaClearBoundPreview?.()") { [weak self] _, _ in
            guard let self, self.boundGeneration == generation else { return }
            let bound = BoundBookController(
              current: current, previous: previousImage, next: nextImage, spread: spread,
              completed: { [weak self] forward in
                guard let self else { return }
                self.web.evaluateJavaScript(
                  "window.__fylogiaCommitBound(\(forward ? "true":"false"))")
                if self.haptics { UISelectionFeedbackGenerator().selectionChanged() }
                if self.sounds,
                  let url = Bundle.main.url(forResource: "page-turn", withExtension: "wav")
                {
                  self.sound = try? AVAudioPlayer(contentsOf: url)
                  self.sound?.volume = 0.12
                  self.sound?.play()
                }
              },
              cancelled: { [weak self] in
                self?.web.evaluateJavaScript("window.__fylogiaCancelBound?.()")
              })
            self.bound = bound
            self.addChild(bound)
            bound.view.frame = cover.frame
            self.view.addSubview(bound.view)
            bound.didMove(toParent: self)
            cover.removeFromSuperview()
            self.cover = nil
            self.preparingBound = false
            self.web.evaluateJavaScript("window.__fylogiaBoundReady?.()")
            print("FYLOGIA bound preload milliseconds=\(Int(Date().timeIntervalSince(start)*1000))")
          }
        }
      }
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
      guard let self, self.boundGeneration == generation, self.preparingBound else { return }
      self.removeBound()
      self.web.evaluateJavaScript("window.__fylogiaCancelBound?.()")
    }
  }
  private func neighbor(
    rect: CGRect, forward: Bool, enabled: Bool, completion: @escaping (UIImage?) -> Void
  ) {
    guard enabled else {
      completion(nil)
      return
    }
    web.callAsyncJavaScript(
      "return await window.__fylogiaPrepareBound(forward);", arguments: ["forward": forward],
      in: nil, in: .page
    ) { [weak self] result in
      guard let self else { return }
      guard case .success(let value) = result, value as? Bool == true else {
        completion(nil)
        return
      }
      self.snapshot(rect) { [weak self] image in
        self?.web.evaluateJavaScript("window.__fylogiaClearBoundPreview?.()") { _, _ in
          completion(image)
        }
      }
    }
  }
  private func snapshot(_ rect: CGRect, completion: @escaping (UIImage?) -> Void) {
    let config = WKSnapshotConfiguration()
    config.rect = rect
    config.snapshotWidth = NSNumber(value: Double(rect.width))
    config.afterScreenUpdates = true
    // JS completion precedes WebKit painting. Wait for the cleared/next sheet
    // to actually render, otherwise the previous preview can become page one.
    web.callAsyncJavaScript(
      "await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));",
      arguments: [:], in: nil, in: .page
    ) { [weak self] _ in
      self?.web.takeSnapshot(with: config) { image, _ in completion(image) }
    }
  }
  private func animate(rect: CGRect, forward: Bool, spread: Int) {
    turnStart = Date()
    snapshot(rect) { [weak self] first in
      guard let self, let first else {
        self?.finish()
        return
      }
      let cover = UIImageView(image: first)
      cover.frame = self.web.convert(rect, to: self.view)
      self.view.addSubview(cover)
      self.cover = cover
      self.web.callAsyncJavaScript(
        "return await window.__fylogiaApplyNativeTurn();", arguments: [:], in: nil, in: .page
      ) { [weak self] _ in
        guard let self else { return }
        self.snapshot(rect) { [weak self] next in
          guard let self, let next else {
            self?.finish()
            return
          }
          let book = UIPageViewController(
            transitionStyle: .pageCurl, navigationOrientation: .horizontal,
            options: [
              .spineLocation: NSNumber(
                value: spread == 2
                  ? UIPageViewController.SpineLocation.mid.rawValue
                  : UIPageViewController.SpineLocation.min.rawValue)
            ])
          book.isDoubleSided = spread == 2
          self.curl = book
          self.addChild(book)
          book.view.frame = cover.frame
          self.view.addSubview(book.view)
          book.didMove(toParent: self)
          book.view.accessibilityIdentifier = "nativeGoldenCurl"
          book.setViewControllers(
            self.sheets(first, spread: spread), direction: .forward, animated: false)
          book.setViewControllers(
            self.sheets(next, spread: spread), direction: forward ? .forward : .reverse,
            animated: !UIAccessibility.isReduceMotionEnabled
          ) { [weak self] _ in self?.finish() }
          DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self, weak book] in
            if self?.curl === book { self?.finish() }
          }
        }
      }
    }
  }
  private func sheets(_ image: UIImage, spread: Int) -> [UIViewController] {
    (0..<spread).map { index in
      let controller = UIViewController()
      controller.view.backgroundColor = UIColor(red: 0.97, green: 0.95, blue: 0.89, alpha: 1)
      let pixels = image.cgImage!
      let width = pixels.width / spread
      let cropped = pixels.cropping(
        to: CGRect(x: index * width, y: 0, width: width, height: pixels.height))!
      let sheet = UIImageView(
        image: UIImage(cgImage: cropped, scale: image.scale, orientation: .up))
      sheet.contentMode = .scaleToFill
      sheet.frame = controller.view.bounds
      sheet.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      controller.view.addSubview(sheet)
      return controller
    }
  }
  private func finish() {
    if let curl {
      curl.willMove(toParent: nil)
      curl.view.removeFromSuperview()
      curl.removeFromParent()
    }
    curl = nil
    cover?.removeFromSuperview()
    cover = nil
    web?.evaluateJavaScript("window.__fylogiaFinishNativeTurn?.()")
    if haptics { UISelectionFeedbackGenerator().selectionChanged() }
    if sounds, let url = Bundle.main.url(forResource: "page-turn", withExtension: "wav") {
      try? AVAudioSession.sharedInstance().setCategory(.ambient)
      sound = try? AVAudioPlayer(contentsOf: url)
      sound?.volume = 0.12
      sound?.play()
    }
    print(
      "FYLOGIA hybrid native curl milliseconds=\(Int(Date().timeIntervalSince(turnStart)*1000))")
  }
  override func viewWillTransition(
    to size: CGSize, with coordinator: UIViewControllerTransitionCoordinator
  ) {
    if cover != nil { finish() }
    removeBound()
    super.viewWillTransition(to: size, with: coordinator)
  }
}
