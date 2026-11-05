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
- [ ] Bundle identifier, signing team and capabilities verified with owner authorization.
- [ ] Apple Developer enrollment/account access confirmed; legal agreements and payments handled by owner.
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

No registration of an App ID/container, native upload, monetization activation, Apple agreement acceptance, purchase or Store submission has been performed. No secrets/certificates/private signing keys belong in this repository. App name availability and App Store approval are unverified.
