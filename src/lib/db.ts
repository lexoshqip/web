import type { FormatKind, ReadingProgress } from "./types";

/**
 * Reading-position persistence (spec §1/§6).
 * Key format: `${bookId}:${format}`.
 * Falls back to localStorage if IndexedDB is unavailable (SSR/privacy mode).
 */

const DB_NAME = "lexoshqip";
const STORE = "progress";
const LS_PREFIX = "lexoshqip:progress:";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

export function progressKey(bookId: string, format: FormatKind): string {
  return `${bookId}:${format}`;
}

export async function getProgress(key: string): Promise<ReadingProgress | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as ReadingProgress) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? (JSON.parse(raw) as ReadingProgress) : null;
  }
}

/** fired on every write so open pages can refresh progress-dependent UI live */
export const PROGRESS_EVENT = "lexoshqip:progress";

export async function setProgress(key: string, value: ReadingProgress): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  }
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: key }));
}

export async function getAllProgress(): Promise<Record<string, ReadingProgress>> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const out: Record<string, ReadingProgress> = {};
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) return resolve(out);
        out[String(cursor.key)] = cursor.value as ReadingProgress;
        cursor.continue();
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
  } catch {
    const out: Record<string, ReadingProgress> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(LS_PREFIX)) {
        try {
          out[k.slice(LS_PREFIX.length)] = JSON.parse(localStorage.getItem(k)!);
        } catch { /* ignore corrupt entries */ }
      }
    }
    return out;
  }
}
