import { useState } from 'react'
import { Contrast, Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FONT_SCALES, loadPreferences, savePreferences, type AccessibilityPreferences } from '@/lib/accessibility'
import { cn } from '@/lib/utils'

export function AccessibilityToolbar({ className }: { className?: string }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(loadPreferences)
  const scaleIndex = FONT_SCALES.indexOf(preferences.fontScale)

  function update(changes: Partial<AccessibilityPreferences>) {
    const next = { ...preferences, ...changes }
    setPreferences(next)
    savePreferences(next)
  }

  return (
    <div role="group" aria-label="Acessibilidade" className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button
        variant="outline"
        size="icon"
        onClick={() => update({ fontScale: FONT_SCALES[scaleIndex - 1] })}
        disabled={scaleIndex <= 0}
        aria-label="Diminuir o tamanho do texto"
        title="Diminuir o tamanho do texto"
      >
        <Minus aria-hidden />
      </Button>
      {/* Anuncia o tamanho atual para leitores de tela sempre que ele muda. */}
      <span aria-live="polite" className="min-w-14 text-center text-base tabular-nums">
        <span className="sr-only">Tamanho do texto: </span>
        {preferences.fontScale}%
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => update({ fontScale: FONT_SCALES[scaleIndex + 1] })}
        disabled={scaleIndex >= FONT_SCALES.length - 1}
        aria-label="Aumentar o tamanho do texto"
        title="Aumentar o tamanho do texto"
      >
        <Plus aria-hidden />
      </Button>
      <Button
        variant={preferences.highContrast ? 'default' : 'outline'}
        onClick={() => update({ highContrast: !preferences.highContrast })}
        aria-pressed={preferences.highContrast}
      >
        <Contrast aria-hidden />
        Alto contraste
      </Button>
    </div>
  )
}
