# Fylogia App Store preparation checklist

Status: **preparation ledger only; no release archive, TestFlight upload or submission**. Phase 15 follows implementation and quality validation. Final App Store submission requires explicit owner approval.

### TestFlight readiness audit (7 November 2026)

- Xcode/App Store Connect access is confirmed for Zain Abdulahad, Admin, Team ID `WS32P56Z42`. The App Store Connect Apps page is empty; no `com.fylogia.native` app record exists. No record was created.
- The Developer portal currently lists no explicit Fylogia App IDs, no provisioning profiles, and only a Development certificate. The local keychain also has no Apple Distribution identity. The previous signed Debug build is not an App Store/TestFlight distribution build.
- **BLOCKED before archive/export:** an Admin must register the explicit app identifier `com.fylogia.native` (and `com.fylogia.native.widget` for the embedded extension), then create the App Store Connect app record with the existing app bundle ID. The owner must choose the primary language and a unique SKU; Apple does not allow changing the SKU after record creation. Check for an existing team distribution certificate before allowing Xcode Automatic signing to create/manage App Store profiles.
- No archive, distribution signing asset, app record, upload, TestFlight processing or invitation was created. After the owner creates the identifiers and record, resume with a Release archive and verify App Store Connect signing for both app and widget. Internal TestFlight uses App Store Connect users assigned to the app; it does not require device UDID registration. Tester assignment and distribution remain behind owner approval.

## Owner product requirements

- Application: Fylogia; English; iOS and iPadOS; initially free.
- Tagline: Your World, One Page at a Time.
- Existing approved branding and `public/brand/app-icon-1024.png` are available as source assets. Native asset-catalog and App Store icon validation are pending.
- Preserve the website and its local user libraries. Do not bundle experimental native work into its production build.

## Gates not yet satisfied

- [ ] Universal native application builds and launches in a usable Apple environment.
- [ ] Architecture and supported OS versions selected from evidence.
- [x] App/widget bundle identifiers, Fylogia Team ID `WS32P56Z42`, Automatic development signing and signed generic-device Debug build verified. App Store distribution signing, app record and any future capabilities remain unverified.
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

The signed build used Xcode-managed wildcard provisioning profiles; no App Store Connect app record, explicit App ID/capability configuration, container, native upload, monetization activation, Apple agreement acceptance, purchase or Store submission was verified or performed by this task. No secrets/certificates/private signing keys belong in this repository. App name availability and App Store approval are unverified.
