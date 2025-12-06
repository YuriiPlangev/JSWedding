import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  console.error('Error rendering app:', error)
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: Arial; color: red;">
      <h1>Ошибка загрузки приложения</h1>
      <p>${error instanceof Error ? error.message : String(error)}</p>
      <p>Проверьте консоль браузера для подробностей.</p>
    </div>
  `
}
