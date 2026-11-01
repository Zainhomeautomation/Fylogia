import type { SyncRecord, SyncMutation } from "./sync-protocol";
import type { LibraryData } from "./library-data";
export interface SyncState {
  preferenceVersion?: number;
  profileId: string;
  deviceId: string;
  cursor: number;
  sequence: number;
  offset: number;
  records: SyncRecord[];
  pending: SyncMutation[];
  flight?: { sequence: number; batchId: string; mutations: SyncMutation[] };
  enabled: boolean;
  lastSync: number;
}
export const freshSync = (): SyncState => ({
  profileId: "",
  deviceId: "",
  cursor: 0,
  sequence: 0,
  offset: 0,
  records: [],
  pending: [],
  enabled: false,
  lastSync: 0,
});
let opening: Promise<IDBDatabase> | undefined;
function database() {
  return (opening ||= new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("fylogia-private-sync", 1);
    let expired = false;
    const timeout = setTimeout(() => {
      expired = true;
      reject(
        new Error("Sync storage timed out. Local reading remains available."),
      );
    }, 2500);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("state");
      r.result.createObjectStore("backups", { autoIncrement: true });
    };
    r.onerror = r.onblocked = () => {
      clearTimeout(timeout);
      expired = true;
      reject(
        new Error(
          "Sync needs writable local storage. Local reading is unchanged.",
        ),
      );
    };
    r.onsuccess = () => {
      clearTimeout(timeout);
      if (expired) {
        r.result.close();
        return;
      }
      r.result.onversionchange = () => r.result.close();
      resolve(r.result);
    };
  }));
}
export async function readSync(): Promise<SyncState> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state"),
      r = tx.objectStore("state").get("current");
    tx.oncomplete = () => resolve(r.result || freshSync());
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}
export async function writeSync(state: SyncState) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("state", "readwrite");
    tx.objectStore("state").put(state, "current");
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}
export async function backupBeforeSync(data: LibraryData) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("backups", "readwrite"),
      store = tx.objectStore("backups");
    store.add({ createdAt: Date.now(), library: { version: 1, ...data } });
    const keys = store.getAllKeys();
    keys.onsuccess = () => {
      for (const key of keys.result.slice(0, -3)) store.delete(key);
    };
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}
export async function latestSyncBackup() {
  const db = await database();
  return new Promise<unknown>((resolve, reject) => {
    const tx = db.transaction("backups"),
      r = tx.objectStore("backups").openCursor(null, "prev");
    r.onsuccess = () => resolve(r.result?.value.library);
    r.onerror = () => reject(r.error);
  });
}
export async function syncLock<T>(fn: () => Promise<T>): Promise<T> {
  if (!navigator.locks)
    throw new Error(
      "Secure sync needs a browser with Web Locks support. Local reading remains available.",
    );
  return navigator.locks.request("fylogia-private-sync", fn);
}
