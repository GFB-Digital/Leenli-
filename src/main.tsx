import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { startServiceWorker } from './lib/pwa.ts'
import { loadAppState } from './lib/store.ts'
import './styles/fonts.css'
import './styles/global.css'
import './styles/learning.css'

void loadAppState()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

startServiceWorker()
