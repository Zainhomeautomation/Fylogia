# Private device sync (development)

This branch contains a backend checkpoint, not a completed or published synchronization feature. The client queue, pairing interface and end-to-end release checks are still being implemented. Production remains on the preceding validated release until the complete milestone passes.

## Architecture and boundaries

The existing Cloudflare Pages project serves a single same-origin `POST /api/sync` endpoint backed by the private `fylogia-sync` D1 database. The operator's scoped authorization stays in macOS Keychain. Only non-secret binding identifiers are versioned. Preview bindings are empty and the API independently rejects preview hostnames. No DNS or repository connections change.

Users keep their anonymous local profile and opt in to cloud identity creation. Device credentials are random 256-bit values, stored only as hashes in D1 and transmitted to the browser in HttpOnly, Secure, SameSite=Strict, host-only cookies. Loopback development permits non-Secure cookies; public hosts require HTTPS. Device sessions expire server-side after one year and can be revoked. Permanent credentials never appear in URLs or QR codes.

Pairing uses a five-minute, single-use 50-bit code, a separate random pending-device proof, a matching-number check and approval by the device that created the session. An approved device is inactive until its authenticated handshake completes. Rate limits and bounded pending requests constrain guessing and abuse. Authenticated handshake retries may restore the same approved device cookie; reuse of the shareable pairing code cannot connect another device.

Every private operation authenticates its cookie and derives ownership server-side. An expected-profile guard prevents old tabs from uploading into a different library after another tab changes the browser's connection. This guard is not an authorization selector. Cross-origin requests and unsupported methods are rejected; private responses use `no-store`, and the service worker excludes API paths entirely.

Only explicit bibliographic metadata, preferences, selections, bookmarks, progress, history and daily-edition metadata are representable. Unknown fields, publisher bodies, excerpts, image fields, PDF files, oversized requests and future change clocks are rejected. The server never fetches user-supplied URLs. SQL uses bound parameters. Records and tombstones are private to an authenticated profile.

## Conflict and retry contract

Mutations use device sequences and batch IDs for idempotent retries. Latest change times win; equal clocks prefer removals, then stable device IDs. A deletion suppresses an unobserved re-addition; deliberately re-saving after observing that deletion is allowed. Profile revisions support delta reads. Metadata batches and their sequence/revision updates commit atomically, including quota checks. Recovery rotates its random key and revokes older device credentials; deleting a cloud profile cascades through its private records and connections without affecting other profiles or local copies.

## Free-tier capacity

The account's D1 dashboard showed the Free plan's hard daily limits. [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) includes five million rows read and 100,000 written per day; [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) include a 500 MB Free database limit. Pages Functions use the Workers allowance ([pricing](https://developers.cloudflare.com/pages/functions/pricing/)). No paid plan, subscription or additional hosting provider is enabled.

Application safeguards cap normal requests at 5,000/day, accepted metadata operations at 5,000/day, ten mutations/request, 128 KiB/request, 5,000 records/profile, an index-inclusive estimate of 5 MiB/profile and 200 MiB globally, and 1,000 profiles. Pairing is additionally rate limited; expired request buckets and sessions are pruned in bounded maintenance batches. These are MVP safeguards, not a promise of unlimited sync. Provider/account limits are shared with other services and may temporarily pause sync; local reading must remain independent. The estimated added infrastructure cost is $0 within the Free plan; actual row accounting is measured by Cloudflare.

## Validation and operations

Server tests use a disposable SQLite adapter; browser integration also exercises actual Pages Functions and local D1 with unrelated browser profiles. Test servers create and remove only their own local persistence directory, never a remote database. `npm test` now defaults to this Pages runtime; `FYLOGIA_PAGES_RUNTIME=0` selects the static preview for workflows without Functions.

Before a compatible production deployment, apply reviewed migrations with a scoped personal account: `wrangler d1 execute FYLOGIA_SYNC_DB --remote --file migrations/0001_sync.sql`. Production code and its binding configuration deploy through the existing GitHub integration. Migration files do not contain credentials or destructive resets. Client and production two-device verification remain release requirements.
