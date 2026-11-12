import { useEffect, useRef, type ReactNode } from 'react'

/** Rückfrage als eigener Dialog (statt window.confirm – sieht überall gleich aus) */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Abbrechen',
  alternative,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** Optionale dritte Möglichkeit, z. B. „Als neuen Kurs hinzufügen“ */
  alternative?: { label: string; onClick: () => void }
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        // Escape-Taste
        event.preventDefault()
        onCancel()
      }}
      onClick={(event) => {
        // Tippen auf den abgedunkelten Hintergrund schließt den Dialog
        if (event.target === ref.current) onCancel()
      }}
    >
      <div className="dialog-body">
        <h2 id="dialog-title" className="dialog-title">
          {title}
        </h2>
        <div className="dialog-message">{message}</div>
        <div className={alternative ? 'dialog-actions dialog-actions--stacked' : 'dialog-actions'}>
          <button type="button" className="btn btn-secondary" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          {alternative && (
            <button type="button" className="btn btn-secondary" onClick={alternative.onClick}>
              {alternative.label}
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
