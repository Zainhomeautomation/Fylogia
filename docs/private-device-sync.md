# Private device sync

Optional sync is published and was verified using isolated production test profiles, including pairing, offline edits, revocation and recovery. The final release audit records the latest validation. The original local profile, storage keys, offline databases and public Pages integration are retained.

## Architecture and boundaries

The existing Cloudflare Pages project serves a single same-origin `POST /api/sync` endpoint backed by the private `fylogia-sync` D1 database. The operator's scoped authorization stays in macOS Keychain. Only non-secret binding identifiers are versioned. Preview bindings are empty and the API independently rejects preview hostnames. No DNS or repository connections change.

Users keep their anonymous local profile and opt in to cloud identity creation. Device credentials are random 256-bit values, stored only as hashes in D1 and transmitted to the browser in HttpOnly, Secure, SameSite=Strict, host-only cookies. Loopback development permits non-Secure cookies; public hosts require HTTPS. Device sessions expire server-side after one year and can be revoked. Permanent credentials never appear in URLs or QR codes.

Pairing uses a five-minute, single-use 50-bit code, a separate random pending-device proof, a matching-number check and approval by the device that created the session. An approved device is inactive until its authenticated handshake completes. Rate limits and bounded pending requests constrain guessing and abuse. Authenticated handshake retries may restore the same approved device cookie; reuse of the shareable pairing code cannot connect another device.

Every private operation authenticates its cookie and derives ownership server-side. An expected-profile guard prevents old tabs from uploading into a different library after another tab changes the browser's connection. This guard is not an authorization selector. Cross-origin requests and unsupported methods are rejected; private responses use `no-store`, and the service worker excludes API paths entirely.

Custom feed URLs containing queries/fragments stay device-local, as do article links with recognized credential/signature parameters. Server validation rejects those URLs and local merges retain their existing copies and source selections. Only explicit bibliographic metadata, preferences, selections, bookmarks, progress, history and daily-edition metadata are representable. Unknown fields, publisher bodies, excerpts, image fields, PDF files, oversized requests and future change clocks are rejected. The server never fetches user-supplied URLs. SQL uses bound parameters. Records and tombstones are private to an authenticated profile.

## Conflict and retry contract

Mutations use device sequences and batch IDs for idempotent retries. Latest change times win; equal clocks prefer removals, then stable device IDs. A deletion suppresses an unobserved re-addition; deliberately re-saving after observing that deletion is allowed. Profile revisions support delta reads. Metadata batches and their sequence/revision updates commit atomically, including quota checks. Recovery prepares a replacement key without consuming the old proof, then rotates the key and revokes older device credentials only after the user confirms saving the replacement. Its five-minute authenticated confirmation can restore the same cookie after a lost response; deleting a cloud profile cascades through its private records and connections without affecting other profiles or local copies.

## Free-tier capacity

The account's D1 dashboard showed the Free plan's hard daily limits. [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) includes five million rows read and 100,000 written per day; [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) include a 500 MB Free database limit. Pages Functions use the Workers allowance ([pricing](https://developers.cloudflare.com/pages/functions/pricing/)). No paid plan, subscription or additional hosting provider is enabled.

Application safeguards cap normal requests at 5,000/day, accepted metadata operations at 5,000/day, ten mutations/request, 128 KiB/request, 5,000 records/profile, an index-inclusive estimate of 5 MiB/profile and 200 MiB globally, and 1,000 profiles. Pairing is additionally rate limited; expired request buckets and sessions are pruned in bounded maintenance batches. These are MVP safeguards, not a promise of unlimited sync. Provider/account limits are shared with other services and may temporarily pause sync; local reading must remain independent. The estimated added infrastructure cost is $0 within the Free plan; actual row accounting is measured by Cloudflare.

## Validation and operations

Server tests use a disposable SQLite adapter; browser integration also exercises actual Pages Functions and local D1 with unrelated browser profiles. Test servers create and remove only their own local persistence directory, never a remote database. `npm test` now defaults to this Pages runtime; `FYLOGIA_PAGES_RUNTIME=0` selects the static preview for workflows without Functions.

Before a compatible production deployment, apply reviewed migrations with a scoped personal account: `wrangler d1 execute FYLOGIA_SYNC_DB --remote --file migrations/0001_sync.sql`, then `wrangler d1 execute FYLOGIA_SYNC_DB --remote --file migrations/0002_sync_recovery.sql`. Production code and its binding configuration deploy through the existing GitHub integration. Migration files do not contain credentials or destructive resets. The reviewed initial schema was applied to the new private database before release. Client and production two-device verification remain release requirements; no existing user library is queried or reset by migration.

## Device interface and local durability

Settings → Sync my devices enables an anonymous cloud library or links to one that already exists. New users can link from onboarding. QR encoding runs locally in a lazily loaded MIT-licensed `qrcode-generator` module; no external QR service receives the code. A camera opens the short-lived same-origin pairing link, whose fragment is immediately removed. The original device must compare the matching number and approve. The second device explicitly combines libraries before uploading metadata. Recovery keys are masked by default, held in dialog memory only, and never included in a URL or ordinary library export.

Before every first merge, IndexedDB stores a complete device-local library backup. The three most recent backups can be downloaded from the sync panel. Cloud appearance wins; explicitly selected sources/interests and saved links combine; initial article progress uses the furthest position. Independently assembled conflicting daily issues retain distinct identifiers. Later edits use per-record conflict rules, with tombstones for removals. Public PDF page progress and bookmarks are separate metadata records; imported PDF files and their local reading positions never sync.

A separate private IndexedDB database holds metadata records, pending changes and the exact in-flight batch. A synchronous metadata-only localStorage journal protects closing a tab before its IndexedDB transaction completes. Web Locks serialize tabs; browsers without this capability retain local reading and show an explicit sync limitation. Interrupted responses retry the same batch; acknowledgements never remove a newer local edit. Edits made during a network request remain overlaid until queued. Reconnection, foreground return and one-minute foreground polling trigger synchronization. No background socket or paid service is required. A free-tier allowance can pause cloud updates without blocking local reading.

Synced saved links are honestly labeled when their text is not on the device. Current authorized feed content enriches them in memory when available; empty links cannot masquerade as offline downloads. Local permitted article bodies always take precedence over bibliographic metadata. Original content remains accessible through the publisher link.

This is private access-controlled storage, **not end-to-end encryption**. Cloudflare and the service operator can access stored metadata. Recovery rotates the key and revokes previous sessions. Revocation blocks future access, but cannot erase copies previously stored on a disconnected device. Deleting the private cloud library leaves all device-local copies untouched, as stated in the interface.

## Release review regressions

Daily issues containing private/signed story identifiers remain complete on the original device and are excluded from cloud projection; the server also rejects credential-bearing identifiers inside issue metadata. Cross-tab storage notifications carry cloud provenance, stale queued events are ignored, and storage-origin values are reconciled against the shared server/outbox state before creating an intent. Remote application never receives a new user-edit timestamp merely because another tab observed it.

Recovery is a two-phase operation. Preparation creates one short-lived hashed pending proof per profile and leaves the previous key and devices valid. The interface requires saving the replacement key before confirmation. Confirmation atomically rotates the verifier, revokes prior devices and creates one replacement session. A repeated authenticated confirmation restores that same session after a lost response. An expired unacknowledged preparation leaves the original key usable. A nonce guards concurrent confirmation batches; no plaintext recovery/device secret is stored in the database.

### Optional country and sort preferences

Updated clients announce `preferenceVersion: 2` on exchanges and synchronize ISO `setting:country` and enum `setting:newsSort` records. Unversioned/older clients continue receiving only the setting keys they understand; they do not see or delete the extension settings. A separate capable-settings cursor records the last revision actually read by an updated client. Exchanges use the lower of that watermark and the shared cursor, so an older tab cannot skip country/sort values by advancing the shared cursor. Its identity, pending changes and saved library remain intact. Clearing the country is a normal preference tombstone, not cloud-library deletion. No D1 schema migration or new infrastructure is required.
