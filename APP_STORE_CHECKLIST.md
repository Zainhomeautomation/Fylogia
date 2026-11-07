# Fylogia App Store preparation checklist

Status: **preparation ledger only; no native binary, TestFlight upload or submission**. Phase 15 follows implementation and quality validation. Final App Store submission requires explicit owner approval.

## Owner product requirements

- Application: Fylogia; English; iOS and iPadOS; initially free.
- Tagline: Your World, One Page at a Time.
- Existing approved branding and `public/brand/app-icon-1024.png` are available as source assets. Native asset-catalog and App Store icon validation are pending.
- Preserve the website and its local user libraries. Do not bundle experimental native work into its production build.

## Gates not yet satisfied

- [ ] Universal native application builds and launches in a usable Apple environment.
- [ ] Architecture and supported OS versions selected from evidence.
- [x] App/widget bundle identifiers, Fylogia Team ID `WS32P56Z42`, Automatic signing and signed generic-device build verified with owner authorization. App Store Connect record and any future capabilities still require owner review.
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
