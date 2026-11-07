# Fylogia Xcode Cloud and TestFlight readiness

Updated 7 November 2026. This is a repository-side readiness record. The Zain Abdulahad Apple Developer team (`WS32P56Z42`), explicit app/widget IDs, and App Store Connect app record are verified. Automatic signing was verified by a local App Store Connect export for both app and widget. The team Cloud page is accessible but still prompts to get started in Xcode; no Xcode Cloud workflow or Cloud build has been started.

## Verified repository configuration

- Active checkout is `native-ios-foundation`. The shared `Fylogia` scheme builds the `Fylogia` app and embeds its `FylogiaWidgetExtension`; its Test action includes `FylogiaTests` and `FylogiaUITests`. `xcodebuild -list` recognizes all four targets. Xcode 27.2 (27B52) recognizes the shared scheme and the `Fylogia-Focused-Cloud` plan.
- Bundle IDs: app `com.fylogia.native`; widget `com.fylogia.native.widget`; unit test `com.fylogia.native.FylogiaTests`; UI test `com.fylogia.native.FylogiaUITests`. App/widget target iOS 17.0, automatic signing, Team ID `WS32P56Z42`, and no entitlements file. The team is assigned only to app/widget Debug and Release configurations; tests have no team override. The project has no Swift Package, CocoaPods, or Carthage dependencies.
- Native WebAssets are generated and ignored, so they are absent from a plain Git checkout. Root `ci_scripts/ci_post_clone.sh` is the Xcode Cloud bootstrap: it requires the immutable `fylogia-web-golden-v1` Git tag, archives that source into the Native checkout, runs locked `npm ci` with Node 24, and calls `native/ios/scripts/build-web.mjs`. It writes only the Native WebAssets; it does not modify the separate Web checkout or production.
- **PASS current clean-checkout build (4bea937):** a detached clean Git worktree ran the post-clone script and generated `native/ios/Fylogia/WebAssets/index.html`; the `Fylogia` app and embedded widget then built for generic iOS Simulator with Xcode 27.2, code signing disabled, one build job, and DerivedData on Developments SSD. No simulator boot, XCTest or signing operation occurred. Build warnings include an existing Swift 6 actor-isolation warning in `HybridController.swift`; the build succeeded. Earlier clean-clone `build-for-testing` evidence is recorded in the implementation checklist; this current check was deliberately build-only.
- App Store Connect contains Fylogia (iOS, English (U.S.), SKU `FYLOGIA-IOS-001`, Apple ID `6831956558`) with bundle ID `com.fylogia.native`; Developer portal identifiers `com.fylogia.native` and `com.fylogia.native.widget` are explicit and under Team `WS32P56Z42`.
- A Release archive succeeded but used the local Apple Development identity. The separate local `app-store-connect` export succeeded; `DistributionSummary.plist` confirms Cloud Managed Apple Distribution signing, Team `WS32P56Z42`, explicit store profiles for app and widget, and `get-task-allow=false` for both. This is distribution-signing verification only; the IPA was not uploaded.
- The App Store Connect Xcode Cloud page is available but remains at its initial “Get started in Xcode” state. Account-specific workflow setup has not been completed. The iPhone Duo was not connected or installed to.

## One economical workflow to configure later

Configure a single workflow in Xcode Cloud after owner account setup:

| Setting | Recommendation |
| --- | --- |
| Product / scheme | Fylogia app / shared `Fylogia` scheme |
| Source branch | `native-ios-foundation`; select it when manually starting a run |
| Start condition | Manual only; no push, pull-request, schedule, archive or distribution trigger |
| Action | Test, using `Fylogia-Focused-Cloud` |
| Test scope | All `FylogiaTests` plus three UI cases: landscape horizontal spread without curl, article/rotation continuity, and essential navigation/Settings |
| Destination | One iPhone simulator supported by the authenticated Cloud environment; owner must choose from its current destination list |
| Cost controls | One destination, no matrix, no archive/TestFlight post-action, and parallel test execution off if exposed by the workflow settings |

This plan excludes both inactive curl experiments. Manual-only triggering prevents routine Web `main` pushes and scheduled news-data refreshes from consuming Cloud runs. The Cloud workflow is configured in Xcode/App Store Connect, not in GitHub Actions; the existing GitHub workflow is separate and triggers its CI only for Web `main` pushes/PRs or manual dispatch, with its scheduled job limited to refreshing Web news data.

The test plan is committed at `native/ios/Fylogia-Focused-Cloud.xctestplan` and referenced as non-default by the shared scheme. Its JSON parses, `xcodebuild -showTestPlans` lists it, and prior local serial `build-for-testing` validated its test products. The current clean-checkout check also verifies the app/widget build and generated WebAssets, but did not execute tests.

## Exact owner actions and gates

1. In Xcode, open Product > Xcode Cloud > Create Workflow for the shared `Fylogia` scheme. Confirm Xcode presents the expected Team `WS32P56Z42`, repository, branch `native-ios-foundation`, and available Cloud Xcode/simulator destinations before saving. The live team page currently shows the initial setup prompt, so eligibility through workflow creation has not yet been fully proven.
2. Configure one manual-only Test action using `Fylogia-Focused-Cloud`, one offered iPhone simulator, and no archive/distribution post-action. Keep parallel testing disabled if the workflow UI exposes that setting. Do not enable push, PR, scheduled, website, or news-refresh triggers.
3. Start a Cloud run only after owner approval. No paid capacity was purchased. [Apple setup requirements](https://developer.apple.com/documentation/xcode/Setting-up-your-project-to-use-Xcode-Cloud) and [Cloud plans](https://developer.apple.com/xcode-cloud/get-started/)
4. For TestFlight, confirm final version/build metadata, privacy disclosures, content and image rights, app metadata, and internal tester group before a separately authorized upload. No upload or tester invitation is authorized or performed in this task.

## Readiness decision

**Repository and distribution signing: READY for a later owner-authorized upload.** Clean-checkout bootstrap, generated WebAssets, app/widget builds, explicit IDs, App Store Connect record, shared scheme, focused plan, and exported IPA signing are verified. **Xcode Cloud: NOT CONFIGURED.** Owner must complete workflow setup in Xcode and confirm the offered Cloud Xcode/simulator destination, then authorize any Cloud run. **TestFlight: NOT UPLOADED.** No services were purchased, Cloud jobs started, or app distribution activated.
