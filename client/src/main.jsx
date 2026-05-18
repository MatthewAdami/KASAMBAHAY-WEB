import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // 💡 Back to BrowserRouter
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter> {/* 💡 Clean wrapper, no basename needed! */}
      <App />
    </BrowserRouter>
  </StrictMode>,
)