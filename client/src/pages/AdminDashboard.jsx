import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useColors } from '../ThemeContext.jsx'
import { API_ENDPOINTS } from '../utils/api'

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` }
}

const TRAININGS = [
  { key: 'kasambahayOrientation',       label: 'Kasambahay Orientation' },
  { key: 'kasambahayOrganizing',        label: 'Kasambahay Organizing' },
  { key: 'occupationalSafetyAndHealth', label: 'Occupational Safety & Health' },
  { key: 'genderSensitivityTraining',   label: 'Gender Sensitivity Training' },
  { key: 'basicFirstAidTraining',       label: 'Basic First Aid Training' },
  { key: 'homeSecurityAwareness',       label: 'Home Security Awareness' },
  { key: 'kasambahayGeneralAssembly',   label: 'General Assembly' },
  { key: 'kasambahayDay',               label: 'Kasambahay Day' },
  { key: 'disasterPreparedness',        label: 'Disaster Preparedness' },
  { key: 'qcCareOrientation',           label: 'QC Care Orientation' },
  { key: 'isKapsaMember',               label: 'KAPSA' },
]

// ─── Shared Age Calculator ───────────────────────────────────────────────────
function calculateAge(record) {
  // 1. Trust the explicitly saved age field first
  const possibleAgeFields = ['age', 'currentAge', 'workerAge', 'kasambahayAge'];
  for (const field of possibleAgeFields) {
    const val = parseInt(record[field]);
    if (!isNaN(val) && val > 0 && val < 120) return val;
  }

  // 2. Try computing from DOB fields if age is missing
  const dobRaw = record.dateOfBirth || record.birthday || record.birthDate;
  if (dobRaw) {
    let d = new Date(dobRaw);
    if (isNaN(d.getTime()) && typeof dobRaw === 'string') {
      const parts = dobRaw.split(/[\/\-]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
        else d = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
      }
    }
    if (!isNaN(d.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - d.getFullYear();
      const m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
      if (age > 0 && age < 120) return age;
    }
  }
  return record.age ?? null;
}

async function fetchAll(token) {
  let page = 1, all = []
  while (true) {
    const res = await fetch(`${API_ENDPOINTS.KASAMBAHAY}?limit=500&page=${page}&isDeleted=false`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    const json = await res.json()
    const rows = (json.data || json || []).map(r => ({ ...r, age: calculateAge(r) }));
    all = all.concat(rows)
    const { totalPages } = json.pagination || {}
    if (!totalPages || page >= totalPages) break
    page++
  }
  return all
}

// ─── NAV CARD COMPONENT (Centered Version) ───────────────────────────────────
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
        alignItems: 'center', // 👈 Centers items horizontally
        textAlign: 'center',  // 👈 Centers the text lines
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
      <div style={{ width: '100%' }}>
        {/* Adjusted this wrapper to group the label and icon tightly in the center */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <p style={{
            margin: 0, fontSize: 11, fontWeight: 700,
            color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            {label}
          </p>
          {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
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
        <p style={{ 
          margin: '8px 0 0', fontSize: 11, color: c.textMuted, 
          borderTop: `1px solid ${c.border}44`, paddingTop: 6,
          width: '100%' // Ensures the border spans across the card width
        }}>
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
        const token = localStorage.getItem('token')
        if (!token) { localStorage.clear(); window.location.href = '/login'; return }

        // Fetch all records to guarantee exact consistency with Masterlist/Excel exports
        const allRecords = await fetchAll(token)

        const byYear = {}
        const trainingCounts = {}
        let under15Count = 0

        TRAININGS.forEach(t => trainingCounts[t.key] = 0)
        
        allRecords.forEach(r => {
          // Tally yearly breakdown dynamically
          const yr = r.year ? Number(r.year) : 'Unknown'
          if (!byYear[yr]) byYear[yr] = 0
          byYear[yr]++

          // Tally trainings
          TRAININGS.forEach(t => {
            if (r[t.key]) trainingCounts[t.key]++
          })

          // Tally 15 & below (Child Labor detection)
          if (r.age > 0 && r.age <= 15) under15Count++
        })

        if (isMounted) {
          setStats({ total: allRecords.length, byYear, trainingCounts, totalRecords: allRecords.length, under15Count })
        }
      } catch (err) {
        if (err.message.includes('401')) {
          localStorage.clear(); window.location.href = '/login'; return
        }
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
            {/* ── CRITICAL ALERT (Child Labor Detection) ── */}
            {stats.under15Count > 0 && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 10, padding: '16px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
                marginBottom: 24, boxShadow: '0 4px 12px rgba(220, 38, 38, 0.1)'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 6px', color: '#b91c1c', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>⚠️</span> Critical Alert: Underage Workers Detected
                  </h3>
                  <p style={{ margin: 0, color: '#991b1b', fontSize: 13, lineHeight: 1.5 }}>
                    There {stats.under15Count === 1 ? 'is' : 'are'} <strong>{stats.under15Count} record{stats.under15Count === 1 ? '' : 's'}</strong> of a kasambahay aged 15 or below. Under RA 10361 (Kasambahay Law), it is unlawful to employ minors 15 years of age and below.
                  </p>
                </div>
                <button 
                  onClick={() => navigate('kasambahay?age=15-below')}
                  style={{ background: '#b91c1c', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}
                >
                  Review Records →
                </button>
              </div>
            )}

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
                  value={stats.total.toLocaleString() }
                  sub="Kasambahay Data"
                  accentColor="#534AB7"
                  c={c}
                  onClick={() => navigate('kasambahay')}
                />

                <NavCard 
                  label="Programs"
                  value="🤝"
                  sub="Attended Programs"
                  accentColor="#d4537e"
                  c={c}
                  onClick={() => navigate('programs')}
                />

                <NavCard 
                  label="Statistical Reports"
                  value="📊"
                  sub="Demographics & Visual Analytics"
                  accentColor="#3b82f6"
                  c={c}
                  onClick={() => navigate('reports')}
                />

                <NavCard 
                  label="Summary Reports"
                  value="📄"
                  sub="Generate Yearly & Monthly Reports"
                  accentColor="#d97706"
                  c={c}
                  onClick={() => navigate('summary-report')}
                />

                <NavCard 
                  label="Users"
                  value="⚙️"
                  sub="System Accounts & Access"
                  accentColor="#d4537e"
                  c={c}
                  onClick={() => navigate('users')}
                />

              </div>
            </div>

            {/* ── SECTION 2: Overviews ── */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: 24,
              alignItems: 'start'
            }}>
              {/* Active Kasambahay Summary */}
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

              {/* Programs & Trainings Overview */}
              <div style={{
                background: c.bgCard,
                border: `1px solid ${c.border}`,
                borderRadius: 10,
                padding: '16px 18px',
              }}>
                <SectionHeader title="Programs & Trainings Overview" c={c} />
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                    <thead>
                      <tr>
                        <th style={{ padding: '6px 8px', borderBottom: `2px solid ${c.border}`, color: c.textMuted }}>Program / Training</th>
                        <th style={{ padding: '6px 8px', borderBottom: `2px solid ${c.border}`, color: c.textMuted, textAlign: 'center' }}>Total</th>
                        <th style={{ padding: '6px 8px', borderBottom: `2px solid ${c.border}`, color: c.textMuted, textAlign: 'center' }}>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TRAININGS.map((t, i) => {
                        const count = stats.trainingCounts[t.key] || 0
                        const pct = stats.totalRecords ? ((count / stats.totalRecords) * 100).toFixed(1) + '%' : '0%'
                        return (
                          <tr key={t.key} style={{ background: i % 2 === 0 ? 'transparent' : `${c.border}22` }}>
                            <td style={{ padding: '6px 8px', borderBottom: `1px solid ${c.border}`, color: c.text, fontWeight: 500 }}>{t.label}</td>
                            <td style={{ padding: '6px 8px', borderBottom: `1px solid ${c.border}`, color: c.text, textAlign: 'center', fontWeight: 600 }}>{count.toLocaleString()}</td>
                            <td style={{ padding: '6px 8px', borderBottom: `1px solid ${c.border}`, color: c.accent || '#534AB7', textAlign: 'center', fontWeight: 600 }}>{pct}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  )
}