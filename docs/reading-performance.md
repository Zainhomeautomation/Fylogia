# Reading performance and compatibility milestone

The existing reader, storage keys, article schema, copyright rules, deployment integration and complete edition remain in place.

- DM Sans is served from the application under its SIL Open Font License and included in the offline shell. This removes the render-blocking Google Fonts stylesheet request.
- Feed XML parsing is loaded only for custom feeds. The first onboarding interest screen defers the application news request until source selection.
- A small head initializer applies an explicitly selected legacy theme before React starts; new profiles retain Midnight Navy.
- The Pages build creates source files from the existing authorized edition. For You requests followed sources; Explore and Categories retain the complete directory. Saved, history and archived Daily Editions request the sources needed by their stories. Source files preserve complete original objects, including text and attribution. Capability negotiation and revision checks fall back to the original complete edition on older static hosts, failures and offline access.
- The service worker still caches the original edition and individual downloads. Source files are cached on demand, rather than prefetching the entire expanded directory.
- Cross-tab provenance is bound to the precise stored JSON. A preference change from an older running tab is not mistaken for a cloud echo and discarded. The sidecar fingerprint is compatibility bookkeeping, not authentication or encryption.

Regression coverage includes the pre-JavaScript theme, offline local font, deferred custom parser, source-file/full-edition equivalence, failed-source fallback, archived editions whose sources were unfollowed, and older-tab preference edits across Chromium and WebKit.

## Reproducible measurements

`node scripts/profile-reading.mjs --url=https://fylogia.com/ --out=/tmp/fylogia-profile` measures six actual reader turns at phone and unfolded viewport sizes in Chromium and WebKit. `--lighthouse` additionally invokes Lighthouse 13.6.0 on a disposable personalized profile with HTTP and service-worker caches cleared. It never uses the owner's browser profile. Measurements are lab results, not field INP or physical-device FPS. Run benchmarks without simultaneous test suites or compilation.

Before this milestone, the production personalized cold-home lab run recorded LCP 6,333 ms, CLS 0.00443 and TBT 24 ms (Performance 77). Post-deployment measurements must be recorded separately; local-origin results do not prove production performance.

## Earlier page-curl rendering decision

The following records the earlier milestone. The subsequent [physical-page turning implementation](physical-page-turning.md) replaces its whole-page strip geometry with a localized paper crease and bounded adjacent PDF preparation.

The existing renderer bends actual article/PDF page content using a bounded twelve-strip deformation with shadows, interactive cancellation and a destination page underneath. It is an approximation, not a continuously deformable physical-paper simulation. Reduced motion uses accessible direct page changes. No animation loop runs while idle.

[StPageFlip](https://github.com/Nodlik/StPageFlip) was evaluated as an alternative: MIT licensed, no dependencies, HTML/canvas support, and portrait/landscape modes. Its HTML loader requires a collection of paginated page nodes. Replacing the current bounded reader would require a separate pagination/rendering integration and renewed text, PDF, resize and offline validation. This milestone retains the working renderer rather than claiming a dependency alone establishes more realistic paper physics. Physical mobile-Safari curl quality remains an owner-device validation item.

## Service-worker test fidelity

Page-level network interception cannot reliably mock requests owned by WebKit's service worker, particularly on the Linux CI runner. The loopback-only Pages test harness now forwards the actual application, worker and D1 API, while serving deterministic news fixtures below the worker. Fixtures are separated by a short-lived, test-context cookie; cross-origin/non-JSON control requests are rejected. The fixture proxy and its control endpoint exist only in `scripts/test-pages-runtime.mjs`, never in the deployed assets or Functions. Browser assertions remain intact. Separate tests verify fixture isolation, API forwarding, updated worker responses, offline cache access and restoration of actual publisher news.
