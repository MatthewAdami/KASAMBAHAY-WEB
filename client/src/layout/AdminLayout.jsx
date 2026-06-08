import { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useColors } from '../ThemeContext.jsx'

const SESSION_DURATION = 6 * 60 * 60 * 1000   // 6 hours
const WARN_BEFORE     = 10 * 60 * 1000         // warn 10 mins before expiry

export default function AdminLayout() {
  const c = useColors()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [minsLeft, setMinsLeft] = useState(10)

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('token_expires_at')
    navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    const interval = setInterval(() => {
      const expiresAt = parseInt(localStorage.getItem('token_expires_at') || '0')
      const remaining = expiresAt - Date.now()

      if (remaining <= 0) {
        logout()
        return
      }

      if (remaining <= WARN_BEFORE) {
        setShowWarning(true)
        setMinsLeft(Math.ceil(remaining / 60000))
      } else {
        setShowWarning(false)
      }
    }, 30000) // check every 30 seconds

    // Also run immediately on mount
    const expiresAt = parseInt(localStorage.getItem('token_expires_at') || '0')
    const remaining = expiresAt - Date.now()
    if (remaining <= WARN_BEFORE && remaining > 0) {
      setShowWarning(true)
      setMinsLeft(Math.ceil(remaining / 60000))
    }

    return () => clearInterval(interval)
  }, [logout])

  const handleStayLoggedIn = () => {
    // Reset the expiry timer
    localStorage.setItem('token_expires_at', Date.now() + SESSION_DURATION)
    setShowWarning(false)
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      position: 'absolute',
      top: 0,
      left: 0,
      background: c.bg,
      transition: 'background 0.2s',
    }}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
        />
      )}

      {/* Sidebar Container */}
      <div className={`sidebar-container ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100vh',
        overflowY: 'auto',
        background: c.bg,
        transition: 'background 0.2s',
      }}>

        {/* Mobile Header */}
        <div className="mobile-header">
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: c.text, cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <span style={{ fontSize: 16, fontWeight: 600, color: c.text }}>Kasambahay System</span>
        </div>

        {/* ── Session Expiry Warning Banner ── */}
        {showWarning && (
          <div style={{
            background: '#fffbeb',
            borderBottom: '1px solid #f59e0b',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexShrink: 0,
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <span style={{ fontSize: 14, color: '#92400e', fontWeight: 500 }}>
                Your session will expire in <strong>{minsLeft} minute{minsLeft !== 1 ? 's' : ''}</strong>. Save your work soon.
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleStayLoggedIn}
                style={{
                  background: '#f59e0b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Stay Logged In
              </button>
              <button
                onClick={logout}
                style={{
                  background: 'transparent',
                  color: '#92400e',
                  border: '1px solid #f59e0b',
                  borderRadius: 6,
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Logout Now
              </button>
            </div>
          </div>
        )}

        <Outlet />
      </div>

      <style>{`
        .sidebar-container {
          transition: transform 0.2s ease;
          z-index: 50;
        }
        .mobile-header {
          display: none;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: ${c.bgSidebar};
          border-bottom: 1px solid ${c.border};
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .sidebar-container { position: fixed; top: 0; left: 0; height: 100vh; transform: translateX(-100%); }
          .sidebar-container.open { transform: translateX(0); }
          .mobile-header { display: flex; }
        }
      `}</style>
    </div>
  )
}