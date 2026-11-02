# Current native development build

The default app now runs an isolated hybrid prototype using the protected golden React interface and a native UIKit bound-page experiment. The previous UIKit-only prototype and its data remain intact (`--native-reader`). See [BOUND-READER-REVIEW.md](BOUND-READER-REVIEW.md) for implementation limits and acceptance status. This is not a production or App Store release.

Before building, generate the bundled interface using already-installed web dependencies:

```sh
FYLOGIA_NODE_MODULES=/path/to/existing/node_modules node scripts/build-web.mjs
```

The script archives `fylogia-web-golden-v1` into ignored build storage and applies native-only transforms there. It never edits tracked website files. `--golden` builds an unmodified comparison bundle. No simulator runtimes are installed. Retain at least 10 GB free.

---

# Fylogia native reader — first functional milestone

This universal iPhone/iPad project is isolated from the production website. Open `Fylogia.xcodeproj`, select **Fylogia**, and run on an **already installed** simulator. It uses Apple frameworks only; no package manager, extra runtime, account, or paid service is required for simulator builds. Minimum target: iOS 17. Signing for physical devices remains an owner-account step, not configured here.

## Implemented

- SwiftUI lifecycle with a UIKit magazine reader and Apple's interactive `UIPageViewController.pageCurl`. One gesture owner; canceled interactive transitions do not commit progress. Navigation buttons serialize transitions.
- Responsive single/facing pages based on measured width and Dynamic Type. Core Text draws exactly the ranges used for pagination. Reading anchors are article identity + UTF-16 offset, independent of page size. Two-page layout retains the anchored words, sometimes on the right page.
- Midnight Navy shell, original Fylogia mark, cream paper, editorial type, safe-area layout, accessible controls and page text.
- General news opens without onboarding/sign-in. Read-only HTTPS use of the existing edition endpoint; up to 40 stories. Full text only when the pipeline marks it both full and permitted. Publisher attribution, preview labels and an original link remain available. First version flattens permitted HTML to text; richer headings/captions/PDF layout are future work.
- Downsampled remote photographs on opening pages. Image sessions are ephemeral; photos are not silently downloaded into the offline library.
- Device-local bookmarks and reading position in namespaced defaults. Last successful edition text is cached atomically under Application Support, excluded from cloud backups. This is an initial offline text cache, not the web application's full offline-download/library feature set. Native/PWA storage stays separate.
- Optional selection haptics and an original synthesized paper sound, independently disabled by default. Ambient sound respects silent mode. Physical feedback quality has not been tested.
- Reduced Motion replaces curl with unanimated button navigation and the system scroll interaction. No claim that a physical device was tested.

## Validation and storage

Run `scripts/check-storage.sh` before build/test/launch. Stop if internal free space is below **10,000,000,000 bytes**. Do not install runtimes or delete unrelated files. Store DerivedData in `.build/` (ignored). The project generator `scripts/create-project.py` is deterministic and uses only Python's standard library; generated project and shared scheme are checked in.

```sh
scripts/check-storage.sh
xcodebuild -project Fylogia.xcodeproj -scheme Fylogia \
  -destination 'platform=iOS Simulator,id=EXISTING_SIMULATOR_UDID' \
  -derivedDataPath .build -parallel-testing-enabled NO \
  CODE_SIGNING_ALLOWED=NO test
xcrun swift-format lint --strict --recursive Fylogia FylogiaTests FylogiaUITests
```

Tests use original Fylogia guide text, clearly labeled as test fixtures, and a separate test preference suite. Normal launches retrieve actual news. `--ui-testing --reset-test-state` resets only the test suite, never the normal native or website library.

## Before public distribution

This is not the complete native product or an App Store release. Still required: richer article formatting, PDF import/reader and zoom, explicit offline image/download controls, library/personalization screens, end-to-end offline/network tests, migration/import UX, iCloud/Keychain design, widgets, intents, opt-in notifications, signing, device profiling, VoiceOver testing, publisher/license review and final privacy disclosures. The privacy manifest reflects this initial code's app-local UserDefaults use; it is not a completed App Store privacy declaration. Requests expose normal network metadata to Fylogia and image publishers; opening originals uses the system browser.

No website code, deployment settings, DNS or PWA user data are changed. Do not merge this milestone into the website production branch merely to trigger deployment.
