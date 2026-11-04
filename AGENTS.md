# Fylogia native development

For cross-project checkpoints and the current Web/Native commit and test matrix,
read `FYLOGIA-DEVELOPMENT-STATUS.md` before resuming work.

This branch is isolated native/hybrid development. Preserve the golden website,
production configuration, existing data, and unrelated working changes. Never
merge this branch into website production merely to publish native progress.

On the owner's Mac, the active checkout is on Developments at
`/Volumes/Developments/Projects/Fylogia/Native`. Use the registered workspace
preflight before editing; do not fall back to retained internal copies. Run
`native/ios/scripts/check-development-volume.sh` before building. Keep at least
10 GB internal free, and start heavy simulator tests only above 20 GB. Use
existing runtimes only and serialize storage-intensive builds.

Read `native/ios/CONSISTENT-READING-REVIEW.md` and
`native/ios/EXTERNAL-DEVELOPMENT.md` before reader changes. Portrait/narrow modes
scroll; wide/landscape modes use the cream-paper native magazine experiment.
Preserve position, settings, bookmarks and offline behavior. Page-tearing visual
acceptance, real-device testing and performance measurements remain open.

For storage guard changes, run
`python3 native/ios/scripts/test-development-volume.py` and the real guard. For
native changes, use the existing Xcode project and shared Fylogia scheme with
external DerivedData/result bundles, targeted tests, Swift formatting, and a
production build. For bundled interface changes, use the existing build-web
script and its layout regressions. Do not reset normal user data for tests.

After validation, inspect the exact diff, scan for secrets, commit only completed
task files, and push the personal repository's development branch. Inspect CI
and deployment triggers first. No force-push, automatic production merge, live
website deployment, credentials, private databases or generated build artifacts.
