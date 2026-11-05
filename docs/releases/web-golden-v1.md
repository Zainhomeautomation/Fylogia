# Golden website release and recovery

Frozen on 2026-11-02 (Asia/Muscat), before native application development. The owner approved the website appearance, navigation and existing reader. The reported Home Screen PWA performance problem is a separate open issue, not a claim that every host is defect-free.

## Identity and integrity

- Source commit: `26fd37f27bd70cd7495f33209b823796770d9c22`.
- Annotated tag: `fylogia-web-golden-v1`.
- Tag object: `ca205e79dcecbd891522984a83289eb3f34a835d`.
- [Exact-tag protection](https://github.com/Zainhomeautomation/Fylogia/rules/26345306): active update/deletion restrictions, no bypass actors. Git object identities are content-addressed; repository administrators can still change protection policy. Never force-update or repurpose the tag.
- Existing production deployment ID: `2e0d5c7e-e8ad-4793-8a61-7f83f9628cf2`, Cloudflare Pages project `fylogia`, production branch `main`, source `26fd37f`.
- Normal scheduled news refresh remains enabled. The tag freezes a recoverable code/content snapshot; it does not disable normal live news updates.

The owner-local `artifacts/apple-release-2026-11-02/golden/` directory outside this checkout contains a complete-history Git bundle, SHA256SUMS, asset/security evidence and a **build rehearsal** archive. The archive is rebuilt from frozen source, not a claim that Cloudflare's build timestamps are identical. Do not publish private backups or extra publisher-content caches as release downloads.

## Recovery rehearsal

Verify the source bundle and its SHA-256 checksum. Clone it into a fresh local directory and check out the tag, then verify `git rev-parse HEAD` equals the recorded source. Install the locked dependencies with a compatible Node 24/npm environment, run server tests and build with `npm run build:pages`. Run the existing browser regression suite against the Pages runtime. The current rehearsal uses the already installed locked dependency cache, without modifying production. The pristine recovery build and all 151 server tests pass; its compiled client assets match the live frozen deployment.

The original tag navigation suite has a calendar-dependent Daily Magazine fixture: after the frozen feed day expires, its Today button is correctly disabled. Keep the tag unchanged. The maintenance harness fixes only the test Date clock to the latest followed fixture date (timers and publication data remain natural/unchanged). Use that documented test-harness correction when rehearsing this frozen runtime; record the harness revision separately rather than falsely claiming the original test file passed unchanged.

Compare compiled client asset hashes with the frozen production asset evidence. Build stamps/service-worker build metadata may differ between rebuilds. Git integrity and successful tests are separate from proof that a live rollback occurred; no live rollback is performed just to demonstrate recoverability.

## Actual recovery, only when needed

[Cloudflare Pages supports rolling back to a successful production deployment](https://developers.cloudflare.com/pages/configuration/rollbacks/). In the **existing** `fylogia` project, inspect the recorded deployment and its compatibility with current Functions/bindings before choosing rollback. Do not create another repository/project or modify DNS. Confirm the target source, public website, readers, SEO, offline update and saved-data behavior after any authorized recovery.

If the old deployment is unavailable, rebuild the tag in isolation and prepare a reviewed website-only recovery patch or deployment through the existing project. Preserve Git history; do not reset main or overwrite unrelated native work. Source restoration includes the tag's Functions and build configuration, not just static assets. Existing D1 bindings and secrets must be supplied through their existing secure mechanisms, never copied into Git or frontend files.

A code rollback must **not** reset D1 data, CloudKit records, IndexedDB, Cache Storage downloads, user preferences, bookmarks or reading history. Backend data/schema compatibility needs separate review before an actual recovery. Never tell users to clear their libraries as part of a routine rollback.

## Independent development

Use `web-maintenance-after-golden-v1` for reviewed website fixes. Keep native implementation and its build/test pipeline isolated when its phase begins. Validate a PWA fix against this golden visual/interaction baseline before updating production. Do not deploy documentation checkpoints or experimental native work merely to advance a website build identifier.
