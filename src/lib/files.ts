// Eine Datei aus der App heraus speichern.
//
// Auf dem Handy öffnet sich das Teilen-Menü („In Dateien sichern“, AirDrop, Mail …),
// am PC wird die Datei heruntergeladen. In der späteren Capacitor-App müsste hier
// das Filesystem-/Share-Plugin eingesetzt werden – nur diese Datei wäre betroffen.

export type SaveResult = 'shared' | 'downloaded' | 'cancelled'

export async function saveTextFile(name: string, text: string, type = 'application/json'): Promise<SaveResult> {
  const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false
  if (touch && typeof File !== 'undefined' && navigator.canShare) {
    const file = new File([text], name, { type })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name })
        return 'shared'
      } catch (error) {
        // Teilen-Menü geschlossen → nichts gespeichert; andere Fehler → unten herunterladen
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      }
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
