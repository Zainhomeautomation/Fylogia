import {
  emptyLibrary,
  libraryKeys,
  normalizeLibraryValue,
  type LibraryData,
  type LibraryKey,
} from "./library-data";

export interface LocalProfile {
  id: string;
  createdAt: string;
}
interface Row {
  key: string;
  value: unknown;
  savedAt: number;
  origin?: "cloud";
}
interface PersistenceStatus {
  profile: LocalProfile | null;
  saving: boolean;
  durable: boolean;
  error: string;
  recovered: boolean;
}
const PREFIX = "folio.v1.";
const listeners = new Set<() => void>();
let data = emptyLibrary();
let status: PersistenceStatus = {
  profile: null,
  saving: false,
  durable: false,
  error: "",
  recovered: false,
};
let db: IDBDatabase | undefined;
let initialization: Promise<void> | undefined;
let pending = 0;
let restoring = false;
let clock = Date.now();
const timestamp = () => (clock = Math.max(clock + 1, Date.now()));
const failures = new Set<string>();
type ChangeOrigin = "local" | "cloud" | "storage";
let changeOrigin: ChangeOrigin = "local";
export const getLibraryChangeOrigin = () => changeOrigin;
function emit(origin: ChangeOrigin = "local") {
  const previous = changeOrigin;
  changeOrigin = origin;
  try {
    listeners.forEach((fn) => fn());
  } finally {
    changeOrigin = previous;
  }
}
function updateStatus(patch: Partial<PersistenceStatus>) {
  status = { ...status, ...patch };
  emit();
}
export const subscribeLibrary = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export const getPersistenceStatus = () => status;
export const getLibraryValue = <T>(key: string, initial: T): T =>
  key in data ? (data[key as LibraryKey] as T) : initial;
export const snapshotLibrary = () => ({ version: 1, ...structuredClone(data) });
// Non-security fingerprint: bind cloud provenance to the exact serialized value.
// Older clients know the origin key but need not know this additive sidecar.
function storageDigest(value: string) {
  let a = 2166136261,
    b = 2654435769;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    a = Math.imul(a ^ c, 16777619);
    b = Math.imul(b ^ c, 2246822519);
  }
  return (
    value.length + ":" + (a >>> 0).toString(36) + ":" + (b >>> 0).toString(36)
  );
}
function localWrite(row: Row) {
  try {
    const serialized = JSON.stringify(row.value);
    try {
      if (row.origin === "cloud")
        localStorage.setItem(
          "folio.local.digest." + row.key,
          storageDigest(serialized),
        );
      else localStorage.removeItem("folio.local.digest." + row.key);
      localStorage.setItem(
        "folio.local.origin." + row.key,
        row.origin || "local",
      );
    } catch {
      /* Provenance must not prevent saving the original primary value. */
    }
    localStorage.setItem(PREFIX + row.key, serialized);
    localStorage.setItem("folio.local.savedAt." + row.key, String(row.savedAt));
    return true;
  } catch {
    return false;
  }
}
function writeRows(rows: Row[]) {
  return new Promise<void>((resolve, reject) => {
    if (!db) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const tx = db.transaction("records", "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Save interrupted"));
    try {
      for (const row of rows) tx.objectStore("records").put(row);
    } catch (error) {
      // Synchronous clone/quota errors must also abort previously queued writes.
      tx.abort();
      reject(error);
    }
  });
}
async function persist(row: Row) {
  const local = localWrite(row);
  pending++;
  updateStatus({ saving: true });
  let indexed = false;
  try {
    await writeRows([row]);
    indexed = true;
  } catch {
    /* The synchronous copy can still succeed. */
  }
  if (local || indexed) failures.delete(row.key);
  else failures.add(row.key);
  pending--;
  updateStatus({
    saving: pending > 0,
    durable: failures.size === 0,
    error: failures.size
      ? "Changes could not be saved on this device. Keep this tab open and export your library before closing it."
      : "",
  });
}
export function setLibraryValue<T>(
  key: string,
  next: T | ((current: T) => T),
  origin?: "cloud",
) {
  if (!libraryKeys.includes(key as LibraryKey) || restoring) return;
  const current = data[key as LibraryKey] as T;
  const value =
    typeof next === "function" ? (next as (v: T) => T)(current) : next;
  if (Object.is(value, current)) return;
  data = { ...data, [key]: value };
  emit(origin);
  void persist({ key, value, savedAt: timestamp(), origin });
}
export async function replaceLocalLibrary(replacement: LibraryData) {
  if (restoring) throw new Error("A restore is already in progress.");
  restoring = true;
  updateStatus({ saving: true });
  const rows = libraryKeys.map((key) => ({
    key,
    value: replacement[key],
    savedAt: timestamp(),
  }));
  try {
    // Commit all library sections together before publishing the recovered state.
    // If IndexedDB is unavailable, keep the current library unchanged.
    try {
      await writeRows(rows);
    } catch {
      throw new Error(
        "Restore requires writable IndexedDB. Enable local storage and try again. Your library is unchanged.",
      );
    }
    data = replacement;
    for (const row of rows) {
      localWrite(row);
      failures.delete(row.key);
    }
    updateStatus({
      durable: failures.size === 0,
      error: failures.size ? status.error : "",
    });
  } finally {
    restoring = false;
    updateStatus({ saving: pending > 0 });
  }
}
function validProfile(value: unknown): value is LocalProfile {
  const p = value as LocalProfile;
  return (
    !!p &&
    typeof p.id === "string" &&
    /^[0-9a-f-]{36}$/.test(p.id) &&
    typeof p.createdAt === "string" &&
    Number.isFinite(Date.parse(p.createdAt))
  );
}
function openDatabase() {
  return new Promise<Row[]>((resolve, reject) => {
    const request = indexedDB.open("folio-personal-library", 1);
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      db?.close();
      db = undefined;
      reject(new Error("Storage timed out"));
    }, 2500);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("records", { keyPath: "key" });
    request.onerror = request.onblocked = () => {
      clearTimeout(timer);
      expired = true;
      reject(request.error || new Error("Storage blocked"));
    };
    request.onsuccess = () => {
      if (expired) {
        request.result.close();
        return;
      }
      db = request.result;
      db.onversionchange = () => {
        db?.close();
        db = undefined;
      };
      const tx = db.transaction("records", "readonly"),
        read = tx.objectStore("records").getAll();
      tx.oncomplete = () => {
        clearTimeout(timer);
        resolve(read.result);
      };
      tx.onerror = tx.onabort = () => {
        clearTimeout(timer);
        reject(tx.error);
      };
    };
  });
}
export function initializeLocalLibrary() {
  return (initialization ||= (async () => {
    let rows: Row[] = [];
    try {
      rows = await openDatabase();
    } catch {
      /* Keep the app usable with localStorage or in memory. */
    }
    let recovered = false,
      damaged = false;
    for (const key of libraryKeys) {
      let local: Row | undefined;
      try {
        const raw = localStorage.getItem(PREFIX + key);
        if (raw)
          local = {
            key,
            value: normalizeLibraryValue(key, JSON.parse(raw)),
            savedAt:
              Number(localStorage.getItem("folio.local.savedAt." + key)) ||
              Date.now(),
          };
      } catch {
        damaged = true;
      }
      const mirror = rows.find((row) => row.key === key);
      let indexed: Row | undefined;
      try {
        if (mirror)
          indexed = {
            ...mirror,
            value: normalizeLibraryValue(key, mirror.value),
          };
      } catch {
        damaged = true;
      }
      clock = Math.max(clock, local?.savedAt || 0, indexed?.savedAt || 0);
      const chosen =
        local && (!indexed || local.savedAt >= indexed.savedAt)
          ? local
          : indexed;
      if (chosen) {
        data = { ...data, [key]: chosen.value };
        if (!local && indexed) recovered = true;
      }
    }
    let profile: LocalProfile | undefined;
    try {
      const local = JSON.parse(
        localStorage.getItem(PREFIX + "profile") || "null",
      );
      if (validProfile(local)) profile = local;
    } catch {}
    const storedProfile = rows.find((row) => row.key === "profile")?.value;
    if (!profile && validProfile(storedProfile)) profile = storedProfile;
    profile ||= {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    status = { ...status, profile, recovered };
    await Promise.all([
      persist({ key: "profile", value: profile, savedAt: timestamp() }),
      ...libraryKeys.map((key) =>
        persist({ key, value: data[key], savedAt: timestamp() }),
      ),
    ]);
    if (damaged && !recovered)
      updateStatus({
        error:
          "Some damaged local data could not be recovered. Restore a library backup if anything is missing.",
      });
    window.addEventListener("storage", (event) => {
      const key = event.key?.startsWith(PREFIX)
        ? (event.key.slice(PREFIX.length) as LibraryKey)
        : undefined;
      if (!key || !libraryKeys.includes(key) || !event.newValue || restoring)
        return;
      try {
        // Ignore stale queued storage events instead of writing old values back.
        if (localStorage.getItem(PREFIX + key) !== event.newValue) return;
        const origin =
          localStorage.getItem("folio.local.origin." + key) === "cloud" &&
          localStorage.getItem("folio.local.digest." + key) ===
            storageDigest(event.newValue)
            ? "cloud"
            : undefined;
        const value = normalizeLibraryValue(key, JSON.parse(event.newValue));
        data = { ...data, [key]: value };
        emit(origin || "storage");
        void persist({ key, value, savedAt: timestamp(), origin });
      } catch {
        /* Invalid data from another tab must not replace this library. */
      }
    });
  })());
}
