import { libraryKeys, type LibraryData } from "./library-data";
import {
  getLibraryValue,
  getLibraryChangeOrigin,
  setLibraryValue,
  snapshotLibrary,
  subscribeLibrary,
} from "./local-library";
import {
  projectLibrary,
  materializeLibrary,
  initialMerge,
  sameValue,
  type Projection,
} from "./sync-library";
import {
  type SyncRecord,
  type SyncMutation,
  validateSyncValue,
} from "./sync-protocol";
import {
  freshSync,
  exchangeCursor,
  readSync,
  writeSync,
  syncLock,
  backupBeforeSync,
} from "./sync-store";
export { latestSyncBackup } from "./sync-store";
export interface CloudStatus {
  connected: boolean;
  pending: number;
  busy: boolean;
  error: string;
  lastSync: number;
  profileId: string;
  deviceId: string;
}
let status: CloudStatus = {
  connected: false,
  pending: 0,
  busy: false,
  error: "",
  lastSync: 0,
  profileId: "",
  deviceId: "",
};
const listeners = new Set<() => void>();
export const subscribeCloud = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const getCloudStatus = () => status;
const update = (patch: Partial<CloudStatus>) => {
  status = { ...status, ...patch };
  listeners.forEach((fn) => fn());
};
class CloudError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}
export async function cloudRequest<T = any>(
  action: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(import.meta.env.BASE_URL + "api/sync", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    const data = await res.json();
    if (!res.ok)
      throw new CloudError(
        data.error || "Sync is temporarily unavailable.",
        res.status,
      );
    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}
export async function privateRequest<T = any>(
  action: string,
  body: Record<string, unknown> = {},
) {
  const state = await readSync();
  if (!state.profileId || state.profileId !== status.profileId)
    throw new Error(
      "The connected library changed in another tab. Reopen sync settings before managing devices.",
    );
  return cloudRequest<T>(action, {
    ...body,
    expectedProfileId: state.profileId,
  });
}
let lastLibrary: LibraryData | undefined;
let baseline: Projection | undefined,
  suppress = false,
  started = false,
  observedCursor = 0,
  offset = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let observation: Promise<void> = Promise.resolve();
const library = () =>
  Object.fromEntries(
    libraryKeys.map((key) => [key, getLibraryValue(key, undefined)]),
  ) as unknown as LibraryData;
const intents = new Map<string, SyncMutation>();
const journalKey = "fylogia.sync.pending." + crypto.randomUUID();
function saveJournal() {
  if (intents.size)
    localStorage.setItem(
      journalKey,
      JSON.stringify({
        profileId: status.profileId,
        mutations: [...intents.values()],
      }),
    );
  else localStorage.removeItem(journalKey);
}
function apply(records: SyncRecord[], pending: SyncMutation[]) {
  const values = new Map(records.map((r) => [r.key, r.value])),
    clocks = new Map(records.map((r) => [r.key, r.changedAt]));
  for (const p of [...pending, ...intents.values()]) {
    values.set(p.key, p.value);
    clocks.set(p.key, p.changedAt);
  }
  const next = materializeLibrary(values, library(), clocks);
  suppress = true;
  try {
    for (const key of libraryKeys)
      if (!sameValue(next[key], getLibraryValue(key, undefined)))
        setLibraryValue(key, next[key], "cloud");
  } finally {
    lastLibrary = library();
    baseline = projectLibrary(lastLibrary);
    suppress = false;
  }
}
function observe() {
  if (suppress || !baseline || !status.connected) return;
  try {
    const current = library();
    if (
      lastLibrary &&
      libraryKeys.every((key) => current[key] === lastLibrary![key])
    )
      return;
    const origin = getLibraryChangeOrigin();
    const historyChanged = current.history !== lastLibrary?.history;
    lastLibrary = current;
    const next = projectLibrary(current),
      before = baseline;
    baseline = next;
    if (origin === "cloud") return;
    const changed = [...new Set([...before.keys(), ...next.keys()])].filter(
      (key) => !sameValue(before.get(key), next.get(key)),
    );
    // Revisiting a story updates history ordering even if its bibliographic metadata is unchanged.
    const first = library().history[0]?.id;
    if (
      origin === "local" &&
      first &&
      historyChanged &&
      next.has("history:" + first)
    )
      changed.push("history:" + first);
    if (!changed.length) return;
    const now = Date.now() + offset,
      baseRevision = observedCursor;
    const mutations = [...new Set(changed)].map((key) => ({
      key,
      value: next.get(key) ?? null,
      changedAt: now,
      baseRevision,
      opId: crypto.randomUUID(),
    }));
    for (const m of mutations) intents.set(m.key, m);
    // Synchronous metadata-only journal protects a tab closed before IndexedDB completes.
    try {
      saveJournal();
    } catch {
      /* IndexedDB below remains authoritative when localStorage is full. */
    }
    observation = observation
      .then(() =>
        syncLock(async () => {
          const state = await readSync();
          if (!state.enabled || state.profileId !== status.profileId) return;
          const queued = new Map(state.pending.map((m) => [m.key, m]));
          for (const m of mutations) {
            // A real edit in another tab already has an original intent in the
            // shared queue/journal. Never stamp echoed remote values as new edits.
            const known =
              queued.get(m.key) || state.records.find((r) => r.key === m.key);
            if (
              origin === "storage" &&
              known &&
              sameValue(known.value, m.value)
            )
              continue;
            queued.set(m.key, m);
          }
          state.pending = [...queued.values()];
          await writeSync(state);
          for (const m of mutations)
            if (intents.get(m.key)?.opId === m.opId) intents.delete(m.key);
          try {
            saveJournal();
          } catch {
            /* Queued changes are already durable in IndexedDB. */
          }
          update({ pending: state.pending.length });
        }),
      )
      .catch(failure);
    schedule();
  } catch (e) {
    failure(e);
  }
}
function schedule(delay = 1800) {
  clearTimeout(timer);
  timer = setTimeout(() => void synchronize(), delay);
}
function failure(e: unknown) {
  const error =
    e instanceof Error
      ? e.message
      : "Sync could not save changes. Keep this tab open and export your library.";
  update({
    error: navigator.onLine
      ? error
      : "Offline — changes will sync after reconnection.",
    busy: false,
  });
}
interface Exchange {
  profileId: string;
  deviceId: string;
  revision: number;
  sequence: number;
  now: number;
  records: SyncRecord[];
  reset: boolean;
}
function checkedRecords(records: SyncRecord[]) {
  return records.map((r) => ({
    ...r,
    value: validateSyncValue(r.key, r.value),
  }));
}
export async function synchronize() {
  await observation;
  if (!status.connected || status.busy) return;
  if (!navigator.onLine) {
    failure(new Error("Offline"));
    return;
  }
  update({ busy: true });
  try {
    await syncLock(async () => {
      const state = await readSync();
      if (!state.enabled) {
        update({ connected: false });
        return;
      }
      if (state.profileId !== status.profileId)
        throw new Error(
          "The connected library changed in another tab. Reopen sync settings.",
        );
      if (!state.flight && state.pending.length) {
        let size = 0;
        const mutations = state.pending
          .slice(0, 10)
          .filter(
            (m) =>
              (size += new TextEncoder().encode(JSON.stringify(m)).length) <
              120000,
          );
        if (!mutations.length)
          throw new Error(
            "A library item exceeds the sync size limit. Export your library to keep a backup.",
          );
        state.flight = {
          sequence: state.sequence + 1,
          batchId: crypto.randomUUID(),
          mutations,
        };
        await writeSync(state);
      }
      let result: Exchange;
      try {
        result = await cloudRequest<Exchange>("exchange", {
          preferenceVersion: 2,
          expectedProfileId: state.profileId,
          cursor: exchangeCursor(state),
          ...(state.flight || {}),
        });
      } catch (e) {
        if (e instanceof CloudError && e.code === 409) {
          const current = await cloudRequest<{ sequence: number }>("status", {
            expectedProfileId: state.profileId,
          });
          state.sequence = current.sequence;
          state.flight = undefined;
          await writeSync(state);
        }
        if (e instanceof CloudError && e.code === 401) {
          state.enabled = false;
          await writeSync(state);
          update({ connected: false });
        }
        throw e;
      }
      if (result.profileId !== state.profileId)
        throw new Error("The connected library changed. Sync has stopped.");
      const records = new Map(
        (result.reset ? [] : state.records).map((r) => [r.key, r]),
      );
      for (const r of checkedRecords(result.records)) records.set(r.key, r);
      if (state.flight) {
        const acknowledged = new Map(
          state.flight.mutations.map((m) => [m.key, m.opId]),
        );
        state.pending = state.pending.filter(
          (m) => acknowledged.get(m.key) !== m.opId,
        );
      }
      state.records = [...records.values()];
      state.flight = undefined;
      state.cursor = result.revision;
      state.preferenceCursor = result.revision;
      state.sequence = result.sequence;
      state.offset = result.now - Date.now();
      state.lastSync = Date.now();
      await writeSync(state);
      observedCursor = state.cursor;
      offset = state.offset;
      apply(state.records, state.pending);
      update({
        pending: state.pending.length,
        lastSync: state.lastSync,
        error: "",
      });
      if (state.pending.length) schedule(500);
    });
  } catch (e) {
    failure(e);
  } finally {
    update({ busy: false });
  }
}
/** A merge always leaves a durable, device-local backup before changing the library. */
export async function connectCloud(identity: {
  profileId: string;
  deviceId: string;
}) {
  await observation;
  await syncLock(async () => {
    const original = snapshotLibrary();
    await backupBeforeSync(original);
    const remote = await cloudRequest<Exchange>("exchange", {
      preferenceVersion: 2,
      expectedProfileId: identity.profileId,
      cursor: 0,
    });
    if (remote.profileId !== identity.profileId)
      throw new Error("The connected library changed before linking.");
    const records = checkedRecords(remote.records),
      merged = initialMerge(
        projectLibrary(original),
        records,
        original.preferences,
      );
    const existing = new Map(records.map((r) => [r.key, r.value])),
      now = remote.now;
    const pending: SyncMutation[] = [];
    for (const [key, value] of merged)
      if (!sameValue(value, existing.get(key)))
        pending.push({
          key,
          value,
          changedAt:
            now -
            (key.startsWith("history:")
              ? Math.max(
                  0,
                  original.history.findIndex((a) => key === "history:" + a.id),
                )
              : 0),
          baseRevision: remote.revision,
          opId: crypto.randomUUID(),
        });
    const state = {
      ...freshSync(),
      ...identity,
      records,
      pending,
      cursor: remote.revision,
      preferenceCursor: remote.revision,
      sequence: remote.sequence,
      offset: remote.now - Date.now(),
      enabled: true,
    };
    await writeSync(state);
    intents.clear();
    try {
      saveJournal();
    } catch {}
    observedCursor = state.cursor;
    offset = state.offset;
    apply(records, pending);
    update({
      connected: true,
      profileId: identity.profileId,
      deviceId: identity.deviceId,
      pending: pending.length,
      error: "",
    });
  });
  schedule(100);
}
export async function disconnectCloud(deleteAll = false) {
  await observation;
  await syncLock(async () => {
    const state = await readSync();
    if (state.profileId !== status.profileId)
      throw new Error(
        "The connected library changed in another tab. Reopen sync settings before disconnecting.",
      );
    if (deleteAll)
      await cloudRequest("delete", {
        expectedProfileId: state.profileId,
        confirm: "DELETE",
      });
    else
      await cloudRequest("revoke", {
        expectedProfileId: state.profileId,
        deviceId: state.deviceId,
      });
    await writeSync(freshSync());
    intents.clear();
    try {
      saveJournal();
    } catch {}
    baseline = projectLibrary(library());
    update({
      connected: false,
      pending: 0,
      profileId: "",
      deviceId: "",
      lastSync: 0,
      error: "",
    });
  });
}
export async function initializeCloudSync() {
  if (started) return;
  started = true;
  try {
    const state = await syncLock(async () => {
      const current = await readSync();
      if (current.enabled) {
        const pending = new Map(current.pending.map((m) => [m.key, m]));
        const keys = Object.keys(localStorage).filter((k) =>
          k.startsWith("fylogia.sync.pending."),
        );
        const consumed = new Map<string, string>();
        for (const key of keys) {
          const raw = localStorage.getItem(key) || "null";
          const journal = JSON.parse(raw);
          if (
            journal?.profileId !== current.profileId ||
            !Array.isArray(journal.mutations)
          )
            continue;
          consumed.set(key, raw);
          for (const m of journal.mutations as SyncMutation[]) {
            validateSyncValue(m.key, m.value);
            if (
              !pending.has(m.key) ||
              pending.get(m.key)!.changedAt <= m.changedAt
            )
              pending.set(m.key, m);
          }
        }
        current.pending = [...pending.values()];
        await writeSync(current);
        for (const [key, raw] of consumed)
          if (localStorage.getItem(key) === raw) localStorage.removeItem(key);
      }
      return current;
    });
    observedCursor = state.cursor;
    offset = state.offset;
    lastLibrary = library();
    baseline = projectLibrary(lastLibrary);
    update({
      connected: state.enabled,
      pending: state.pending.length,
      profileId: state.profileId,
      deviceId: state.deviceId,
      lastSync: state.lastSync,
    });
    subscribeLibrary(observe);
    window.addEventListener("online", () => {
      if (status.connected) schedule(100);
    });
    window.addEventListener("offline", () => {
      if (status.connected) failure(new Error("Offline"));
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && status.connected) schedule(100);
    });
    setInterval(() => {
      if (!document.hidden && status.connected && navigator.onLine)
        schedule(100);
    }, 60000);
    if (state.enabled) schedule(100);
  } catch (e) {
    failure(e);
  }
}
