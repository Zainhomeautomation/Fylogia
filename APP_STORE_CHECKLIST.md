# Fylogia App Store preparation checklist

Status: **preparation ledger only; a local App Store signed export was verified, but nothing was uploaded or submitted**. Phase 15 follows implementation and quality validation. Final App Store submission requires explicit owner approval.

### Latest gate (7 November 2026)

- Build 10's five-destination accessibility run failed; commit `48c8a63` then enlarged the native “Warm cream paper” target to 44×44 and made the focused test scroll Settings controls into view. Build 11 completed on that commit and **failed**: the `Test - iOS` action reports 7 test failures and 8 warnings, with a 5-minute build duration and 16 minutes of Xcode Cloud usage. The five-device accessibility gate therefore remains **NO-GO**; the Build 11 summary did not provide a verified per-device pass matrix in this review. No retry was started.
- A separate **Fylogia Manual TestFlight Archive** Xcode Cloud workflow is now prepared on `native-ios-foundation`: manual start restricted to that branch, Archive action only, `TestFlight (Internal Testing Only)` deployment preparation, and no post-actions or automatic triggers. This creates a TestFlight-signable archive artifact only; it does not upload or distribute it. The passing Build + Test workflow remains unchanged.
- The existing app/widget App Store signed export remains at `/Volumes/Developments/Xcode/Archives/Fylogia-Registration-Export/Fylogia.ipa`. Its extracted app and widget signatures were reverified as Apple Distribution Team `WS32P56Z42`, IDs `com.fylogia.native` and `com.fylogia.native.widget`, version `0.1.0`, build `1`. This is a prior local export, not a Cloud archive.
- The live App Store Connect Fylogia record was reauthenticated in this review (Apple ID `6831956558`, SKU `FYLOGIA-IOS-001`); its TestFlight Builds page says “Submit a build to start testing,” so no build has been uploaded. Build number `1` remains configured for both targets and no uploaded build is listed. The next archive should use a unique, incremented build number if build `1` is uploaded first. No upload, distribution, or tester invitation occurred. Build 6's separate focused workflow remains unchanged at 21/21; the four iPhone Duo fold/display states remain **NOT TESTED**.

### TestFlight readiness audit (7 November 2026)

- **PASS registration:** Apple Developer team `WS32P56Z42` now has explicit App IDs `com.fylogia.native` (Fylogia) and `com.fylogia.native.widget` (Fylogia Widget). Both were registered without enabling extra capabilities.
- **PASS App Store Connect record:** Fylogia is present with platform iOS, primary language English (U.S.), bundle ID `com.fylogia.native`, SKU `FYLOGIA-IOS-001`, Apple ID `6831956558`, and status Prepare for Submission. No version was submitted.
- **PASS Release distribution signing:** the Release archive built successfully. The archive itself used the local Apple Development identity, so it was not treated as the distribution artifact. A local `app-store-connect` export then succeeded and Xcode's DistributionSummary verified Cloud Managed Apple Distribution signing for both app and embedded widget, Team ID `WS32P56Z42`, explicit store provisioning profiles, and `get-task-allow=false`. The exported IPA is `/Volumes/Developments/Xcode/Archives/Fylogia-Registration-Export/Fylogia.ipa`. This verification did not upload it.
- **Xcode Cloud:** source access is connected. The manual-only `Fylogia Focused Simulator Tests` workflow on `native-ios-foundation` retains the separate `Fylogia-Focused-Cloud` plan and its 21/21 passing baseline. `Fylogia Manual Device Validation` remains a separate manual UI-test workflow; Build 11 failed with 7 test failures and 8 warnings. The separate `Fylogia Manual TestFlight Archive` workflow is manual-only, branch-restricted, Archive-only, TestFlight Internal Testing-signable, and has no distribution post-action. See the Build 11 entry in `native/ios/IMPLEMENTATION-CHECKLIST.md`.
- No build was uploaded, no testers were invited, and no app was published. TestFlight processing, device installation, final metadata/privacy/rights review, and owner submission approval remain outstanding. Internal testing does not require UDID registration.

## Owner product requirements

- Application: Fylogia; English; iOS and iPadOS; initially free.
- Tagline: Your World, One Page at a Time.
- Existing approved branding and `public/brand/app-icon-1024.png` are available as source assets. Native asset-catalog and App Store icon validation are pending.
- Preserve the website and its local user libraries. Do not bundle experimental native work into its production build.

## Gates not yet satisfied

- [ ] Universal native application builds and launches in a usable Apple environment.
- [ ] Architecture and supported OS versions selected from evidence.
- [x] Explicit app/widget App IDs, App Store Connect record, bundle identifiers and Team ID `WS32P56Z42` verified.
- [x] Automatic signing verified for app and widget; local App Store Connect export verified Cloud Managed Apple Distribution certificates, explicit store profiles and non-debuggable entitlements. Archive itself is development-signed; use the verified exported IPA for any later authorized upload.
- [x] Apple Developer enrollment and Admin team access confirmed in Xcode. Legal agreements and any payment obligations remain owner-managed.
- [ ] Native icons/required device screenshots captured from the real application.
- [ ] App description, keywords, release notes and support contact approved.
- [ ] Native privacy policy and app-privacy disclosures reflect actual implemented collection, SDKs, optional iCloud and notification services.
- [ ] Do not assume website privacy wording or a proposed local-only architecture proves App Store disclosures.
- [ ] Age/content rating questionnaire completed against actual content/settings.
- [ ] Publisher attribution, permitted full content, images, PDFs and original links reviewed; professional rights review where needed.
- [ ] Accessibility, startup, sustained curls, memory, offline, interruption, widgets, intents, notifications and sync tested.
- [ ] Physical-device results separated from simulator/emulation results.
- [ ] TestFlight signing/upload and external-testing requirements satisfied with authorized Apple access.
- [ ] Known release blockers resolved and final owner submission approval recorded.

The App Store Connect record and explicit identifiers are registered. No capabilities or CloudKit containers were enabled. The manual Build + Test, manual device-validation, and manual archive-only Xcode Cloud workflows are configured. No archive was run, uploaded or distributed; no testers were invited, and no monetization activation, purchase or Store submission occurred. No secrets, certificates or private signing keys belong in this repository. App Store approval remains unverified.
