import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useColors } from '../ThemeContext.jsx'

export default function AdminLayout() {
  const c = useColors()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
