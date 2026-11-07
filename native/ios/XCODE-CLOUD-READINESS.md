# Fylogia Xcode Cloud and TestFlight readiness

Updated 7 November 2026. This is a repository-side readiness record. The Zain Abdulahad Apple Developer team (`WS32P56Z42`), explicit app/widget IDs, and App Store Connect app record are verified. Automatic signing was verified by a local App Store Connect export for both app and widget. Xcode Cloud source access is connected and a manual-only workflow has been saved; the first Cloud run is pending.

## Verified repository configuration

- Active checkout is `native-ios-foundation`. The shared `Fylogia` scheme builds the `Fylogia` app and embeds its `FylogiaWidgetExtension`; its Test action includes `FylogiaTests` and `FylogiaUITests`. `xcodebuild -list` recognizes all four targets. Xcode 27.2 (27B52) recognizes the shared scheme and the `Fylogia-Focused-Cloud` plan.
- Bundle IDs: app `com.fylogia.native`; widget `com.fylogia.native.widget`; unit test `com.fylogia.native.FylogiaTests`; UI test `com.fylogia.native.FylogiaUITests`. App/widget target iOS 17.0, automatic signing, Team ID `WS32P56Z42`, and no entitlements file. The team is assigned only to app/widget Debug and Release configurations; tests have no team override. The project has no Swift Package, CocoaPods, or Carthage dependencies.
- Native WebAssets are generated and ignored, so they are absent from a plain Git checkout. Root `ci_scripts/ci_post_clone.sh` is the Xcode Cloud bootstrap: it requires the immutable `fylogia-web-golden-v1` Git tag, archives that source into the Native checkout, runs locked `npm ci` with Node 24, and calls `native/ios/scripts/build-web.mjs`. It writes only the Native WebAssets; it does not modify the separate Web checkout or production.
- **PASS current clean-checkout build (4bea937):** a detached clean Git worktree ran the post-clone script and generated `native/ios/Fylogia/WebAssets/index.html`; the `Fylogia` app and embedded widget then built for generic iOS Simulator with Xcode 27.2, code signing disabled, one build job, and DerivedData on Developments SSD. No simulator boot, XCTest or signing operation occurred. Build warnings include an existing Swift 6 actor-isolation warning in `HybridController.swift`; the build succeeded. Earlier clean-clone `build-for-testing` evidence is recorded in the implementation checklist; this current check was deliberately build-only.
- App Store Connect contains Fylogia (iOS, English (U.S.), SKU `FYLOGIA-IOS-001`, Apple ID `6831956558`) with bundle ID `com.fylogia.native`; Developer portal identifiers `com.fylogia.native` and `com.fylogia.native.widget` are explicit and under Team `WS32P56Z42`.
- A Release archive succeeded but used the local Apple Development identity. The separate local `app-store-connect` export succeeded; `DistributionSummary.plist` confirms Cloud Managed Apple Distribution signing, Team `WS32P56Z42`, explicit store profiles for app and widget, and `get-task-allow=false` for both. This is distribution-signing verification only; the IPA was not uploaded.
- The iPhone Duo was not connected or installed to. No TestFlight upload or distribution has been performed.
- Xcode Cloud has the workflow `Fylogia Focused Simulator Tests`. Its only start condition is Manual Start restricted to `native-ios-foundation`; Pull Request and Tag starts are off, and no Branch Changes trigger is configured. The workflow has Build for Any iOS Simulator and Test using `Fylogia-Focused-Cloud` on one iPhone 17 / iOS 27.2 destination. There are no post-actions, archive action, or TestFlight delivery action.
- Xcode generated `native/ios/Fylogia.xcodeproj/xcshareddata/xcodecloud/manifest.json` to map the Cloud workflow to the app target. The file is configuration metadata, not a credential. It must be committed to the development branch for the Cloud checkout to resolve the product. The first run has not started, so Cloud build, test, and resource usage are not yet verified.

## Configured focused workflow

The saved workflow uses the existing shared scheme and focused test plan:

| Setting | Recommendation |
| --- | --- |
| Product / scheme | Fylogia app / shared `Fylogia` scheme |
| Source branch | `native-ios-foundation`; select it when manually starting a run |
| Start condition | Manual Start only; restricted to `native-ios-foundation`; no push, pull-request, schedule, archive or distribution trigger |
| Actions | Build for Any iOS Simulator, then Test using `Fylogia-Focused-Cloud` |
| Test scope | All `FylogiaTests` plus three UI cases: landscape horizontal spread without curl, article/rotation continuity, and essential navigation/Settings |
| Destination | One iPhone simulator supported by the authenticated Cloud environment; owner must choose from its current destination list |
| Cost controls | One destination, no matrix, no archive/TestFlight post-action, and parallel test execution off if exposed by the workflow settings |

This plan excludes both inactive curl experiments. Manual-only triggering prevents routine Web `main` pushes and scheduled news-data refreshes from consuming Cloud runs. The Cloud workflow is configured in Xcode/App Store Connect, not in GitHub Actions; the existing GitHub workflow is separate and triggers its CI only for Web `main` pushes/PRs or manual dispatch, with its scheduled job limited to refreshing Web news data.

The test plan is committed at `native/ios/Fylogia-Focused-Cloud.xctestplan` and referenced as non-default by the shared scheme. Its JSON parses, `xcodebuild -showTestPlans` lists it, and prior local serial `build-for-testing` validated its test products. The Xcode Cloud clean-checkout run built successfully with the app, widget and generated WebKit assets.

## First Xcode Cloud run

- Commit: `e661c968c731839214d588640593fbc7195069e1` on `native-ios-foundation`.
- Xcode Cloud Build action: **PASS**, Xcode 27.2 (27B52), iOS Simulator destination. Xcode reported 7 build issues/warnings; the build action itself completed successfully.
- Unit tests: **16/17 PASS**. `testStartupDiagnosticsValidateMissingDelayedAndFailedStages` failed because the test observed an `indexeddb-read-failed` startup event (elapsed 4 ms) where it expected no event.
- UI tests: **0/3 PASS**. `testArticleModesAndNavigationSurviveRotation`, `testGoldenNavigationSettingsAndScreenshots`, and `testLandscapeFeedUsesHorizontalScrollingWithoutCurl` each timed out after the feed did not become accessible within 60 seconds. XCTest runner launch diagnostics were written successfully. This establishes Cloud UI failures, but the available report does not establish whether the feed issue is an app startup defect or a Cloud simulator/runtime condition.
- Cloud run elapsed time: **6 minutes** (9-second queue reported). The Xcode report showed no compute-credit, memory, or detailed resource-consumption breakdown, so those values remain unverified.
- Cloud uploaded its logs, crash-log bundle and `.xcresult` artifact. No second run was started.

## Remaining setup and first-run gates

1. Investigate the shared 60-second feed readiness timeout and the failing IndexedDB startup-diagnostics assertion before authorizing another Cloud run. Preserve the current result bundle as the baseline.
2. Check Xcode Cloud account usage separately; this run's report shows wall-clock duration only, not compute credits or resource totals. No additional compute was purchased.
3. For TestFlight, confirm final version/build metadata, privacy disclosures, content and image rights, app metadata, and internal tester group before a separately authorized upload. No upload or tester invitation is authorized or performed in this task.

## Readiness decision

**Repository and distribution signing: READY for a later owner-authorized upload.** Clean-checkout bootstrap, generated WebAssets, app/widget builds, explicit IDs, App Store Connect record, shared scheme, focused plan, exported IPA signing, and Xcode Cloud workflow configuration are verified. **Xcode Cloud: CONFIGURED; first run completed with a successful build and failing tests.** Investigate the recorded startup failures before treating Cloud testing as a release gate. Detailed resource consumption is not exposed in the reviewed report. **TestFlight: NOT UPLOADED.** No services were purchased or app distribution activated.
