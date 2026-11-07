# Fylogia App Store preparation checklist

Status: **preparation ledger only; a local App Store signed export was verified, but nothing was uploaded or submitted**. Phase 15 follows implementation and quality validation. Final App Store submission requires explicit owner approval.

### Latest gate (7 November 2026)

- The one focused Xcode Cloud accessibility run (Build 10) failed on all five configured simulator destinations. The detailed Pro Max result found the native-only “Warm cream paper” switch is 23 pt high, below the 44 pt minimum, and the test also asserted hittability for Settings content before scrolling it into view. This is a release-blocking accessibility issue plus a test visibility sequencing mismatch; see the Build 10 entry in `native/ios/IMPLEMENTATION-CHECKLIST.md`.
- Commit `48c8a63` applies the native bridge's 44×44 px semantic input target with a compact 18×18 px visual mark and makes the focused UI test scroll Settings controls into view. Focused WebKit and generic app/widget/unit/UI build checks pass locally. One manual Cloud retest was submitted for the five destinations but remains queued beyond 20 minutes with no worker or commit metadata and no tests executed; no second run will be started. No internal TestFlight archive workflow will be prepared unless that run resolves and all five tests pass.
- The existing app/widget App Store signed IPA remains available at `/Volumes/Developments/Xcode/Archives/Fylogia-Registration-Export/Fylogia.ipa`; its extracted app and widget signatures were reverified locally as Apple Distribution Team `WS32P56Z42`, IDs `com.fylogia.native` and `com.fylogia.native.widget`, version `0.1.0`, build `1`. This is a prior signed export, not a Build 10 archive.
- The same-day registration ledger below records the App Store Connect app record and SKU. The browser was signed out during this latest check, so its present live status was not reauthenticated. No upload, distribution, or tester invitation occurred. The passing Build 6 focused workflow remains unchanged at 21/21; the four iPhone Duo fold/display states are still **NOT TESTED**.

### TestFlight readiness audit (7 November 2026)

- **PASS registration:** Apple Developer team `WS32P56Z42` now has explicit App IDs `com.fylogia.native` (Fylogia) and `com.fylogia.native.widget` (Fylogia Widget). Both were registered without enabling extra capabilities.
- **PASS App Store Connect record:** Fylogia is present with platform iOS, primary language English (U.S.), bundle ID `com.fylogia.native`, SKU `FYLOGIA-IOS-001`, Apple ID `6831956558`, and status Prepare for Submission. No version was submitted.
- **PASS Release distribution signing:** the Release archive built successfully. The archive itself used the local Apple Development identity, so it was not treated as the distribution artifact. A local `app-store-connect` export then succeeded and Xcode's DistributionSummary verified Cloud Managed Apple Distribution signing for both app and embedded widget, Team ID `WS32P56Z42`, explicit store provisioning profiles, and `get-task-allow=false`. The exported IPA is `/Volumes/Developments/Xcode/Archives/Fylogia-Registration-Export/Fylogia.ipa`. This verification did not upload it.
- **Xcode Cloud:** source access is connected. The manual-only `Fylogia Focused Simulator Tests` workflow on `native-ios-foundation` retains the separate `Fylogia-Focused-Cloud` plan and its 21/21 passing baseline. `Fylogia Manual Device Validation` is also manual-only and has no archive or distribution action; its latest accessibility-only Build 10 failed on all five destinations. No automatic triggers, TestFlight delivery or post-actions are enabled. See the Build 10 checklist entry for evidence.
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

The App Store Connect record and explicit identifiers are now registered. No capabilities or CloudKit containers were enabled. No upload, TestFlight distribution, monetization activation, purchase or Store submission was performed. Xcode Cloud remains unconfigured. No secrets/certificates/private signing keys belong in this repository. App name availability beyond the created record and App Store approval are unverified.
