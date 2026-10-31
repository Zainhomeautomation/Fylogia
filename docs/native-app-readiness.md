# Future Apple application foundation

Fylogia remains a React PWA. This release does not create, sign or submit a native application, and passing browser tests does not establish App Store acceptance.

## Reusable parts

The existing article/PDF readers, bounded paper geometry, responsive single/facing-page layout, accessible navigation, source directory and metadata model can be reused in a future web-backed application. The shared renderer operates only during a gesture/turn and releases its temporary textures afterward. A native SwiftUI renderer would require its own rendering implementation; the current geometry is not a native UI component.

The approved opaque 1024 × 1024 icon master is `public/brand/app-icon-1024.png`; scalable variants and the brand export process are in [branding](branding.md). Keep the existing identity and publisher credits.

## Integration work before native release

- Decide on an appropriately capable native experience. A thin website wrapper may not satisfy Apple's [minimum functionality guideline 4.2](https://developer.apple.com/app-store/review/guidelines/). Approval is not guaranteed.
- Keep one gesture owner per reader surface. Test real touch, Apple Pencil, VoiceOver, keyboard, pinch/zoom, safe areas, rotation, low-power conditions and interrupted animations. The interface adapts to available viewport dimensions, without assuming an unverified device model or hinge geometry.
- Provide persistent native file/database adapters for downloaded articles, image bytes and private PDFs, plus native file import/export. Do not assume a service worker works on a bundled file/custom-scheme origin. Cache eviction and OS storage pressure still need explicit handling.
- Safari/PWA and native containers have separate libraries. Offer explicit metadata export/import or opt-in pairing; downloads and private PDFs must be transferred locally or downloaded again. Never silently reset the existing PWA library.
- Store any native device credential using Keychain rather than a shareable URL. Preserve short-lived pairing, existing-device approval, revocation and recovery. Keep private API origin checks and use a narrowly allowlisted bridge; do not expose private APIs to arbitrary embedded publisher pages.
- Open original publishers through a safe external-browser surface where appropriate. Publisher content and photos retain their own permissions; public access is not republication permission. Never upload downloaded copyrighted bodies/PDFs for synchronization.
- Prepare an actual privacy policy, [App Privacy disclosures](https://developer.apple.com/app-store/app-privacy-details/), and [privacy manifests](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests) based on the shipped native code, SDKs, optional sync, publisher CDNs and the existing Cloudflare performance beacon. Do not claim “no data collected” without checking the final implementation.
- Review [WebKit app-bound domains](https://webkit.org/blog/10882/app-bound-domains/) and external-link handling for a future WKWebView integration. Do not relax the current CSP, cookie or CORS protections to make a wrapper work.
- Complete signing, provisioning, TestFlight and App Review using the owner's Apple developer account only after separately authorized.

## Current testing boundary — 31 October 2026

This Mac has Command Line Tools but no full Xcode, `simctl`, `xctrace` or `devicectl`, and no connected iPhone/iPad was identified in USB enumeration. Wireless device availability is unverified. Native Safari is installed, but a fresh WebDriver session was blocked by its remote-automation permission; the current UI session is locked Private Browsing. No permission or system configuration was changed to bypass those restrictions.

Current Chromium and Playwright WebKit tests cover phone/tablet/foldable-sized viewports, touch-listener contracts, real printed page animation, offline reading and data preservation. Simulated standalone flags are not installed-PWA tests. Historical native Mac Safari results in [Apple platform testing](apple-platform-testing.md) are partial earlier evidence, not current physical iPad acceptance.

To enable Apple validation, install full Xcode and compatible simulator runtimes, or connect and trust an iPad/iPhone; authorize native Safari automation for isolated desktop tests where desired. Before closing the reported iPad issue, verify visible article/PDF curls on a real iPad in Safari and the Home Screen app: left/right/up/down, partial cancellation, single taps, links, pinch/Fit, portrait/landscape, rapid turns and downloaded content in Airplane Mode. Preserve the owner's library; do not clear site data as a troubleshooting shortcut.
