# Fylogia Xcode Cloud and TestFlight readiness

Updated 7 November 2026. This is a repository-side readiness record. The Zain Abdulahad Apple Developer team (`WS32P56Z42`), explicit app/widget IDs, and App Store Connect app record are verified. Automatic signing was verified by a local App Store Connect export for both app and widget. Xcode Cloud source access is connected and a manual-only workflow has been saved. The first run found missing bundled resources at app startup. The one authorized follow-up run failed in the new asset-check build phase before tests began; Cloud validation remains blocked.

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
- Unit tests: **16/17 PASS**. The failing assertion was a test-fixture mismatch: the test deliberately passed a valid `indexeddb-read-failed` stage with a disallowed private error name, then incorrectly expected the whole event to be rejected. The parser correctly kept the allowlisted stage and stripped the private `errorName`. No real IndexedDB runtime failure was recorded by this assertion.
- UI tests: **0/3 PASS**. All three tests stopped at the shared feed-readiness gate after 60 seconds. The captured screenshot and accessibility hierarchy show Fylogia's native recovery message, “Bundled golden interface is missing. Run build-web.mjs before building the app.” The app log recorded `web-assets-missing` 414 ms after startup, before local server, IndexedDB, library, or feed readiness. WebKit's content process did launch; the feed was never loaded. The test runner and accessibility query were operating; the feed was absent because the generated `WebAssets` folder was not present in the app bundle. This is an Xcode resource packaging defect, not a timeout or selector mismatch.
- Local comparison: previous iPhone 17 and Fresh iPad Pro 11 focused UI runs reached the feed with the same startup/readiness checks. The Cloud run differs at the app-bundle boundary: its build log had no `WebAssets` resource-copy operation, and its failure attachments show the native missing-assets recovery screen. No IndexedDB read or feed-preparation stage was reached in Cloud.
- Cloud run elapsed time: **6 minutes** (9-second queue reported). The Xcode report showed no compute-credit, memory, or detailed resource-consumption breakdown, so those values remain unverified.
- The `indexeddb-read-failed` event is only the unit test's input fixture; it was not an unexpected app diagnostic. The parser test now asserts that the valid event survives while private error text is removed.
- The project now has a bounded `Ensure Bundled WebAssets` build phase after resource copying. It verifies the generated source entry point, copies the WebAssets folder into the app bundle when Xcode's synchronized-folder resource pass has not done so, and fails the build with a direct message if the post-clone assets are absent. A unit test guards `Bundle.main/WebAssets/index.html`.
- Local validation: `ci_scripts/ci_post_clone.sh` passed and regenerated ignored Native WebAssets; serial `build-for-testing` succeeded and the resulting app bundle contains `WebAssets/index.html`; focused unit tests **2/2 PASS** (startup event/privacy validation and bundled interface presence); isolated WebKit startup regressions **4/4 PASS** (success 714 ms, delayed IndexedDB transaction 5,414 ms, failed read/retry, failed write fallback). Native UI tests were not rerun locally because the internal disk headroom reached its 20 GiB safety floor after simulator startup and focused unit tests.
- Cloud uploaded its logs, crash-log bundle and `.xcresult` artifact. One follow-up manual Cloud run is authorized after the validated correction is pushed; no repeat run will be started.

## Follow-up Cloud verification (7 November 2026)

- Commit `75ee796` was pushed to `native-ios-foundation` before starting the one authorized follow-up run (Build 2, Xcode 27.2 build 27B52).
- The run queued for 11 seconds and ran for 55 seconds before failing in `Ensure Bundled WebAssets`; `xcodebuild build` exited 65. The UI reports one error and six warnings. The build action did not complete, so the test action never started: Cloud unit tests and UI tests are **NOT RUN** in this verification.
- Confirmed failure stage: the newly added shell build phase failed. Local serial build-for-testing proves the phase works when the post-clone script has generated `native/ios/Fylogia/WebAssets/index.html`. The Cloud UI did not expose the script's stdout/stderr in the available summary, so whether post-clone generation was skipped or the Cloud build phase resolved a different source path is **not established**. Do not change the code speculatively.
- This is not evidence of an IndexedDB, WebKit feed readiness, or XCTest accessibility failure: no Cloud test runner was launched in Build 2. The prior Build 1 results remain as documented above.
- No second verification was started. The next diagnostic should be a read-only review of Build 2's complete Cloud build log and post-clone action log; only after identifying why the generated source is absent should another run be considered.

## Remaining setup and first-run gates

1. Diagnose why Cloud's `Ensure Bundled WebAssets` phase could not find its generated input, using the full Build 2 build and post-clone logs. The single authorized verification is complete; no further Cloud run is authorized by this task.
2. Check Xcode Cloud account usage separately; Build 2's report showed wall-clock duration only, not compute credits or resource totals. No additional compute was purchased.
3. For TestFlight, confirm final version/build metadata, privacy disclosures, content and image rights, app metadata, and internal tester group before a separately authorized upload. No upload or tester invitation is authorized or performed in this task.

## Readiness decision

**Repository and distribution signing: READY for a later owner-authorized upload.** Clean-checkout bootstrap, generated WebAssets, app/widget builds, explicit IDs, App Store Connect record, shared scheme, focused plan, exported IPA signing, and Xcode Cloud workflow configuration are verified. **Xcode Cloud: CONFIGURED; first run completed with a successful build and failing tests.** Investigate the recorded startup failures before treating Cloud testing as a release gate. Detailed resource consumption is not exposed in the reviewed report. **TestFlight: NOT UPLOADED.** No services were purchased or app distribution activated.
