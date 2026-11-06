import Foundation
import OSLog

struct NativeStartupStageEvent: Equatable {
  let stage: String
  let elapsedMilliseconds: Int
  let operationElapsedMilliseconds: Int?
  let failureStage: String?
  let errorName: String?

  static let supportedStages: Set<String> = [
    "bootstrap-start", "local-library-start", "library-read-start",
    "library-read-complete", "library-read-failed", "indexeddb-open-start",
    "indexeddb-upgrade-start", "indexeddb-upgrade-complete", "indexeddb-open-ready",
    "indexeddb-open-failed", "indexeddb-open-blocked", "indexeddb-open-timeout",
    "indexeddb-read-start", "indexeddb-read-complete", "indexeddb-read-failed",
    "indexeddb-read-timeout", "indexeddb-write-start", "indexeddb-write-complete",
    "indexeddb-write-failed", "indexeddb-write-aborted", "indexeddb-write-timeout",
    "library-reconciliation-start", "library-reconciliation-complete",
    "library-write-batch-start", "library-write-batch-complete", "library-write-batch-failed",
    "storage-write-complete", "indexeddb-read-ready", "local-library-ready",
    "native-launch-preparation-start", "app-render-requested", "first-render-frame",
    "feed-preparation-start", "feed-preparation-complete", "feed-render-ready",
    "feed-readiness-timeout", "deadline-exceeded", "startup-failed",
    "recovery-screen-activated",
  ]

  init?(message: Any) {
    guard let values = message as? [String: Any],
      let stage = values["stage"] as? String,
      Self.supportedStages.contains(stage),
      let rawElapsed = values["elapsedMs"] as? NSNumber
    else { return nil }

    let elapsed = rawElapsed.doubleValue
    guard elapsed.isFinite, elapsed >= 0, elapsed <= 600_000 else { return nil }
    self.stage = stage
    elapsedMilliseconds = Int(elapsed.rounded())
    if let rawOperation = values["operationElapsedMs"] as? NSNumber,
      rawOperation.doubleValue.isFinite,
      rawOperation.doubleValue >= 0,
      rawOperation.doubleValue <= 600_000
    {
      operationElapsedMilliseconds = Int(rawOperation.doubleValue.rounded())
    } else {
      operationElapsedMilliseconds = nil
    }

    if let value = values["failureStage"] as? String,
      [
        "local-library", "indexeddb-open", "indexeddb-read", "library-reconciliation",
        "library-write-batch", "native-launch-preparation", "feed-preparation",
      ].contains(value)
    {
      failureStage = value
    } else {
      failureStage = nil
    }
    if let value = values["errorName"] as? String,
      [
        "UnknownError", "SecurityError", "AbortError", "InvalidStateError",
        "DataError", "QuotaExceededError", "NotFoundError", "TypeError", "TimeoutError", "Error",
        "LOCAL_LIBRARY_READ_FAILED",
      ].contains(value)
    {
      errorName = value
    } else {
      errorName = nil
    }
  }
}

enum NativeStartupDiagnostics {
  private static let logger = Logger(
    subsystem: Bundle.main.bundleIdentifier ?? "com.fylogia.native",
    category: "Startup")
  private static let processStart = ProcessInfo.processInfo.systemUptime

  static func mark(_ stage: String) {
    write(stage, elapsedMilliseconds: nativeElapsedMilliseconds)
  }

  static func recordJavaScript(_ message: Any) {
    guard let event = NativeStartupStageEvent(message: message) else {
      logger.notice("Ignored malformed startup-stage message")
      return
    }
    let failureStage = event.failureStage ?? "none"
    let errorName = event.errorName ?? "none"
    write(
      event.stage,
      elapsedMilliseconds: nativeElapsedMilliseconds,
      javascriptElapsedMilliseconds: event.elapsedMilliseconds,
      operationElapsedMilliseconds: event.operationElapsedMilliseconds,
      failureStage: failureStage,
      errorName: errorName)
  }

  private static var nativeElapsedMilliseconds: Int {
    max(0, Int(((ProcessInfo.processInfo.systemUptime - processStart) * 1000).rounded()))
  }

  private static func write(
    _ stage: String,
    elapsedMilliseconds: Int,
    javascriptElapsedMilliseconds: Int? = nil,
    operationElapsedMilliseconds: Int? = nil,
    failureStage: String = "none",
    errorName: String = "none"
  ) {
    if let javascriptElapsedMilliseconds {
      let operationElapsed = operationElapsedMilliseconds.map(String.init) ?? "na"
      logger.info(
        "stage=\(stage, privacy: .public) elapsed_ms=\(elapsedMilliseconds, privacy: .public) js_elapsed_ms=\(javascriptElapsedMilliseconds, privacy: .public) operation_elapsed_ms=\(operationElapsed, privacy: .public) failure_stage=\(failureStage, privacy: .public) error_name=\(errorName, privacy: .public)"
      )
    } else {
      logger.info(
        "stage=\(stage, privacy: .public) elapsed_ms=\(elapsedMilliseconds, privacy: .public)")
    }
  }
}
