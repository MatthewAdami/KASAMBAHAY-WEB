import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useColors } from '../ThemeContext.jsx'

export const API = "https://kasambahay-backend.onrender.com/api"

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` }
}

// ─── NAV CARD COMPONENT (Clickable Highlights) ────────────────────────────────
function NavCard({ label, value, sub, accentColor, icon, onClick, c }) {
  return (
    <div 
      onClick={onClick}
      style={{
        background: c.bgCard,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        borderTop: `4px solid ${accentColor}`,
        padding: '20px 18px',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.06)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p style={{
            margin: 0, fontSize: 11, fontWeight: 700,
            color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            {label}
          </p>
          <span style={{ fontSize: 18 }}>{icon}</span>
        </div>
        <p style={{
          margin: '0 0 4px', fontSize: 28,
          fontWeight: 700, color: c.text, lineHeight: 1,
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {value ?? '—'}
        </p>
      </div>
      {sub && (
        <p style={{ margin: '8px 0 0', fontSize: 11, color: c.textMuted, borderTop: `1px solid ${c.border}44`, paddingTop: 6 }}>
          {sub}
        </p>
      )}
    </div>
  )
}

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
function SectionHeader({ title, c }) {
  return (
    <p style={{
      margin: '0 0 14px', fontSize: 11, fontWeight: 700,
      color: c.textMuted, textTransform: 'uppercase',
      letterSpacing: '0.08em', borderBottom: `1px solid ${c.border}`,
      paddingBottom: 8,
    }}>
      {title}
    </p>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const c         = useColors()
  const navigate  = useNavigate()
  const user      = JSON.parse(localStorage.getItem('user') || '{}')
  const firstName = user.name?.split(' ')[0] || 'there'

  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const fmtDate = () => new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  useEffect(() => {
    let isMounted = true
    async function load() {
      setLoading(true); setError('')
      try {
        const statsRes = await fetch(`${API}/kasambahay/stats`, { headers: authHeader() })
        if (statsRes.status === 401) { localStorage.clear(); window.location.href = '/login'; return }
        if (!statsRes.ok) { if (isMounted) setError('Failed to load stats'); setLoading(false); return }
        
        const { total, breakdown } = await statsRes.json()

        // Pag-build ng Yearly totals para sa pinasimpleng summary sa baba
        const byYear = {}
        breakdown.forEach(b => {
          const yr = b._id.year
          if (!byYear[yr]) byYear[yr] = 0
          byYear[yr] += b.count
        })

        if (isMounted) {
          setStats({ total, byYear })
        }
      } catch {
        if (isMounted) setError('Failed to load. Is the server running?')
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => { isMounted = false }
  }, [])

  const years = stats ? Object.keys(stats.byYear).sort() : []

  return (
    <div style={{
      flex: 1, overflowY: 'auto',
      background: c.bg,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: c.bgTopbar,
        borderBottom: `1px solid ${c.border}`,
        padding: '14px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: c.text }}>
            {getGreeting()}, {firstName}! 👋
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: c.textMuted }}>{fmtDate()}</p>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600, color: c.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          System Overview
        </span>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: c.textMuted, fontSize: 13 }}>
            Loading system highlights…
          </div>
        )}

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, padding: '10px 14px',
            fontSize: 12, color: '#b91c1c', marginBottom: 12,
          }}>
            ⚠ {error}
          </div>
        )}

        {stats && (
          <>
            {/* ── SECTION 1: System Navigation Highlights ── */}
            <div style={{ marginBottom: 24 }}>
              <SectionHeader title="System Highlights · Quick access to system modules" c={c} />
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                gap: 14 
              }}>
                
                <NavCard 
                  label="Active Kasambahay"
                  value={stats.total.toLocaleString()}
                  sub="View & Manage Kasambahay Data"
                  accentColor="#534AB7"
                  icon="👥"
                  c={c}
                  onClick={() => navigate('kasambahay')}
                />

                <NavCard 
                  label="Programs"
                  value="Active"
                  sub="Orientation & Training Modules"
                  accentColor="#1d9e75"
                  icon="🎯"
                  c={c}
                  onClick={() => navigate('reports')}
                />

                <NavCard 
                  label="Statistical Reports"
                  value="Graphs"
                  sub="Demographics & Visual Analytics"
                  accentColor="#3b82f6"
                  icon="📊"
                  c={c}
                  onClick={() => navigate('reports')}
                />

                <NavCard 
                  label="Summary Reports"
                  value="Export"
                  sub="Generate Yearly & Monthly Reports"
                  accentColor="#d97706"
                  icon="📄"
                  c={c}
                  onClick={() => navigate('summary-report')}
                />

                <NavCard 
                  label="Users"
                  value="Admin"
                  sub="Manage System Accounts & Access"
                  accentColor="#d4537e"
                  icon="⚙️"
                  c={c}
                  onClick={() => navigate('users')}
                />

              </div>
            </div>

            {/* ── SECTION 2: Active Kasambahay Summary (National Summary Style) ── */}
            <div style={{ maxWidth: '500px' }}>
              <div style={{
                background: c.bgCard, 
                border: `1px solid ${c.border}`,
                borderRadius: 10, 
                padding: '16px 18px',
              }}>
                <SectionHeader title="Active Kasambahay Summary Report" c={c} />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {years.map(yr => (
                    <div 
                      key={yr}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: `${c.border}22`,
                        borderRadius: 6,
                        fontSize: 13
                      }}
                    >
                      <span style={{ fontWeight: 600, color: c.text }}>
                        YEAR {yr}: TOTAL
                      </span>
                      <span style={{ fontWeight: 700, color: c.accent || '#534AB7', fontSize: 15 }}>
                        {stats.byYear[yr].toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  )
}