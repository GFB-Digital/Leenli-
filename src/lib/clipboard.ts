/**
 * Text in die Zwischenablage kopieren. Die moderne Schnittstelle gibt es nur
 * bei HTTPS bzw. localhost – im WLAN-Test (http://192.168…) wird daher der
 * ältere Weg über ein unsichtbares Textfeld genutzt.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // weiter mit dem Ersatzweg
  }

  try {
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.top = '0'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    field.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    field.remove()
    return ok
  } catch {
    return false
  }
}
