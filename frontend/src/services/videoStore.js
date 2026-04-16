/**
 * videoStore.js
 *
 * Persists the uploaded video File object so Results.jsx can extract frames.
 *
 * Two storage layers:
 *  1. In-memory — instant access within the same SPA session.
 *  2. IndexedDB — survives page refreshes and route transitions.
 *
 * Blob URLs created from File objects die on page reload, but IndexedDB
 * can hold the raw Blob/File data. On Results load we rehydrate from IDB
 * if the in-memory reference is gone.
 */

const DB_NAME = "athlix_video_store";
const DB_VERSION = 1;
const STORE_NAME = "videos";
const VIDEO_KEY = "uploaded_video";

// ── IndexedDB helpers ──────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbPut(blob) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, VIDEO_KEY);
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    });
    console.log("[videoStore] ✅ Video persisted to IndexedDB");
  } catch (err) {
    console.warn("[videoStore] IndexedDB put failed:", err);
  }
}

async function idbGet() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(VIDEO_KEY);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("[videoStore] IndexedDB get failed:", err);
    return null;
  }
}

async function idbClear() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(VIDEO_KEY);
  } catch {
    // Ignore cleanup errors
  }
}

// ── In-memory layer ────────────────────────────────────────────────

let _videoFile = null;
let _blobUrl = null;

export const videoStore = {
  /** Store the uploaded File object (call from Upload page before navigating). */
  setFile(file) {
    // Revoke previous blob URL to free memory
    if (_blobUrl) {
      URL.revokeObjectURL(_blobUrl);
      _blobUrl = null;
    }
    _videoFile = file;

    // Also persist to IndexedDB for resilience across page refreshes
    if (file) {
      idbPut(file);
    }
  },

  /** Get the raw File object. */
  getFile() {
    return _videoFile;
  },

  /** Get a valid blob URL for the stored file. Creates one if needed. */
  getBlobUrl() {
    if (!_videoFile) return null;
    if (!_blobUrl) {
      _blobUrl = URL.createObjectURL(_videoFile);
    }
    return _blobUrl;
  },

  /**
   * Rehydrate from IndexedDB if the in-memory store is empty.
   * Call this from Results on mount to recover from page refreshes.
   * Returns the blob URL or null.
   */
  async rehydrate() {
    if (_videoFile) {
      // Already in memory
      return this.getBlobUrl();
    }

    console.log("[videoStore] Attempting rehydration from IndexedDB…");
    const blob = await idbGet();

    if (blob) {
      _videoFile = blob;
      console.log("[videoStore] ✅ Rehydrated from IndexedDB:", blob.size, "bytes");
      return this.getBlobUrl();
    }

    console.warn("[videoStore] ⚠ No video found in IndexedDB either.");
    return null;
  },

  /** Clean up. */
  clear() {
    if (_blobUrl) {
      URL.revokeObjectURL(_blobUrl);
      _blobUrl = null;
    }
    _videoFile = null;
    idbClear();
  },
};
