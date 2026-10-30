# Apple testing capabilities — 29 October 2026

This inventory precedes the final production audit. Installed integrations alone are not evidence of a successful device test.

| Capability | Observed result | Status |
|---|---|---|
| Developer toolchain | `xcode-select -p`: `/Library/Developer/CommandLineTools`; full Xcode was not found by Spotlight | Command Line Tools available; full Xcode missing |
| iOS / iPadOS Simulator | Both `xcrun simctl` and XcodeBuildMCP `list_sims` fail because `simctl` is unavailable | BLOCKED |
| Device enumeration | `xcrun devicectl list devices` fails because `devicectl` is unavailable; USB inventory did not identify an iPhone/iPad | Physical-device testing NOT RUN; wireless device availability unverified |
| Native macOS Safari | `/usr/bin/safaridriver --version`: Safari 27.2 (22625.2.8.11.9) | Installed |
| Safari WebDriver | Session creation explicitly fails: enable Allow remote automation in Safari Settings / Developer | BLOCKED by Safari permission |
| Native Safari UI control | CUA can inspect and operate the real Safari application | Available; isolated-origin test results to be recorded |
| XcodeBuildMCP | Simulator UI, boot, screenshot, gesture, video and build/test tools are exposed | Integration installed; Simulator operations blocked by missing Xcode/runtime |
| iOS simulator-browser skill | Can mirror a running Simulator; there is no available simulator to mirror | NOT RUN |
| Playwright Chromium / WebKit | Existing automated browser suites run successfully | Simulated viewport/touch testing, not physical iPhone/iPad verification |

To enable actual iOS/iPadOS Simulator testing, install full Xcode from Apple, complete its first-launch setup and install compatible iOS/iPadOS Simulator runtimes. Use its developer directory for the test commands; no global toolchain switch is required. No large Xcode download, account change or system configuration change was performed. Connected-device testing additionally needs a connected, trusted iPhone/iPad and appropriate developer permissions. The physical iPhone Duo double-tap issue remains pending owner verification; neither a real iPhone Duo nor an Apple foldable simulator was used.

Native Safari tests must use a fresh local test origin and disposable app data, preserving the owner's production Safari library. WebDriver automation requires enabling Safari's Allow remote automation setting. No Safari security setting was silently changed.

## Native Safari execution

The actual macOS Safari application was operated through native UI automation on the disposable `http://127.0.0.1:43187/` origin. Onboarding, recommended-source selection, opening a complete NASA Science article, single-click forward navigation (spread 1 to 2 and 2 to 3), immersive mode, and reload/reopen persistence were exercised successfully. The reopened article restored its saved reading position after pagination measurement. A native screenshot was captured in the task's outputs directory.

These are desktop Safari results. They do not prove iOS installation, Airplane Mode, physical foldable gestures, VoiceOver behavior, or simulator performance. Safari's UI accessibility snapshot continued to include some background nodes; DOM modal isolation is covered by browser regression tests, but native assistive-technology verification remains outstanding.

## Reader interaction regression coverage

The shared article/PDF page-corner controls separate taps from drags. Touch motion within 12 CSS pixels remains a tap; horizontal dragging starts the curl after that threshold, and vertical movement cancels it. Tests exercise Chromium's native touch input with finger jitter, WebKit taps, rapid consecutive turns, keyboard navigation, reserved controls outside the text viewport, compact toolbars, immersive reveal, and exact modal isolation restoration. These complement the existing curl cancellation, reduced-motion, PDF, offline, bookmark and resize suites.

## Additional current-environment checks

A fresh XcodeBuildMCP inventory again found no usable simulator because full Xcode and `simctl` are missing. The Swift command-line compiler and macOS SDK are available. Apple's native Vision framework decoded a QR image produced by Fylogia's QR encoder and recovered the exact public dummy pairing URL. This is a native macOS software decoder test, not a camera or physical-device test.

Further native Safari PDF zoom/offline interaction checks were interrupted when the Mac auto-locked. Native UI automation explicitly refused access while locked. No lock bypass or Safari automation permission change was attempted. Previous successful native Safari reader checks are scoped above; the complete automated Chromium/WebKit suites cover offline, zoom, pagination and responsive regressions independently.

## Release recheck — 30 October 2026

Full Xcode remains absent; only Command Line Tools are selected. `simctl` and `devicectl` remain unavailable, and USB enumeration found no connected iPhone/iPad. Wireless devices are unverified. XcodeBuildMCP is no longer exposed in the current tool inventory. Safari 27.2 remains installed, but the current native UI attempt failed with `cgWindowNotFound`; no additional native UI result is claimed. Earlier successful desktop Safari checks remain historical, partial evidence. The current production release was exercised in Chromium and Playwright WebKit, including offline content and real PDF rendering, with no physical iPhone Duo claim.
