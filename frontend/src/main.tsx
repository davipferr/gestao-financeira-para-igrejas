import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'
import { applyPreferences, loadPreferences } from '@/lib/accessibility'
import '@/index.css'

// Aplica tamanho de texto e contraste antes de desenhar a tela, sem "piscar" no padrão.
applyPreferences(loadPreferences())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
