// Kleiner Schlüssel-Wert-Speicher auf Basis von IndexedDB.
//
// Die restliche App spricht nur mit getItem/setItem/removeItem. Soll der
// Speicher später in der Capacitor-App z. B. auf eine native Datenbank
// umziehen, muss nur diese Datei ausgetauscht werden.
//
// Ist IndexedDB nicht verfügbar (z. B. manche private Fenster), wird
// ersatzweise im Arbeitsspeicher gespeichert – die App läuft dann weiter,
// vergisst aber alles beim Schließen.

const DB_NAME = 'leenli'
const DB_VERSION = 1
const STORE = 'keyval'

export type StorageMode = 'device' | 'memory'

let dbPromise: Promise<IDBDatabase> | null = null
let mode: StorageMode = 'device'
const memory = new Map<string, unknown>()

export function getStorageMode(): StorageMode {
  return mode
}

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB nicht verfügbar'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => {
      const db = request.result
      // Verbindung verloren (kommt v. a. auf iOS vor) → beim nächsten Zugriff neu öffnen
      db.onclose = () => {
        dbPromise = null
      }
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    request.onerror = () => reject(request.error ?? new Error('IndexedDB-Fehler'))
    request.onblocked = () => reject(new Error('IndexedDB blockiert'))
  })
  return dbPromise
}

function runOnce<T>(
  access: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, access)
        const request = action(tx.objectStore(STORE))
        tx.oncomplete = () => resolve(request.result as T)
        tx.onerror = () => reject(tx.error ?? request.error)
        tx.onabort = () => reject(tx.error ?? new Error('Transaktion abgebrochen'))
      }),
  )
}

async function run<T>(
  access: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  try {
    return await runOnce<T>(access, action)
  } catch {
    // Ein zweiter Versuch mit frischer Verbindung behebt die meisten Aussetzer
    dbPromise = null
    return await runOnce<T>(access, action)
  }
}

function fallBackToMemory(error: unknown) {
  if (mode === 'memory') return
  console.warn('Leenli: Speichern auf dem Gerät nicht möglich, nutze Arbeitsspeicher.', error)
  mode = 'memory'
}

/**
 * Bittet den Browser, die Daten dauerhaft zu behalten (sonst darf er sie bei
 * Speicherknappheit löschen). Wird beim Import aufgerufen. In der späteren
 * Capacitor-App gibt es diese Funktion nicht – dann passiert einfach nichts.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function isStoragePersistent(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false
  } catch {
    return false
  }
}

export async function getItem<T>(key: string): Promise<T | undefined> {
  if (mode === 'device') {
    try {
      return await run<T | undefined>('readonly', (store) => store.get(key))
    } catch (error) {
      fallBackToMemory(error)
    }
  }
  return memory.get(key) as T | undefined
}

export async function setItem(key: string, value: unknown): Promise<void> {
  memory.set(key, value)
  if (mode === 'device') {
    try {
      await run('readwrite', (store) => store.put(value, key))
    } catch (error) {
      fallBackToMemory(error)
    }
  }
}

export async function removeItem(key: string): Promise<void> {
  memory.delete(key)
  if (mode === 'device') {
    try {
      await run('readwrite', (store) => store.delete(key))
    } catch (error) {
      fallBackToMemory(error)
    }
  }
}
