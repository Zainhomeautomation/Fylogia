# Fylogia Xcode Cloud and TestFlight readiness

Updated 7 November 2026. This is a repository-side readiness record only. No Apple account was connected, no workflow or Cloud build was started, and no signing settings were changed.

## Verified repository configuration

- Active checkout is `native-ios-foundation`. The shared `Fylogia` scheme builds the `Fylogia` app and embeds its `FylogiaWidgetExtension`; its Test action includes `FylogiaTests` and `FylogiaUITests`. `xcodebuild -list` recognizes all four targets. Xcode 27.2 (27B52) recognizes the shared scheme and the `Fylogia-Focused-Cloud` plan.
- Bundle IDs: app `com.fylogia.native`; widget `com.fylogia.native.widget`; unit test `com.fylogia.native.FylogiaTests`; UI test `com.fylogia.native.FylogiaUITests`. App/widget target iOS 17.0, automatic signing, no `DEVELOPMENT_TEAM` value and no entitlements file. The project has no Swift Package, CocoaPods, or Carthage dependencies.
- Native WebAssets are generated and ignored, so they are absent from a plain Git checkout. Root `ci_scripts/ci_post_clone.sh` is the Xcode Cloud bootstrap: it requires the immutable `fylogia-web-golden-v1` Git tag, archives that source into the Native checkout, runs locked `npm ci` with Node 24, and calls `native/ios/scripts/build-web.mjs`. It writes only the Native WebAssets; it does not modify the separate Web checkout or production.
- **PASS current clean-checkout build (4bea937):** a detached clean Git worktree ran the post-clone script and generated `native/ios/Fylogia/WebAssets/index.html`; the `Fylogia` app and embedded widget then built for generic iOS Simulator with Xcode 27.2, code signing disabled, one build job, and DerivedData on Developments SSD. No simulator boot, XCTest or signing operation occurred. Build warnings include an existing Swift 6 actor-isolation warning in `HybridController.swift`; the build succeeded. Earlier clean-clone `build-for-testing` evidence is recorded in the implementation checklist; this current check was deliberately build-only.
- The account's Apple Team ID, App Store Connect app record, Xcode Cloud entitlement/available environment versions and supported simulator destinations are **not discoverable from this local project**. No team is configured in the project. Do not infer them from another app or signing identity.

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

1. Confirm or complete Apple Developer Program enrollment, then add the intended Apple Account to Xcode and App Store Connect with a role allowed to configure Xcode Cloud. Apple's current setup requirements specify Developer Program membership, Xcode 15 or later, an account in Xcode, and an App Store Connect app record or permission to create one. Account-specific eligibility is not verifiable here. [Apple setup requirements](https://developer.apple.com/documentation/xcode/Setting-up-your-project-to-use-Xcode-Cloud)
2. Identify and confirm the Fylogia Team ID. Confirm or create the App Store Connect app record for `com.fylogia.native` under that team. App-record creation requires Account Holder, Admin, App Manager, or a Developer with Create Apps permission. Register the widget identifier `com.fylogia.native.widget` under the same team if required during provisioning. Do not use another project's team.
3. In Xcode's Cloud workflow setup, verify the current supported Xcode versions and simulator destinations for that account; select a currently offered version and one supported iPhone destination. The App Store Connect API exposes Cloud Xcode versions and destinations, but its live account-specific list was not queried. [Apple API reference](https://developer.apple.com/documentation/appstoreconnectapi/get-v1-cixcodeversions)
4. Create the single manual-only workflow described above, verify the selected branch and plan before saving, then manually start one build only when the owner authorizes Cloud use. Review the Cloud usage page before adding any paid capacity. Apple currently documents 25 included compute hours per month for Developer Program membership. [Apple Xcode Cloud plans](https://developer.apple.com/xcode-cloud/get-started/)
5. For TestFlight, separately confirm the App Store Connect app record, bundle ID ownership, team-approved distribution signing/provisioning for the app and embedded widget, version/build metadata, export/privacy disclosures, and internal tester group. External testing also requires TestFlight review where Apple applies it. No archive, signing, upload, or tester invitation is prepared or authorized in this task.

## Readiness decision

**Repository/configuration: READY for owner-side workflow setup after account gates.** Clean-checkout bootstrap, generated WebAssets, app/widget build, shared scheme, test targets and focused plan are verified. **Cloud and TestFlight: NOT CONFIGURED / owner action required.** Exact team, App Store Connect record, current Cloud Xcode/destination availability, signing/provisioning and TestFlight metadata remain unverified. No services were purchased or activated.
