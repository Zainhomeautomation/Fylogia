import Foundation

@main struct StartupDiagnosticsHostTest {
  static func main() {
    precondition(NativeStartupStageEvent(message: [:]) == nil, "missing stage must be ignored")
    precondition(
      NativeStartupStageEvent(message: ["stage": "unrecognized", "elapsedMs": 1]) == nil,
      "unknown stage must be ignored")

    let delayed = NativeStartupStageEvent(
      message: [
        "stage": "indexeddb-write-timeout", "elapsedMs": 5_420,
        "operationElapsedMs": 5_000,
        "errorName": "TimeoutError",
      ])
    precondition(delayed?.elapsedMilliseconds == 5_420, "total stage time must be retained")
    precondition(
      delayed?.operationElapsedMilliseconds == 5_000,
      "IndexedDB operation duration must be retained")
    precondition(delayed?.errorName == "TimeoutError", "timeout kind must be retained")

    let failedRead = NativeStartupStageEvent(
      message: [
        "stage": "indexeddb-read-failed", "elapsedMs": 2_500,
        "operationElapsedMs": 2_500, "failureStage": "indexeddb-read",
        "errorName": "SecurityError",
      ])
    precondition(failedRead?.failureStage == "indexeddb-read", "read stage must be retained")
    precondition(failedRead?.errorName == "SecurityError", "safe error type must be retained")

    let failed = NativeStartupStageEvent(
      message: [
        "stage": "startup-failed", "elapsedMs": 12_005,
        "failureStage": "local-library", "errorName": "SecurityError",
        "privateMessage": "must never enter the event",
      ])
    precondition(failed?.failureStage == "local-library", "bounded failure stage must be kept")
    precondition(failed?.errorName == "SecurityError", "safe error type must be kept")
    precondition(failed?.elapsedMilliseconds == 12_005, "failure timing must be kept")
    precondition(
      NativeStartupStageEvent(message: ["stage": "startup-failed", "elapsedMs": -1]) == nil,
      "negative timing must be rejected")

    print("PASS native startup stage validation: missing, delayed, failed, privacy")
  }
}
