import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useColors } from '../ThemeContext.jsx'

export const API = "https://kasambahay-backend.onrender.com/api"

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accentColor, c, large }) {
  return (
    <div style={{
      background: c.bgCard,
      border: `1px solid ${c.border}`,
      borderRadius: 10,
      borderTop: `3px solid ${accentColor}`,
      padding: large ? '16px 18px' : '12px 14px',
      flex: 1,
      minWidth: 0,
    }}>
      <p style={{
        margin: '0 0 6px', fontSize: 10, fontWeight: 600,
        color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {label}
      </p>
      <p style={{
        margin: '0 0 3px', fontSize: large ? 28 : 22,
        fontWeight: 700, color: c.text, lineHeight: 1,
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {value ?? '—'}
      </p>
      {sub && (
        <p style={{ margin: 0, fontSize: 11, color: c.textMuted }}>{sub}</p>
      )}
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, c }) {
  return (
    <p style={{
      margin: '0 0 10px', fontSize: 10, fontWeight: 700,
      color: c.textMuted, textTransform: 'uppercase',
      letterSpacing: '0.08em', borderBottom: `1px solid ${c.border}`,
      paddingBottom: 6,
    }}>
      {title}
    </p>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
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
    async function load() {
      setLoading(true); setError('')
      try {
        const statsRes = await fetch(`${API}/kasambahay/stats`, { headers: authHeader() })
        if (statsRes.status === 401) { localStorage.clear(); window.location.href = '/login'; return }
        if (!statsRes.ok) { setError('Failed to load stats'); setLoading(false); return }
        const { total, breakdown } = await statsRes.json()

        const detailRes = await fetch(`${API}/kasambahay?limit=500`, { headers: authHeader() })
        let female = 0, male = 0, liveIn = 0, senior = 0, trained = 0
        if (detailRes.ok) {
          const { data = [] } = await detailRes.json()
          female  = data.filter(r => r.isFemale).length
          male    = data.filter(r => r.isMale).length
          liveIn  = data.filter(r => r.isLiveIn).length
          senior  = data.filter(r => r.isSeniorCitizen).length
          trained = data.filter(r => r.kasambahayOrientation).length
        }

        // Build byYear: { 2024: { 'District 1': count, ... }, 2025: { ... } }
        const byYear = {}
        breakdown.forEach(b => {
          const yr = b._id.year
          const dist = b._id.district
          if (!byYear[yr]) byYear[yr] = {}
          byYear[yr][dist] = b.count
        })

        // Total per year
        const yearTotals = {}
        Object.keys(byYear).forEach(yr => {
          yearTotals[yr] = Object.values(byYear[yr]).reduce((s, c) => s + c, 0)
        })

        setStats({ total, byYear, yearTotals, female, male, liveIn, senior, trained })
      } catch {
        setError('Failed to load. Is the server running?')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const years     = stats ? Object.keys(stats.byYear).sort() : []
  const districts = ['District 1','District 2','District 3','District 4','District 5','District 6']

  const classification = stats ? [
    { label: 'Total',            count: stats.total   },
    { label: 'Female',           count: stats.female  },
    { label: 'Male',             count: stats.male    },
    { label: 'Live-in',          count: stats.liveIn  },
    { label: 'Senior Citizen',   count: stats.senior  },
    { label: 'Orientation Done', count: stats.trained },
  ] : []

  // ── Table cell helpers ─────────────────────────────────────────────────────
  const thStyle = {
    padding: '7px 10px', fontSize: 11, fontWeight: 700,
    color: c.textMuted, textTransform: 'uppercase',
    letterSpacing: '0.05em', borderBottom: `2px solid ${c.border}`,
    background: c.bgCard, textAlign: 'right',
    whiteSpace: 'nowrap',
  }
  const thLeft = { ...thStyle, textAlign: 'left' }
  const tdStyle = {
    padding: '6px 10px', fontSize: 12, color: c.textSub,
    borderBottom: `1px solid ${c.border}`, textAlign: 'right',
  }
  const tdLeft = { ...tdStyle, textAlign: 'left', color: c.text }
  const tdTotal = {
    ...tdStyle, fontWeight: 700, color: c.text,
    background: `${c.border}44`,
  }
  const tdTotalLeft = { ...tdTotal, textAlign: 'left' }

  return (
    <div style={{
      flex: 1, overflowY: 'auto',
      background: c.bg,
      fontFamily: "'DM Sans', sans-serif",
    }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: c.bgTopbar,
        borderBottom: `1px solid ${c.border}`,
        padding: '10px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: c.text }}>
            {getGreeting()}, {firstName}! 👋
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: c.textMuted }}>{fmtDate()}</p>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 600, color: c.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          Overview
        </span>
      </div>

      {/* ── Page content ────────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 16px' }}>

        {loading && (
          <div style={{
            textAlign: 'center', padding: '48px 0',
            color: c.textMuted, fontSize: 13,
          }}>
            Loading statistics…
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
            {/* ── SECTION 1: Highlight Cards ──────────────────────────────── */}
            <div style={{
              background: c.bgCard, border: `1px solid ${c.border}`,
              borderRadius: 10, padding: '12px 14px', marginBottom: 12,
            }}>
              <SectionHeader title="System Overview · Aggregate statistics across all districts and years" c={c} />

              {/* Row 1 — 4 aggregate cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
                <StatCard
                  label="Total Kasambahay"
                  value={stats.total.toLocaleString()}
                  sub="All districts, all years"
                  accentColor="#534AB7" c={c} large
                />
                <StatCard
                  label="Female Kasambahay"
                  value={stats.female.toLocaleString()}
                  sub={`${stats.male.toLocaleString()} male`}
                  accentColor="#d4537e" c={c} large
                />
                <StatCard
                  label="Live-in Arrangement"
                  value={stats.liveIn.toLocaleString()}
                  sub="Residential workers"
                  accentColor="#1d9e75" c={c} large
                />
                <StatCard
                  label="Orientation Trained"
                  value={stats.trained.toLocaleString()}
                  sub="Attended orientation"
                  accentColor="#d97706" c={c} large
                />
              </div>

              {/* Row 2 — one card per year */}
              {years.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(years.length, 4)}, 1fr)`, gap: 10 }}>
                  {years.map(yr => (
                    <StatCard
                      key={yr}
                      label={`Active Kasambahay ${yr}`}
                      value={stats.yearTotals[yr].toLocaleString()}
                      sub="Across all 6 districts"
                      accentColor="#3b82f6" c={c}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── SECTION 2 + 3: Summary table + Classification ───────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12 }}>

              {/* ── Active Kasambahay Summary Table ─────────────────────── */}
              <div style={{
                background: c.bgCard, border: `1px solid ${c.border}`,
                borderRadius: 10, padding: '12px 14px', overflow: 'hidden',
              }}>
                <SectionHeader title="Active Kasambahay Summary · By District and Year" c={c} />
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={thLeft}>District</th>
                        {years.map(yr => (
                          <th key={yr} style={thStyle}>{yr}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {districts.map(dist => (
                        <tr key={dist}
                          onMouseEnter={e => e.currentTarget.style.background = `${c.border}44`}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={tdLeft}>{dist}</td>
                          {years.map(yr => (
                            <td key={yr} style={tdStyle}>
                              {(stats.byYear[yr]?.[dist] ?? 0).toLocaleString()}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {/* Total row */}
                      <tr>
                        <td style={tdTotalLeft}>Total</td>
                        {years.map(yr => (
                          <td key={yr} style={tdTotal}>
                            {stats.yearTotals[yr].toLocaleString()}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Classification Breakdown ─────────────────────────────── */}
              <div style={{
                background: c.bgCard, border: `1px solid ${c.border}`,
                borderRadius: 10, padding: '12px 14px',
              }}>
                <SectionHeader title="Classification Breakdown" c={c} />
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={thLeft}>Classification</th>
                      <th style={thStyle}>Active Kasambahay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classification.map(({ label, count }, i) => (
                      <tr key={label}
                        onMouseEnter={e => e.currentTarget.style.background = `${c.border}44`}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        style={{ background: i === 0 ? `${c.border}22` : 'transparent' }}
                      >
                        <td style={{
                          ...tdLeft,
                          fontWeight: i === 0 ? 700 : 400,
                          color: i === 0 ? c.text : c.textSub,
                        }}>
                          {label}
                        </td>
                        <td style={{
                          ...tdStyle,
                          fontWeight: i === 0 ? 700 : 400,
                          color: i === 0 ? c.text : c.textSub,
                        }}>
                          {count.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Visual bar indicators */}
                <div style={{ marginTop: 14 }}>
                  <p style={{
                    fontSize: 10, fontWeight: 700, color: c.textMuted,
                    textTransform: 'uppercase', letterSpacing: '0.07em',
                    marginBottom: 8,
                  }}>
                    Distribution
                  </p>
                  {classification.slice(1).map(({ label, count }) => {
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                    const colors = {
                      'Female':           '#d4537e',
                      'Male':             '#3b82f6',
                      'Live-in':          '#1d9e75',
                      'Senior Citizen':   '#d97706',
                      'Orientation Done': '#534AB7',
                    }
                    return (
                      <div key={label} style={{ marginBottom: 7 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: c.textSub }}>{label}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: c.text }}>{pct}%</span>
                        </div>
                        <div style={{
                          height: 5, borderRadius: 99,
                          background: `${c.border}88`, overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%', width: `${pct}%`,
                            background: colors[label] || c.accent,
                            borderRadius: 99,
                            transition: 'width 0.6s ease',
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  )
}
