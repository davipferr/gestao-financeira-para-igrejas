/**
 * Preferências de acessibilidade escolhidas por cada pessoa: tamanho do texto e
 * alto contraste. Ficam salvas no próprio navegador, porque valem só para quem
 * está usando aquele aparelho.
 */

export const FONT_SCALES = [100, 112.5, 125, 150] as const
export type FontScale = (typeof FONT_SCALES)[number]

export type AccessibilityPreferences = {
  fontScale: FontScale
  highContrast: boolean
}

const STORAGE_KEY = 'preferencias-acessibilidade'
const DEFAULTS: AccessibilityPreferences = { fontScale: 100, highContrast: false }

export function loadPreferences(): AccessibilityPreferences {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<AccessibilityPreferences>
    return {
      fontScale: FONT_SCALES.includes(saved.fontScale as FontScale) ? (saved.fontScale as FontScale) : DEFAULTS.fontScale,
      highContrast: saved.highContrast === true,
    }
  } catch {
    // Em janela anônima ou com o armazenamento bloqueado, segue com o padrão.
    return DEFAULTS
  }
}

export function applyPreferences(preferences: AccessibilityPreferences) {
  // Todo o layout usa "rem", então mudar a fonte da raiz aumenta textos, campos e botões juntos.
  document.documentElement.style.fontSize = `${preferences.fontScale}%`
  document.documentElement.classList.toggle('alto-contraste', preferences.highContrast)
}

export function savePreferences(preferences: AccessibilityPreferences) {
  applyPreferences(preferences)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // Sem armazenamento disponível a preferência vale só até fechar a página.
  }
}
