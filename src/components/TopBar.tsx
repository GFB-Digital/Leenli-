import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon.tsx'

export function TopBar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-side">{left}</div>
        <div className="topbar-side topbar-right">{right}</div>
      </div>
    </header>
  )
}

interface IconButtonProps {
  icon: IconName
  label: string
  onClick: () => void
  /** Beschriftung auch auf schmalen Bildschirmen zeigen */
  showLabel?: boolean
}

export function IconButton({ icon, label, onClick, showLabel = false }: IconButtonProps) {
  return (
    <button
      type="button"
      className={showLabel ? 'icon-btn icon-btn--labeled' : 'icon-btn'}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} />
      <span className="icon-btn-label" aria-hidden="true">
        {label}
      </span>
    </button>
  )
}
