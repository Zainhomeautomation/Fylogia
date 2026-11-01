import { validateMutations } from "../src/sync-protocol.ts";
import {
  ApiError,
  secret,
  hash,
  cookie,
  json,
  readBody,
  localHost,
  admission,
  authenticate,
} from "./sync-security.mjs";
import {
  createProfile,
  createPair,
  requestPair,
  pendingPair,
  pairRequests,
  approvePair,
  rejectPair,
  recoverProfile,
  confirmRecovery,
} from "./sync-pairing.mjs";
const actions = new Set([
  "availability",
  "create",
  "status",
  "pair",
  "join",
  "pending",
  "requests",
  "approve",
  "reject",
  "exchange",
  "devices",
  "revoke",
  "recover",
  "recover-confirm",
  "rotate-recovery",
  "delete",
]);
const uuid = (v) => typeof v === "string" && /^[0-9a-f-]{36}$/.test(v);
async function exchange(db, auth, body, day, now) {
  if (
    body.preferenceVersion !== undefined &&
    ![1, 2].includes(body.preferenceVersion)
  )
    throw new ApiError(400, "Unsupported preference version.");
  if (!Number.isSafeInteger(body.cursor) || body.cursor < 0)
    throw new ApiError(400, "Invalid sync cursor.");
  let changes = [];
  if (body.mutations !== undefined) {
    try {
      changes = validateMutations(body.mutations, now);
    } catch {
      throw new ApiError(
        400,
        "Invalid library metadata or change clock. Publisher bodies and images cannot be synced.",
      );
    }
  }
  if (changes.length) {
    if (
      !Number.isSafeInteger(body.sequence) ||
      body.sequence < 1 ||
      !uuid(body.batchId)
    )
      throw new ApiError(400, "Invalid sync batch.");
    if (body.sequence === auth.last_seq && body.batchId === auth.last_batch) {
      /* Retry of the same committed batch. */
    } else {
      if (body.sequence !== auth.last_seq + 1)
        throw new ApiError(
          409,
          "Sync changed in another tab. Retry with the latest device sequence.",
        );
      const statements = [
        db
          .prepare("UPDATE sync_budget SET operations=operations+? WHERE key=?")
          .bind(changes.length, day),
        db
          .prepare(
            "UPDATE sync_profiles SET revision=revision+1 WHERE id=? AND EXISTS(SELECT 1 FROM sync_devices WHERE id=? AND active=1 AND last_seq=? AND expires_at>?) RETURNING revision",
          )
          .bind(auth.profile_id, auth.device_id, body.sequence - 1, now),
        ...changes.map((m) =>
          db
            .prepare(
              `INSERT INTO sync_records(profile_id,record_key,value,deleted,changed_at,writer,base_revision,revision)
      SELECT p.id,?,?,?,?,?,?,p.revision FROM sync_profiles p JOIN sync_devices d ON d.profile_id=p.id
      WHERE p.id=? AND d.id=? AND d.active=1 AND d.last_seq=? AND d.expires_at>?
      ON CONFLICT(profile_id,record_key) DO UPDATE SET value=excluded.value,deleted=excluded.deleted,changed_at=excluded.changed_at,writer=excluded.writer,base_revision=excluded.base_revision,revision=excluded.revision
      WHERE (excluded.changed_at>sync_records.changed_at OR (excluded.changed_at=sync_records.changed_at AND (excluded.deleted>sync_records.deleted OR (excluded.deleted=sync_records.deleted AND excluded.writer>sync_records.writer))))
      AND NOT(sync_records.deleted=1 AND excluded.deleted=0 AND excluded.base_revision<sync_records.revision)`,
            )
            .bind(
              m.key,
              m.value === null ? null : JSON.stringify(m.value),
              m.value === null ? 1 : 0,
              m.changedAt,
              auth.device_id,
              m.baseRevision,
              auth.profile_id,
              auth.device_id,
              body.sequence - 1,
              now,
            ),
        ),
        db
          .prepare(
            "UPDATE sync_devices SET last_seq=?,last_batch=?,last_seen=? WHERE id=? AND active=1 AND last_seq=? AND expires_at>?",
          )
          .bind(
            body.sequence,
            body.batchId,
            now,
            auth.device_id,
            body.sequence - 1,
            now,
          ),
      ];
      const results = await db.batch(statements);
      if (!results[1].meta.changes)
        throw new ApiError(
          409,
          "This device changed while syncing. Retry safely.",
        );
    }
  }
  const device = await db
    .prepare(
      "SELECT d.last_seq,d.last_batch,p.revision FROM sync_devices d JOIN sync_profiles p ON p.id=d.profile_id WHERE d.id=? AND d.profile_id=? AND d.active=1 AND d.expires_at>?",
    )
    .bind(auth.device_id, auth.profile_id, now)
    .first();
  if (!device) throw new ApiError(401, "This device was disconnected.");
  const reset = body.cursor > device.revision;
  const rows = await db
    .prepare(
      "SELECT record_key,value,changed_at,writer,base_revision,revision FROM sync_records WHERE profile_id=? AND revision>? ORDER BY revision,record_key LIMIT 5000",
    )
    .bind(auth.profile_id, reset ? 0 : body.cursor)
    .all();
  return {
    profileId: auth.profile_id,
    deviceId: auth.device_id,
    revision: device.revision,
    sequence: device.last_seq,
    batchId: device.last_batch,
    reset,
    now,
    // Older open tabs must not receive preference keys they cannot decode.
    records: rows.results
      .filter(
        (r) =>
          body.preferenceVersion === 2 ||
          !["setting:country", "setting:newsSort"].includes(r.record_key),
      )
      .map((r) => ({
        key: r.record_key,
        value: r.value === null ? null : JSON.parse(r.value),
        changedAt: r.changed_at,
        writer: r.writer,
        baseRevision: r.base_revision,
        revision: r.revision,
      })),
  };
}
export function createSyncHandler({ now: clock = Date.now } = {}) {
  return async function onRequest({ request, env }) {
    const now = clock(),
      url = new URL(request.url);
    if (request.method !== "POST")
      return json({ error: "Sync requires POST." }, 405);
    if (
      !(url.hostname === "fylogia.com" && url.protocol === "https:") &&
      !localHost(url)
    )
      return json(
        {
          error:
            "Cloud sync is available only at fylogia.com. Preview sites cannot access private libraries.",
        },
        503,
      );
    if (request.headers.get("Origin") !== url.origin)
      return json({ error: "Cross-origin sync is not allowed." }, 403);
    const db = env.FYLOGIA_SYNC_DB;
    if (!db)
      return json(
        {
          error:
            "Cloud sync is not configured. Local reading remains available.",
        },
        503,
      );
    try {
      const body = await readBody(request),
        action = body.action;
      if (typeof action !== "string" || !actions.has(action))
        throw new ApiError(400, "Unknown sync action.");
      const fields = {
        create: ["label"],
        join: ["label", "code"],
        recover: ["label", "recoveryKey"],
        approve: ["requestId"],
        reject: ["requestId"],
        exchange: [
          "cursor",
          "sequence",
          "batchId",
          "mutations",
          "preferenceVersion",
        ],
        revoke: ["deviceId"],
        delete: ["confirm"],
      };
      if (
        Object.keys(body).some(
          (k) =>
            k !== "action" &&
            !(
              k === "expectedProfileId" &&
              ![
                "availability",
                "create",
                "join",
                "pending",
                "recover",
                "recover-confirm",
              ].includes(action)
            ) &&
            !(fields[action] || []).includes(k),
        )
      )
        throw new ApiError(
          400,
          "Unsupported request field. Publisher content cannot be uploaded.",
        );
      // A single global allowance and short-lived salted IP buckets protect the free tier.
      const day = await admission(db, request, url, now, action);
      if (action === "availability") {
        await db
          .prepare("SELECT bytes FROM sync_budget WHERE key='storage'")
          .first();
        return json({ available: true, now });
      }
      if (action === "create") {
        try {
          const current = await authenticate(db, request, url, now);
          return json({
            profileId: current.profile_id,
            deviceId: current.device_id,
            resumed: true,
            now,
          });
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401) throw error;
        }
        const r = await createProfile(db, body, url, now);
        return json(r.data, 201, r.cookies);
      }
      if (action === "join") {
        const r = await requestPair(db, body, request, url, now);
        return json(r.data, 202, r.cookies);
      }
      if (action === "pending") {
        const r = await pendingPair(db, request, url, now);
        return json(r.data, 200, r.cookies);
      }
      if (action === "recover") {
        const r = await recoverProfile(db, body, url, now);
        return json(r.data, 200, r.cookies);
      }
      if (action === "recover-confirm") {
        const r = await confirmRecovery(db, request, url, now);
        return json(r.data, 200, r.cookies);
      }
      const auth = await authenticate(db, request, url, now);
      // This is an identity-change guard, never an authorization selector.
      // A cookie changed by another tab must not receive the old library's data.
      if (
        (action !== "status" || body.expectedProfileId !== undefined) &&
        body.expectedProfileId !== auth.profile_id
      )
        throw new ApiError(
          409,
          "The connected library changed in another tab. Reconnect before syncing.",
        );
      if (action === "status")
        return json({
          profileId: auth.profile_id,
          deviceId: auth.device_id,
          label: auth.label,
          sequence: auth.last_seq,
          revision: auth.revision,
          now,
        });
      if (action === "pair") return json(await createPair(db, auth, now));
      if (action === "requests") return json(await pairRequests(db, auth, now));
      if (action === "approve")
        return json(await approvePair(db, auth, body, now));
      if (action === "reject") return json(await rejectPair(db, auth, body));
      if (action === "exchange")
        return json(await exchange(db, auth, body, day, now));
      if (action === "devices") {
        const rows = await db
          .prepare(
            "SELECT id,label,created_at AS createdAt,last_seen AS lastSeen FROM sync_devices WHERE profile_id=? AND active=1 AND expires_at>? ORDER BY created_at",
          )
          .bind(auth.profile_id, now)
          .all();
        return json({
          devices: rows.results.map((d) => ({
            ...d,
            current: d.id === auth.device_id,
          })),
        });
      }
      if (action === "revoke") {
        if (!uuid(body.deviceId)) throw new ApiError(400, "Invalid device.");
        await db
          .prepare("DELETE FROM sync_devices WHERE id=? AND profile_id=?")
          .bind(body.deviceId, auth.profile_id)
          .run();
        return json(
          { ok: true },
          200,
          body.deviceId === auth.device_id
            ? [cookie(url, "", false, true), cookie(url, "", true, true)]
            : [],
        );
      }
      if (action === "rotate-recovery") {
        const recoveryKey = secret();
        await db
          .prepare("UPDATE sync_profiles SET recovery_hash=? WHERE id=?")
          .bind(await hash(recoveryKey), auth.profile_id)
          .run();
        return json({ recoveryKey });
      }
      if (action === "delete") {
        if (body.confirm !== "DELETE")
          throw new ApiError(400, "Confirm cloud-library deletion.");
        await db
          .prepare(
            "DELETE FROM sync_profiles WHERE id=? AND EXISTS(SELECT 1 FROM sync_devices WHERE id=? AND active=1)",
          )
          .bind(auth.profile_id, auth.device_id)
          .run();
        return json({ ok: true }, 200, [
          cookie(url, "", false, true),
          cookie(url, "", true, true),
        ]);
      }
      throw new ApiError(400, "Unknown sync action.");
    } catch (error) {
      if (error instanceof ApiError)
        return json({ error: error.message }, error.status);
      if (/CHECK constraint failed/i.test(error?.message || ""))
        return json(
          {
            error:
              "The free sync storage or daily change allowance is full. Your local library and queued changes remain safe.",
          },
          429,
        );
      return json(
        {
          error:
            "Cloud sync is temporarily unavailable. Reading and local changes remain available.",
        },
        503,
      );
    }
  };
}
export const onRequest = createSyncHandler();
