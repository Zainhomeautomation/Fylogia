# Fylogia iOS architecture evaluation

Status: **not selected**. Phase 4 has not started. This document records the required decision process rather than representing an unbuilt native prototype as a product.

The current website is frozen at `fylogia-web-golden-v1`. Native sources, native tests, signing configuration and Apple integration must remain isolated from the website output and production pipeline. No native application exists in this checkout yet, and no native performance claim is made.

## Candidates to evaluate in Phase 4

| Candidate                                                      | Questions to prove with a representative build                                                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fully native SwiftUI, with native UIKit where needed           | Can real paper curling, adaptive facing stories, text accessibility and bounded-resource preloading meet the interaction and memory targets?     |
| Hybrid React content and native integrations                   | Does the actual iOS web-content host meet curl latency, memory, startup and offline targets, rather than only desktop WebKit tests?              |
| Native critical interfaces with reusable permitted web content | Can the native feed/navigation remain smooth while article HTML and original-publication readers preserve publisher rights and offline behavior? |

The benchmark must use the same realistic stories/images and record startup, drag response, completed/canceled/rapid turns, long sessions, orientation changes, memory pressure, frame cadence, accessibility and offline resource behavior. Record simulator and physical-device evidence separately. Reuse is a benefit, not the deciding criterion.

## Product invariants

- One universal adaptive iPhone/iPad application; no model-name layout assumptions.
- General news on first launch; personalization and tutorial optional.
- Local persistence without a Fylogia sign-in; iCloud optional and private, with a local-only fallback.
- No publisher-content upload to a reading-state sync service; no paywall bypass.
- Preserve article identity/position, bookmarks and progress through resizing and reader navigation.
- Haptics optional; sound independently controlled and off by default.
- Notifications off until explicit permission, with topic/frequency/quiet-hour controls.
- WidgetKit and App Intents use narrow native integration surfaces.
- No paid AI inference, ads, subscriptions or unnecessary monetization infrastructure at launch.

## Toolchain status

Initial discovery found only Command Line Tools. The owner subsequently completed Xcode setup: Xcode 27.2 now responds, and XcodeBuildMCP lists iOS 17 iPhone/iPad simulators. No simulator has been booted and no native project exists yet. Architecture selection and prototypes remain gated on completion of Phases 1–3; tool availability alone is not a build, performance or physical-device result. Signing/team identifiers and iCloud/APNs entitlements must not be invented or committed as usable credentials.

Latest inventory: Xcode 27.2 SDKs and 21 iOS 27.2/17.0 simulators are available; no connected physical devices were discovered. Boot/performance testing and architecture selection remain pending earlier sequential phases.

## Selected first implementation — 2 November 2026

The earlier “not selected” status above is historical. For the first functional native milestone, select **SwiftUI app lifecycle + UIKit native critical reader**, not a WKWebView wrapper. Reuse the existing public edition contract, rights flags and brand assets; do not reuse DOM geometry as native geometry.

The React inspection found `usePageTurn.ts` coordinating gesture ownership, async capture, queued navigation, reduced motion and cleanup, with `paper-surface.ts` cloning bounded DOM/PDF surfaces for a custom paper renderer. That is valuable web functionality but does not establish its performance in a standalone PWA or WKWebView. The bounded prior investigation did not reproduce a confirmed standalone-specific root cause, so no speculative website fix is included.

UIKit provides [interactive page curl and spine placement](https://developer.apple.com/documentation/uikit/uipageviewcontroller/transitionstyle-swift.enum), with [double-sided content required at a middle spine](https://developer.apple.com/documentation/uikit/uipageviewcontroller/isdoublesided). The implementation uses native page controllers and Core Text, eliminating the DOM-snapshot/JS animation boundary for this critical surface. It keeps native haptics, sound, accessibility and future PDFKit/WidgetKit integrations possible without a broad web bridge.

Decision evidence: first universal simulator build succeeded; initial iPad suite passed, including native finger drags, resize anchors, state persistence and exact contiguous text coverage. The repeated 24-page fixture pagination benchmark averaged about 2 ms on the host simulator. This supports continuing this native implementation, **not** a claim of superior battery life or 60 FPS on physical devices. A representative native-vs-WKWebView timing/memory comparison, long-session traces, native PDF and real-device benchmarks remain release gates. Pure SwiftUI has no equivalent built-in interactive paper-curl control; a UIKit bridge is narrower and lower-risk than writing a new mesh engine for the first milestone.
