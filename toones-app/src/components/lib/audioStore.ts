/* Recorded clips live in IndexedDB; drop metadata stays in localStorage. */

const DB = 'toones-audio'
const STORE = 'clips'

function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function saveClip(id: string, blob: Blob) {
  return run('readwrite', (s) => s.put(blob, id)).catch(() => undefined)
}

export function loadClip(id: string) {
  return run<Blob | undefined>('readonly', (s) => s.get(id)).catch(() => undefined)
}
