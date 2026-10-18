import { KIND_LABELS, type Kind } from '@/lib/types'
import { cn } from '@/lib/utils'

type KindRadioGroupProps = {
  name: string
  value: Kind
  onChange: (kind: Kind) => void
  disabled?: boolean
  hint?: string
}

export function KindRadioGroup({ name, value, onChange, disabled, hint }: KindRadioGroupProps) {
  const hintId = hint ? `${name}-dica` : undefined
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled} aria-describedby={hintId}>
      <legend className="mb-2 text-base font-medium">Tipo</legend>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(KIND_LABELS) as Kind[]).map((kind) => (
          <label
            key={kind}
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-base has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
              value === kind ? 'border-primary bg-primary/5 font-medium' : 'border-input',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              type="radio"
              name={name}
              value={kind}
              checked={value === kind}
              onChange={() => onChange(kind)}
              className="size-4 accent-primary"
            />
            {KIND_LABELS[kind]}
          </label>
        ))}
      </div>
      {hint && (
        <p id={hintId} className="text-base text-muted-foreground">
          {hint}
        </p>
      )}
    </fieldset>
  )
}
