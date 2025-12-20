import type { DailyLog } from "../types/dailyLog.js";

const DB_NAME = "dailylog-db";
const STORE_NAME = "logs";
const DB_VERSION = 1;

/* =======================
   OPEN DATABASE
======================= */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "date" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/* =======================
   SAVE / UPDATE LOG
======================= */
export async function saveLogToIndexedDB(log: DailyLog) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).put(log);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* =======================
   LOAD ALL LOGS
======================= */
export async function loadAllLogsFromIndexedDB(): Promise<DailyLog[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () =>
      resolve(
        request.result.sort(
          (a, b) =>
            new Date(b.date).getTime() -
            new Date(a.date).getTime()
        )
      );
    request.onerror = () => reject(request.error);
  });
}

/* =======================
   CLEAR (OPTIONAL)
======================= */
export async function clearIndexedDB() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).clear();
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteLogFromIndexedDB(date: string) {
  const db = await openDB();
  const tx = db.transaction("logs", "readwrite");
  tx.objectStore("logs").delete(date);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
