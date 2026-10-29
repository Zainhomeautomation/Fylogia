import {
  ApiError,
  PAIR_TTL,
  YEAR,
  uid,
  secret,
  hash,
  cookie,
  readCookie,
  label,
  authenticate,
} from "./sync-security.mjs";
const uuid = (v) => typeof v === "string" && /^[0-9a-f-]{36}$/.test(v);
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const pairingCode = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(10)),
    (b) => alphabet[b % 32],
  ).join("");
export async function createProfile(db, body, url, now) {
  const id = uid(),
    deviceId = uid(),
    token = secret(),
    recoveryKey = secret(),
    name = label(body.label);
  const result = await db.batch([
    db
      .prepare(
        "INSERT INTO sync_profiles(id,recovery_hash,created_at) SELECT ?,?,? WHERE (SELECT COUNT(*) FROM sync_profiles)<1000",
      )
      .bind(id, await hash(recoveryKey), now),
    db
      .prepare(
        "INSERT INTO sync_devices(id,profile_id,secret_hash,label,created_at,last_seen,expires_at) SELECT ?,id,?,?,?,?,? FROM sync_profiles WHERE id=?",
      )
      .bind(deviceId, await hash(token), name, now, now, now + YEAR, id),
  ]);
  if (!result[0].meta.changes)
    throw new ApiError(
      429,
      "The free sync service is at capacity. Your local library remains available.",
    );
  return {
    data: { profileId: id, deviceId, recoveryKey, now },
    cookies: [cookie(url, token)],
  };
}
export async function createPair(db, auth, now) {
  await db.batch([
    db
      .prepare(
        "DELETE FROM sync_pairings WHERE creator_id=? OR (profile_id=? AND expires_at<=?)",
      )
      .bind(auth.device_id, auth.profile_id, now),
    db
      .prepare(
        "DELETE FROM sync_devices WHERE profile_id=? AND active=0 AND expires_at<=?",
      )
      .bind(auth.profile_id, now),
    db.prepare("DELETE FROM sync_rate WHERE expires_at<?").bind(now - 86400000),
  ]);
  const code = pairingCode(),
    id = uid();
  await db
    .prepare(
      "INSERT INTO sync_pairings(id,profile_id,creator_id,code_hash,expires_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sync_devices WHERE id=? AND active=1 AND expires_at>?)",
    )
    .bind(
      id,
      auth.profile_id,
      auth.device_id,
      await hash(code),
      now + PAIR_TTL,
      auth.device_id,
      now,
    )
    .run();
  return {
    id,
    code: code.slice(0, 5) + "-" + code.slice(5),
    expiresAt: now + PAIR_TTL,
  };
}
export async function requestPair(db, body, request, url, now) {
  if (readCookie(request, url)) {
    try {
      await authenticate(db, request, url, now);
      throw new ApiError(
        409,
        "Disconnect this device before linking another library.",
      );
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
    }
  }
  const code =
    typeof body.code === "string"
      ? body.code.toUpperCase().replaceAll("-", "").replaceAll(" ", "")
      : "";
  if (code.length !== 10 || [...code].some((c) => !alphabet.includes(c)))
    throw new ApiError(400, "Enter the ten-character pairing code.");
  const pair = await db
    .prepare(
      "SELECT id,expires_at FROM sync_pairings WHERE code_hash=? AND used_at IS NULL AND expires_at>?",
    )
    .bind(await hash(code), now)
    .first();
  if (!pair)
    throw new ApiError(
      410,
      "This pairing code expired or has already been used.",
    );
  const id = uid(),
    token = secret(),
    challenge = String(
      crypto.getRandomValues(new Uint32Array(1))[0] % 1000000,
    ).padStart(6, "0");
  const inserted = await db
    .prepare(
      `INSERT INTO sync_pair_requests(id,pair_id,secret_hash,label,challenge,expires_at)
    SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM sync_pairings WHERE id=? AND used_at IS NULL AND expires_at>?)
    AND (SELECT COUNT(*) FROM sync_pair_requests WHERE pair_id=? AND redeemed_at IS NULL AND expires_at>?)<3`,
    )
    .bind(
      id,
      pair.id,
      await hash(token),
      label(body.label),
      challenge,
      pair.expires_at,
      pair.id,
      now,
      pair.id,
      now,
    )
    .run();
  if (!inserted.meta.changes)
    throw new ApiError(
      429,
      "This code is no longer accepting requests. Ask the original device for a new code.",
    );
  return {
    data: { challenge, expiresAt: pair.expires_at },
    cookies: [cookie(url, "", false, true), cookie(url, token, true)],
  };
}
export async function pendingPair(db, request, url, now) {
  const token = readCookie(request, url, true);
  if (!token) throw new ApiError(410, "The pairing request expired.");
  const pending = await db
    .prepare(
      "SELECT r.id,r.expires_at,r.approved_device_id,r.redeemed_at,p.used_at,p.profile_id FROM sync_pair_requests r JOIN sync_pairings p ON p.id=r.pair_id WHERE r.secret_hash=?",
    )
    .bind(await hash(token))
    .first();
  if (!pending || pending.expires_at <= now)
    throw new ApiError(410, "The pairing request expired.");
  if (!pending.approved_device_id) {
    if (pending.used_at)
      throw new ApiError(
        410,
        "This code connected another device. Ask for a new code.",
      );
    return { data: { approved: false, expiresAt: pending.expires_at } };
  }
  // The code is consumed once. Retrying this same authenticated handshake only
  // restores the same device cookie if a successful response was interrupted.
  if (!pending.redeemed_at)
    await db.batch([
      db
        .prepare(
          "UPDATE sync_devices SET active=1,expires_at=? WHERE id=? AND profile_id=? AND active=0 AND expires_at>?",
        )
        .bind(now + YEAR, pending.approved_device_id, pending.profile_id, now),
      db
        .prepare(
          "UPDATE sync_pair_requests SET redeemed_at=? WHERE id=? AND EXISTS(SELECT 1 FROM sync_devices WHERE id=? AND active=1)",
        )
        .bind(now, pending.id, pending.approved_device_id),
    ]);
  const active = await db
    .prepare(
      "SELECT id FROM sync_devices WHERE id=? AND profile_id=? AND secret_hash=? AND active=1 AND expires_at>?",
    )
    .bind(
      pending.approved_device_id,
      pending.profile_id,
      await hash(token),
      now,
    )
    .first();
  if (!active)
    throw new ApiError(410, "This device approval is no longer available.");
  return {
    data: {
      approved: true,
      profileId: pending.profile_id,
      deviceId: active.id,
      now,
    },
    cookies: [cookie(url, token), cookie(url, "", true, true)],
  };
}
export async function pairRequests(db, auth, now) {
  const rows = await db
    .prepare(
      "SELECT r.id,r.label,r.challenge,r.expires_at AS expiresAt,r.approved_device_id AS approvedDeviceId FROM sync_pair_requests r JOIN sync_pairings p ON p.id=r.pair_id WHERE p.creator_id=? AND p.profile_id=? AND p.expires_at>? AND r.redeemed_at IS NULL ORDER BY r.expires_at DESC LIMIT 6",
    )
    .bind(auth.device_id, auth.profile_id, now)
    .all();
  return { requests: rows.results };
}
export async function approvePair(db, auth, body, now) {
  if (!uuid(body.requestId))
    throw new ApiError(400, "Invalid pairing request.");
  const item = await db
    .prepare(
      "SELECT r.id,r.approved_device_id,p.used_at FROM sync_pair_requests r JOIN sync_pairings p ON p.id=r.pair_id WHERE r.id=? AND p.creator_id=? AND p.profile_id=? AND p.expires_at>? AND r.expires_at>?",
    )
    .bind(body.requestId, auth.device_id, auth.profile_id, now, now)
    .first();
  if (!item) throw new ApiError(410, "This pairing request expired.");
  if (item.approved_device_id) return { approved: true };
  if (item.used_at)
    throw new ApiError(410, "This code has already connected another device.");
  const result = await db.batch([
    db
      .prepare(
        `INSERT INTO sync_devices(id,profile_id,secret_hash,label,active,created_at,last_seen,expires_at)
   SELECT r.id,p.profile_id,r.secret_hash,r.label,0,?,?,r.expires_at FROM sync_pair_requests r JOIN sync_pairings p ON p.id=r.pair_id
   WHERE r.id=? AND p.creator_id=? AND p.profile_id=? AND p.used_at IS NULL AND p.expires_at>? AND r.expires_at>?
   AND EXISTS(SELECT 1 FROM sync_devices WHERE id=? AND active=1 AND expires_at>?)
   AND (SELECT COUNT(*) FROM sync_devices WHERE profile_id=p.profile_id)<20`,
      )
      .bind(
        now,
        now,
        item.id,
        auth.device_id,
        auth.profile_id,
        now,
        now,
        auth.device_id,
        now,
      ),
    db
      .prepare(
        "UPDATE sync_pairings SET used_at=? WHERE id=(SELECT pair_id FROM sync_pair_requests WHERE id=?) AND EXISTS(SELECT 1 FROM sync_devices WHERE id=?)",
      )
      .bind(now, item.id, item.id),
    db
      .prepare(
        "UPDATE sync_pair_requests SET approved_device_id=? WHERE id=? AND EXISTS(SELECT 1 FROM sync_devices WHERE id=?)",
      )
      .bind(item.id, item.id, item.id),
  ]);
  if (!result[0].meta.changes)
    throw new ApiError(
      409,
      "The code was used or this device was disconnected.",
    );
  return { approved: true };
}
export async function rejectPair(db, auth, body) {
  if (!uuid(body.requestId))
    throw new ApiError(400, "Invalid pairing request.");
  await db.batch([
    db
      .prepare(
        "DELETE FROM sync_devices WHERE profile_id=? AND id IN(SELECT r.approved_device_id FROM sync_pair_requests r JOIN sync_pairings p ON p.id=r.pair_id WHERE r.id=? AND p.creator_id=? AND p.profile_id=?)",
      )
      .bind(auth.profile_id, body.requestId, auth.device_id, auth.profile_id),
    db
      .prepare(
        "DELETE FROM sync_pair_requests WHERE id=? AND pair_id IN(SELECT id FROM sync_pairings WHERE creator_id=? AND profile_id=?)",
      )
      .bind(body.requestId, auth.device_id, auth.profile_id),
  ]);
  return { ok: true };
}
export async function recoverProfile(db, body, url, now) {
  if (
    typeof body.recoveryKey !== "string" ||
    !/^[A-Za-z0-9_-]{43}$/.test(body.recoveryKey)
  )
    throw new ApiError(403, "Check your recovery key.");
  const oldHash = await hash(body.recoveryKey),
    profile = await db
      .prepare("SELECT id FROM sync_profiles WHERE recovery_hash=?")
      .bind(oldHash)
      .first();
  if (!profile) throw new ApiError(403, "Check your recovery key.");
  const recoveryKey = secret(),
    token = secret(),
    deviceId = uid();
  await db
    .prepare(
      `INSERT INTO sync_recoveries(profile_id,token_hash,old_hash,new_hash,device_id,label,expires_at)
    SELECT id,?,?,?,?,?,? FROM sync_profiles WHERE id=? AND recovery_hash=?
    ON CONFLICT(profile_id) DO UPDATE SET token_hash=excluded.token_hash,old_hash=excluded.old_hash,new_hash=excluded.new_hash,device_id=excluded.device_id,label=excluded.label,expires_at=excluded.expires_at,confirmation_id='',confirmed_at=NULL`,
    )
    .bind(
      await hash(token),
      oldHash,
      await hash(recoveryKey),
      deviceId,
      label(body.label),
      now + PAIR_TTL,
      profile.id,
      oldHash,
    )
    .run();
  return {
    data: {
      recoveryKey,
      requiresConfirmation: true,
      expiresAt: now + PAIR_TTL,
      now,
    },
    cookies: [cookie(url, token, true)],
  };
}
export async function confirmRecovery(db, request, url, now) {
  const token = readCookie(request, url, true);
  if (!token)
    throw new ApiError(
      410,
      "Recovery confirmation expired. Start again with your saved recovery key.",
    );
  const tokenHash = await hash(token);
  const pending = await db
    .prepare(
      "SELECT * FROM sync_recoveries WHERE token_hash=? AND expires_at>?",
    )
    .bind(tokenHash, now)
    .first();
  if (!pending)
    throw new ApiError(
      410,
      "Recovery confirmation expired. Start again with your saved recovery key.",
    );
  if (!pending.confirmed_at) {
    const confirmation = uid();
    await db.batch([
      db
        .prepare(
          "UPDATE sync_recoveries SET confirmation_id=? WHERE token_hash=? AND confirmed_at IS NULL AND confirmation_id='' AND expires_at>? AND EXISTS(SELECT 1 FROM sync_profiles WHERE id=? AND recovery_hash=?)",
        )
        .bind(
          confirmation,
          tokenHash,
          now,
          pending.profile_id,
          pending.old_hash,
        ),
      db
        .prepare(
          "UPDATE sync_profiles SET recovery_hash=? WHERE id=? AND recovery_hash=? AND EXISTS(SELECT 1 FROM sync_recoveries WHERE token_hash=? AND confirmation_id=?)",
        )
        .bind(
          pending.new_hash,
          pending.profile_id,
          pending.old_hash,
          tokenHash,
          confirmation,
        ),
      db
        .prepare(
          "DELETE FROM sync_devices WHERE profile_id=? AND EXISTS(SELECT 1 FROM sync_recoveries WHERE token_hash=? AND confirmation_id=?) AND EXISTS(SELECT 1 FROM sync_profiles WHERE id=? AND recovery_hash=?)",
        )
        .bind(
          pending.profile_id,
          tokenHash,
          confirmation,
          pending.profile_id,
          pending.new_hash,
        ),
      db
        .prepare(
          "INSERT INTO sync_devices(id,profile_id,secret_hash,label,created_at,last_seen,expires_at) SELECT ?,profile_id,token_hash,label,?,?,? FROM sync_recoveries WHERE token_hash=? AND confirmation_id=? AND EXISTS(SELECT 1 FROM sync_profiles WHERE id=? AND recovery_hash=?)",
        )
        .bind(
          pending.device_id,
          now,
          now,
          now + YEAR,
          tokenHash,
          confirmation,
          pending.profile_id,
          pending.new_hash,
        ),
      db
        .prepare(
          "UPDATE sync_recoveries SET confirmed_at=? WHERE token_hash=? AND confirmation_id=? AND EXISTS(SELECT 1 FROM sync_devices WHERE id=? AND active=1)",
        )
        .bind(now, tokenHash, confirmation, pending.device_id),
    ]);
  }
  const device = await db
    .prepare(
      "SELECT id FROM sync_devices WHERE id=? AND profile_id=? AND secret_hash=? AND active=1 AND expires_at>?",
    )
    .bind(pending.device_id, pending.profile_id, tokenHash, now)
    .first();
  if (!device)
    throw new ApiError(
      403,
      "The recovery proof changed. Start again with your saved recovery key.",
    );
  // Keep the pending proof for its original short TTL so a lost response can
  // restore the same device cookie, never create a second identity.
  return {
    data: { profileId: pending.profile_id, deviceId: device.id, now },
    cookies: [cookie(url, token)],
  };
}
