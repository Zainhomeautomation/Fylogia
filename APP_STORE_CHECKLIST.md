# Fylogia App Store preparation checklist

Status: **preparation ledger only; a local App Store signed export was verified, but nothing was uploaded or submitted**. Phase 15 follows implementation and quality validation. Final App Store submission requires explicit owner approval.

### TestFlight readiness audit (7 November 2026)

- **PASS registration:** Apple Developer team `WS32P56Z42` now has explicit App IDs `com.fylogia.native` (Fylogia) and `com.fylogia.native.widget` (Fylogia Widget). Both were registered without enabling extra capabilities.
- **PASS App Store Connect record:** Fylogia is present with platform iOS, primary language English (U.S.), bundle ID `com.fylogia.native`, SKU `FYLOGIA-IOS-001`, Apple ID `6831956558`, and status Prepare for Submission. No version was submitted.
- **PASS Release distribution signing:** the Release archive built successfully. The archive itself used the local Apple Development identity, so it was not treated as the distribution artifact. A local `app-store-connect` export then succeeded and Xcode's DistributionSummary verified Cloud Managed Apple Distribution signing for both app and embedded widget, Team ID `WS32P56Z42`, explicit store provisioning profiles, and `get-task-allow=false`. The exported IPA is `/Volumes/Developments/Xcode/Archives/Fylogia-Registration-Export/Fylogia.ipa`. This verification did not upload it.
- **Xcode Cloud:** the team Cloud page is accessible but still displays its Get started in Xcode setup state. No workflow or Cloud build was created. Proposed first workflow: manual-only on `native-ios-foundation`, shared `Fylogia` scheme, `Fylogia-Focused-Cloud` plan, one available iPhone simulator, serial tests, no archive or distribution post-action. See `native/ios/XCODE-CLOUD-READINESS.md`.
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
