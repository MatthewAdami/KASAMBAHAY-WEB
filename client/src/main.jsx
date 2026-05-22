import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // 💡 Back to BrowserRouter
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './ThemeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider><BrowserRouter> {/* 💡 Clean wrapper, no basename needed! */}
      <App />
    </BrowserRouter></ThemeProvider>
  </StrictMode>,
)