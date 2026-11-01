import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { AccessibilityToolbar } from '@/components/AccessibilityToolbar'
import { applyPreferences, loadPreferences } from '@/lib/accessibility'

describe('Barra de acessibilidade', () => {
  it('aumenta e diminui o texto da página inteira', async () => {
    const user = userEvent.setup()
    render(<AccessibilityToolbar />)

    await user.click(screen.getByRole('button', { name: 'Aumentar o tamanho do texto' }))
    await user.click(screen.getByRole('button', { name: 'Aumentar o tamanho do texto' }))

    expect(document.documentElement.style.fontSize).toBe('125%')
    expect(screen.getByText('125%')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Diminuir o tamanho do texto' }))
    expect(document.documentElement.style.fontSize).toBe('112.5%')
  })

  it('não deixa passar dos limites', async () => {
    const user = userEvent.setup()
    render(<AccessibilityToolbar />)

    expect(screen.getByRole('button', { name: 'Diminuir o tamanho do texto' })).toBeDisabled()
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: 'Aumentar o tamanho do texto' }))
    }
    expect(screen.getByRole('button', { name: 'Aumentar o tamanho do texto' })).toBeDisabled()
  })

  it('liga o alto contraste e informa o estado do botão', async () => {
    const user = userEvent.setup()
    render(<AccessibilityToolbar />)

    const button = screen.getByRole('button', { name: 'Alto contraste' })
    await user.click(button)

    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement).toHaveClass('alto-contraste')
  })

  it('lembra a escolha na próxima visita', async () => {
    const user = userEvent.setup()
    render(<AccessibilityToolbar />)
    await user.click(screen.getByRole('button', { name: 'Aumentar o tamanho do texto' }))
    await user.click(screen.getByRole('button', { name: 'Alto contraste' }))

    document.documentElement.removeAttribute('style')
    document.documentElement.classList.remove('alto-contraste')
    applyPreferences(loadPreferences())

    expect(document.documentElement.style.fontSize).toBe('112.5%')
    expect(document.documentElement).toHaveClass('alto-contraste')
  })

  it('ignora preferências salvas inválidas', () => {
    localStorage.setItem('preferencias-acessibilidade', '{"fontScale": 999')

    expect(loadPreferences()).toEqual({ fontScale: 100, highContrast: false })
  })
})
