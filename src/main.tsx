import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { startServiceWorker } from './lib/pwa.ts'
import { loadAppState } from './lib/store.ts'
import './styles/global.css'

void loadAppState()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

startServiceWorker()
