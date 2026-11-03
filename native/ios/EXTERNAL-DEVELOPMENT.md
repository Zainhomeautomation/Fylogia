# External development workspace

The native branch can be built from a mounted APFS development volume. The golden website remains a separate, protected source reference; do not deploy native work to the website production branch.

Run `scripts/check-development-volume.sh` before building. It checks an external workspace's mount and the 10 GB internal free-space floor. On the owner's Developments SSD it also validates the approved volume UUID, APFS and ownership. If the SSD is unavailable, reconnect it; do not create a substitute `/Volumes/...` directory on the internal disk. Start heavy simulator work only with at least 20 GB internal free.

Build the bundled interface using the existing web checkout's dependencies:

```sh
FYLOGIA_NODE_MODULES=/Volumes/Developments/Projects/Fylogia/Web/node_modules node scripts/build-web.mjs
```

Use Xcode Settings → Locations to select `/Volumes/Developments/Xcode/DerivedData` and `/Volumes/Developments/Xcode/Archives`. Keep Xcode itself and Apple-managed simulator runtimes in their supported internal locations. No new runtime is required.

For this workspace, the Xcode test destination and build settings use:

```sh
xcodebuild -project Fylogia.xcodeproj -scheme Fylogia \
  -destination 'platform=iOS Simulator,id=EXISTING_SIMULATOR_UDID' \
  -derivedDataPath /Volumes/Developments/Xcode/DerivedData/Fylogia \
  -resultBundlePath /Volumes/Developments/Xcode/TestResults/Fylogia-UNIQUE_RUN.xcresult \
  -parallel-testing-enabled NO CODE_SIGNING_ALLOWED=NO test
```

Launch Codex work against the external native checkout rather than its preserved internal predecessor. Do not work concurrently on both copies of the same branch. The external linked worktrees must resolve to the external common Git directory; `git rev-parse --path-format=absolute --git-common-dir` verifies this.

Internal originals are retained until the owner explicitly approves deletion. Private migration inventories, databases, backups and generated build files do not belong in this public repository. Full migration status is maintained separately; copying a subset of projects does not establish that every development environment has migrated.

This Mac also has guarded workspace launchers under
`/Volumes/Developments/Workspace-Configuration`. Their project registry checks
the external Git common directory and expected remote before opening the
existing folder through `codex app PATH`. They do not migrate chat histories or
guarantee automatic conversation resumption. Global developer caches and
workspace settings remain local machine configuration, outside this repository.
