import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useColors } from '../ThemeContext.jsx'

export const API = "https://kasambahay-backend.onrender.com/api"

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` }
}

// ─── Stat Card — matches Figma top 4 cards ────────────────────────────────────
function StatCard({ label, value, sub, accentColor, c }) {
  return (
    <div style={{
      background: c.bgCard,
      border: `1px solid ${c.border}`,
      borderRadius: 10,
      padding: '20px 24px',
      borderTop: `3px solid ${accentColor}`,
      flex: 1,
      minWidth: 160,
    }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </p>
      <p style={{ margin: '0 0 4px', fontSize: 32, fontWeight: 700, color: c.text, lineHeight: 1 }}>
        {value ?? '—'}
      </p>
      {sub && <p style={{ margin: 0, fontSize: 12, color: c.textMuted }}>{sub}</p>}
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const c        = useColors()
  const navigate = useNavigate()
  const user     = JSON.parse(localStorage.getItem('user') || '{}')
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
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  useEffect(() => {
    async function load() {
      setLoading(true); setError('')
      try {
        // 1. Get stats breakdown (by year + district)
        const statsRes = await fetch(`${API}/kasambahay/stats`, { headers: authHeader() })
        if (statsRes.status === 401) { localStorage.clear(); window.location.href = '/login'; return }
        if (!statsRes.ok) { setError('Failed to load stats'); setLoading(false); return }
        const { total, breakdown } = await statsRes.json()

        // 2. Get classification counts (sample 500 for gender/liveIn/etc.)
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

        // Group breakdown by year → { 2024: [{district, count}], 2025: [...] }
        const byYear = {}
        breakdown.forEach(b => {
          const yr = b._id.year
          if (!byYear[yr]) byYear[yr] = []
          byYear[yr].push({ district: b._id.district, count: b.count })
        })
        // Sort districts within each year
        Object.keys(byYear).forEach(yr => {
          byYear[yr].sort((a, b) => a.district.localeCompare(b.district))
        })

        setStats({ total, byYear, female, male, liveIn, senior, trained })
      } catch {
        setError('Failed to load. Is the server running?')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const classification = stats ? [
    { label: 'Total',            count: stats.total },
    { label: 'Female',           count: stats.female },
    { label: 'Male',             count: stats.male },
    { label: 'Live-in',          count: stats.liveIn },
    { label: 'Senior citizen',   count: stats.senior },
    { label: 'Orientation done', count: stats.trained },
  ] : []

  const years = stats ? Object.keys(stats.byYear).sort() : []

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: c.bg, fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Top bar ── */}
      <div style={{ background: c.bgTopbar, borderBottom: `1px solid ${c.border}`, padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: c.text }}>
            {getGreeting()}, {firstName}! 👋
          </h1>
        </div>
      </div>

      {/* ── Page content ── */}
      <div style={{ padding: '24px 28px', maxWidth: 1200 }}>

        {/* ── System Overview card ── */}
        <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 12, padding: '24px 28px', marginBottom: 20 }}>

          {/* Date + title */}
          <p style={{ margin: '0 0 4px', fontSize: 13, color: c.textMuted }}>{fmtDate()}</p>
          <h2 style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, color: c.text, textAlign: 'center' }}>System Overview</h2>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: c.textMuted, textAlign: 'center' }}>Aggregate statistics across all districts and years</p>

          {/* ── 4 stat cards ── */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: c.textMuted, fontSize: 14 }}>Loading statistics…</div>
          ) : error ? (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#b91c1c' }}>⚠ {error}</div>
          ) : stats && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <StatCard label="Total Records"       value={stats.total.toLocaleString()}   sub="All districts, all years"  accentColor="#534AB7" c={c} />
              <StatCard label="Female Kasambahay"   value={stats.female.toLocaleString()}  sub={`${stats.male} male`}       accentColor="#d4537e" c={c} />
              <StatCard label="Live-in Arrangement" value={stats.liveIn.toLocaleString()}  sub="Residential workers"        accentColor="#1d9e75" c={c} />
              <StatCard label="Orientation Trained" value={stats.trained.toLocaleString()} sub="Attended orientation"       accentColor="#d97706" c={c} />
            </div>
          )}
        </div>

        {/* ── Records by year & district ── */}
        {stats && (
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 12, padding: '24px 28px', marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: c.text }}>Records by year &amp; district</h3>

            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(years.length, 3)}, 1fr)`, gap: 32 }}>
              {years.map(yr => (
                <div key={yr}>
                  {/* Year header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: `2px solid ${c.border}`, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{yr}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>COUNT</span>
                  </div>
                  {/* District rows */}
                  {stats.byYear[yr].map(row => (
                    <div key={row.district} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${c.border}` }}>
                      <span style={{ fontSize: 13, color: c.textSub }}>{row.district}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{row.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Classification breakdown ── */}
        {stats && (
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 12, padding: '24px 28px', marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 600, color: c.text }}>Classification breakdown</h3>

            {/* Table header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: `2px solid ${c.border}`, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Classification</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Count</span>
            </div>

            {/* Rows */}
            {classification.map(({ label, count }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${c.border}` }}>
                <span style={{ fontSize: 14, color: c.textSub }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
    </div>
  )
}
