interface Option<T extends string> {
  value: T
  label: string
}

/** Umschalter mit wenigen Möglichkeiten, z. B. „Normal | Speed“ */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  fill = false,
}: {
  label: string
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  /** Ganze Breite nutzen, alle Möglichkeiten gleich breit */
  fill?: boolean
}) {
  return (
    <div className={fill ? 'segmented segmented--fill' : 'segmented'} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className="segmented-option"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
