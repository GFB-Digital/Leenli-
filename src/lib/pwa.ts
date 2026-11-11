// Service Worker (Offline-Fähigkeit) – nur im Browser, nicht in der späteren
// Capacitor-App (dort liegen die Dateien ohnehin lokal auf dem Gerät).

import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

export type OfflineStatus =
  | 'dev' // npm run dev: Service Worker absichtlich aus
  | 'native' // läuft in der Capacitor-App
  | 'unsupported' // Browser kann es nicht (z. B. ohne HTTPS im WLAN)
  | 'pending' // wird gerade eingerichtet
  | 'ready' // App funktioniert offline

interface PwaState {
  offline: OfflineStatus
  updateAvailable: boolean
}

let state: PwaState = { offline: 'pending', updateAvailable: false }
const listeners = new Set<() => void>()
let applyUpdate: (() => Promise<void>) | null = null

function setState(patch: Partial<PwaState>) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

export function isNativeApp(): boolean {
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return cap?.isNativePlatform?.() === true
}

export function isInstalled(): boolean {
  if (isNativeApp()) return true
  const iosStandalone = (navigator as { standalone?: boolean }).standalone === true
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches
}

export function startServiceWorker() {
  if (import.meta.env.DEV) return setState({ offline: 'dev' })
  if (isNativeApp()) return setState({ offline: 'native' })
  if (!('serviceWorker' in navigator)) return setState({ offline: 'unsupported' })

  const update = registerSW({
    immediate: true,
    onOfflineReady: () => setState({ offline: 'ready' }),
    onNeedRefresh: () => setState({ updateAvailable: true }),
    onRegisteredSW: (_url, registration) => {
      if (registration?.active) setState({ offline: 'ready' })
    },
    onRegisterError: () => setState({ offline: 'unsupported' }),
  })
  applyUpdate = () => update(true)
}

export function installUpdate() {
  void applyUpdate?.()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePwa(): PwaState {
  return useSyncExternalStore(subscribe, () => state)
}
