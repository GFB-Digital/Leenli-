// Schlichte Linien-Icons als eingebettetes SVG (funktioniert offline, keine Bibliothek)

const PATHS = {
  back: <path d="M15 18l-6-6 6-6" />,
  chevron: <path d="M9 18l6-6-6-6" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  check: <path d="M20 6L9 17l-5-5" />,
  bolt: <path d="M13.5 2.5L5 13.5h6l-1.5 8L18 10.5h-6z" fill="currentColor" stroke="currentColor" strokeWidth="1" />,
  hex: <path d="M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z" />,
  hexFilled: <path d="M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z" fill="currentColor" />,
  arrowUp: <path d="M12 19V5M6 11l6-6 6 6" />,
  arrowDown: <path d="M12 5v14M6 13l6 6 6-6" />,
  book: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z" />
    </>
  ),
  reset: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4.5 4.5v4h4" />
      <path d="M12 8.5v4l2.5 1.5" />
    </>
  ),
  knowledge: (
    <>
      <path d="M8 3.6l3.5 2v4L8 11.6l-3.5-2v-4z" />
      <path d="M16 3.6l3.5 2v4L16 11.6l-3.5-2v-4z" />
      <path d="M12 10.6l3.5 2v4L12 18.6l-3.5-2v-4z" fill="currentColor" />
    </>
  ),
  shield: <path d="M12 3l7 3v5.5c0 4.2-3 7.8-7 9.5-4-1.7-7-5.3-7-9.5V6z" />,
  import: (
    <>
      <path d="M12 4v11" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
    </>
  ),
  play: <path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5a.8.8 0 0 0-1.2.7z" fill="currentColor" stroke="none" />,
  pause: (
    <>
      <rect x="6" y="5" width="4.5" height="14" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="13.5" y="5" width="4.5" height="14" rx="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  sentenceBack: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4.5 4.5v4h4" />
    </>
  ),
  text: <path d="M4 6h16M4 10h16M4 14h16M4 18h10" />,
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9.5 7V4.5h5V7" />
      <path d="M6.5 7l.9 12.1a1 1 0 0 0 1 .9h7.2a1 1 0 0 0 1-.9L17.5 7" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  file: (
    <>
      <path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z" />
      <path d="M14 3.5V8h4.5" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9M19 7h1M4 17h1M11 17h9" />
      <circle cx="16" cy="7" r="2.5" />
      <circle cx="8" cy="17" r="2.5" />
    </>
  ),
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
