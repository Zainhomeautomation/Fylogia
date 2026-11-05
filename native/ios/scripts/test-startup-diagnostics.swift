import Foundation

@main struct StartupDiagnosticsHostTest {
  static func main() {
    precondition(NativeStartupStageEvent(message: [:]) == nil, "missing stage must be ignored")
    precondition(
      NativeStartupStageEvent(message: ["stage": "unrecognized", "elapsedMs": 1]) == nil,
      "unknown stage must be ignored")

    let delayed = NativeStartupStageEvent(
      message: [
        "stage": "storage-transaction-timeout", "elapsedMs": 5_420,
        "operationElapsedMs": 5_000,
      ])
    precondition(delayed?.elapsedMilliseconds == 5_420, "total stage time must be retained")
    precondition(
      delayed?.operationElapsedMilliseconds == 5_000,
      "IndexedDB operation duration must be retained")

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
