import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── Constants ────────────────────────────────────────────────────────────────
const YEARS     = [2024, 2025]
const DISTRICTS = [1, 2, 3, 4, 5, 6]
export const API = "https://kasambahay-backend.onrender.com/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` }
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
function ChartIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )
}
function ListIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><circle cx="3" cy="6" r="1" fill={color}/>
      <circle cx="3" cy="12" r="1" fill={color}/><circle cx="3" cy="18" r="1" fill={color}/>
    </svg>
  )
}
function UsersIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}
function LogoutIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
function SearchIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}

const NAV = [
  { key: 'overview', label: 'Overview', icon: ChartIcon },
  { key: 'records',  label: 'Records',  icon: ListIcon  },
  { key: 'users',    label: 'Users',    icon: UsersIcon },
]

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ ...s.statCard, borderTop: `3px solid ${accent}` }}>
      <p style={s.statLabel}>{label}</p>
      <p style={s.statValue}>{value ?? '—'}</p>
      {sub && <p style={s.statSub}>{sub}</p>}
    </div>
  )
}

function Badge({ text, color = 'gray' }) {
  const map = {
    green: { bg: '#eaf3de', text: '#3b6d11' },
    blue:  { bg: '#e6f1fb', text: '#185fa5' },
    amber: { bg: '#faeeda', text: '#854f0b' },
    red:   { bg: '#fcebeb', text: '#a32d2d' },
    gray:  { bg: '#f1efe8', text: '#5f5e5a' },
    navy:  { bg: '#e8eaf4', text: '#1a2744' },
  }
  const c = map[color] || map.gray
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: 20, background: c.bg, color: c.text, whiteSpace: 'nowrap' }}>
      {text}
    </span>
  )
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        // Use the /stats endpoint — one call, all the data we need
        const res = await fetch(`${API}/kasambahay/stats`, { headers: authHeader() })

        if (res.status === 401) {
          // Token expired — redirect to login
          localStorage.clear()
          window.location.href = '/login'
          return
        }

        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          setError(j.message || `Server error ${res.status}`)
          setLoading(false)
          return
        }

        const { total, breakdown } = await res.json()

        // breakdown = [{ _id: { year, district }, count }]
        // We need per-field counts so we fetch all records (paginated) for gender/liveIn/etc.
        // But to keep it fast, fetch just page 1 with limit=500 and show what we have,
        // OR use the breakdown totals we already have.
        // For now: show total + district breakdown from /stats, and fetch detailed counts separately.

        const detailRes = await fetch(`${API}/kasambahay?limit=500`, { headers: authHeader() })
        let detailed = { female: 0, male: 0, liveIn: 0, senior: 0, trained: 0 }

        if (detailRes.ok) {
          const detailJson = await detailRes.json()
          // API returns { data: [...], pagination: {...} }
          const records = detailJson.data || []
          detailed = {
            female:  records.filter(r => r.isFemale).length,
            male:    records.filter(r => r.isMale).length,
            liveIn:  records.filter(r => r.isLiveIn).length,
            senior:  records.filter(r => r.isSeniorCitizen).length,
            trained: records.filter(r => r.kasambahayOrientation).length,
          }
        }

        setStats({ total, breakdown, ...detailed })
      } catch (err) {
        setError('Failed to load statistics. Is the server running?')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div style={s.loadingBox}>Loading statistics…</div>
  if (error)   return <div style={s.errorBox}>⚠ {error}</div>
  if (!stats)  return null

  return (
    <div>
      <div style={s.sectionHead}>
        <h2 style={s.sectionTitle}>System Overview</h2>
        <p style={s.sectionSub}>Aggregate statistics across all districts and years</p>
      </div>

      <div style={s.statGrid}>
        <StatCard label="Total Records"       value={stats.total.toLocaleString()}   sub="All districts, all years"  accent="#1a2744" />
        <StatCard label="Female Kasambahay"   value={stats.female.toLocaleString()}  sub={`${stats.male} male`}      accent="#d4537e" />
        <StatCard label="Live-in Arrangement" value={stats.liveIn.toLocaleString()}  sub="Residential workers"       accent="#1d9e75" />
        <StatCard label="Orientation Trained" value={stats.trained.toLocaleString()} sub="Attended orientation"      accent="#ba7517" />
      </div>

      <div style={s.card}>
        <div style={s.cardHead}>
          <span style={s.cardHeadTitle}>Records by year &amp; district</span>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {stats.breakdown.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 13 }}>No data yet. Run the seeder or import records.</p>
          ) : stats.breakdown.map(b => (
            <div key={`${b._id.year}-${b._id.district}`} style={{ ...s.breakdownItem, borderLeft: '3px solid #1a2744' }}>
              <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {b._id.year} · {b._id.district}
              </span>
              <span style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginTop: 2 }}>
                {b.count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={s.card}>
        <div style={s.cardHead}>
          <span style={s.cardHeadTitle}>Classification breakdown</span>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {[
            ['Total',            stats.total,   '#1a2744'],
            ['Female',           stats.female,  '#d4537e'],
            ['Male',             stats.male,    '#185fa5'],
            ['Live-in',          stats.liveIn,  '#1d9e75'],
            ['Senior Citizen',   stats.senior,  '#ba7517'],
            ['Orientation Done', stats.trained, '#639922'],
          ].map(([label, count, color]) => (
            <div key={label} style={{ ...s.breakdownItem, borderLeft: `3px solid ${color}` }}>
              <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              <span style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginTop: 2 }}>{count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── RECORDS TAB ──────────────────────────────────────────────────────────────
function RecordsTab() {
  const [year, setYear]         = useState('')
  const [district, setDistrict] = useState('')
  const [search, setSearch]     = useState('')
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState(null)

  const fetchData = useCallback(async () => {
    if (!year || !district) return
    setLoading(true)
    setError('')
    setSearched(false)
    try {
      const params = new URLSearchParams({ year, district, limit: 500 })
      const res = await fetch(`${API}/kasambahay?${params}`, { headers: authHeader() })

      if (res.status === 401) { localStorage.clear(); window.location.href = '/login'; return }

      const json = await res.json()
      if (!res.ok) { setError(json.message || 'Failed to load'); return }

      // ✅ FIX: API returns { data: [...], pagination: {...} }
      setData(json.data || [])
      setSearched(true)
    } catch {
      setError('Failed to load records. Is the server running on port 5000?')
    } finally {
      setLoading(false)
    }
  }, [year, district])

  const filtered = data.filter(k => {
    const q = search.toLowerCase()
    return !q || [k.lastName, k.firstName, k.barangay, k.mobileNumber].some(v => v?.toLowerCase().includes(q))
  })

  const jobLabel = (k) => {
    if (k.isGeneralHousehelp) return 'Househelp'
    if (k.isCook)             return 'Cook'
    if (k.isLaundryPerson)    return 'Laundry'
    if (k.isYaya)             return 'Yaya'
    if (k.isGardener)         return 'Gardener'
    return '—'
  }

  const arrangementLabel = (k) => {
    if (k.isLiveIn)  return 'Live-in'
    if (k.isLiveOut) return 'Live-out'
    if (k.isOnCall)  return 'On-call'
    return '—'
  }

  return (
    <div>
      <div style={s.sectionHead}>
        <h2 style={s.sectionTitle}>Kasambahay Records</h2>
        <p style={s.sectionSub}>Select a year and district to load records</p>
      </div>

      <div style={s.filterBar}>
        <div style={s.filterGroup}>
          <label style={s.filterLabel}>Year</label>
          <select value={year} onChange={e => setYear(e.target.value)} style={s.select}>
            <option value="">Select year</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={s.filterGroup}>
          <label style={s.filterLabel}>District</label>
          <select value={district} onChange={e => setDistrict(e.target.value)} style={s.select}>
            <option value="">Select district</option>
            {DISTRICTS.map(d => <option key={d} value={d}>District {d}</option>)}
          </select>
        </div>
        <button
          onClick={fetchData}
          disabled={!year || !district || loading}
          style={{ ...s.btn, ...(!year || !district ? s.btnDisabled : {}) }}
        >
          {loading ? 'Loading…' : 'Load records'}
        </button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {searched && (
        <div style={s.card}>
          <div style={s.tableToolbar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                {year} — District {district}
              </span>
              <Badge text={`${filtered.length} records`} color="navy" />
            </div>
            <div style={s.searchWrap}>
              <SearchIcon />
              <input
                type="text"
                placeholder="Search name or barangay…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={s.searchInput}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr style={{ background: '#f9f8f5' }}>
                  {['#', 'Full Name', 'Barangay', 'Birthday', 'Age', 'Civil Status', 'Salary', 'Gender', 'Type', 'Arrangement', 'Mobile', ''].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: '40px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                      {search ? 'No records match your search.' : 'No records found for this selection.'}
                    </td>
                  </tr>
                ) : filtered.map((k, i) => (
                  <tr
                    key={k._id}
                    style={{ ...s.tr, cursor: 'pointer' }}
                    onClick={() => setSelected(k)}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9f8f5'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ ...s.td, color: '#9ca3af', width: 40 }}>{i + 1}</td>
                    <td style={{ ...s.td, fontWeight: 500, color: '#111827', whiteSpace: 'nowrap' }}>
                      {k.lastName}, {k.firstName} {k.middleName ? k.middleName[0] + '.' : ''}
                    </td>
                    <td style={s.td}>{k.barangay || '—'}</td>
                    <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                      {k.birthday ? new Date(k.birthday).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td style={s.td}>{k.age || '—'}</td>
                    <td style={s.td}>{k.civilStatus || '—'}</td>
                    <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                      {k.monthlySalary ? `₱${k.monthlySalary.toLocaleString()}` : '—'}
                    </td>
                    <td style={s.td}>
                      <Badge text={k.isFemale ? 'Female' : k.isMale ? 'Male' : '—'} color={k.isFemale ? 'blue' : 'gray'} />
                    </td>
                    <td style={s.td}>{jobLabel(k)}</td>
                    <td style={s.td}>
                      <Badge text={arrangementLabel(k)} color={k.isLiveIn ? 'green' : k.isLiveOut ? 'amber' : 'gray'} />
                    </td>
                    <td style={{ ...s.td, whiteSpace: 'nowrap' }}>{k.mobileNumber || '—'}</td>
                    <td style={s.td}>
                      <span style={{ fontSize: 11, color: '#2563a8', fontWeight: 500 }}>View →</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <DetailDrawer record={selected} onClose={() => setSelected(null)} jobLabel={jobLabel} arrangementLabel={arrangementLabel} />
      )}
    </div>
  )
}

// ─── DETAIL DRAWER ────────────────────────────────────────────────────────────
function DetailDrawer({ record: k, onClose, jobLabel, arrangementLabel }) {
  const initials = `${k.firstName?.[0] || ''}${k.lastName?.[0] || ''}`.toUpperCase()

  const trainingFields = [
    ['Kasambahay Orientation', k.kasambahayOrientation],
    ['Kasambahay Organizing',  k.kasambahayOrganizing],
    ['Occ. Safety & Health',   k.occupationalSafetyAndHealth],
    ['Gender Sensitivity',     k.genderSensitivityTraining],
    ['Basic First Aid',        k.basicFirstAidTraining],
    ['Home Security',          k.homeSecurityAwareness],
    ['General Assembly',       k.kasambahayGeneralAssembly],
    ['Kasambahay Day',         k.kasambahayDay],
    ['Disaster Preparedness',  k.disasterPreparedness],
  ]

  return (
    <>
      <div style={s.overlay} onClick={onClose} />
      <div style={s.drawer}>
        <div style={s.drawerHead}>
          <div style={s.drawerAvatar}>{initials}</div>
          <div style={{ flex: 1 }}>
            <h3 style={s.drawerName}>{k.firstName} {k.middleName} {k.lastName}</h3>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              <Badge text={`${k.district || 'District ?'}`} color="navy" />
              <Badge text={String(k.year || '')} color="gray" />
              <Badge text={jobLabel(k)} color="green" />
            </div>
          </div>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        <div style={s.drawerBody}>
          <Section title="Personal Information">
            <Row label="Birthday"     value={k.birthday ? new Date(k.birthday).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} />
            <Row label="Age"          value={k.age || '—'} />
            <Row label="Civil Status" value={k.civilStatus || '—'} />
            <Row label="Birth Place"  value={k.birthPlace || '—'} />
            <Row label="Residence"    value={k.currentResidence || '—'} />
            <Row label="Education"    value={k.educationalAttainment || '—'} />
            <Row label="Mobile"       value={k.mobileNumber || '—'} />
          </Section>

          <Section title="Employment">
            <Row label="Monthly Salary"    value={k.monthlySalary ? `₱${k.monthlySalary.toLocaleString()}` : '—'} />
            <Row label="Employer Address"  value={k.employerAddress || '—'} />
            <Row label="Work Type"         value={jobLabel(k)} />
            <Row label="Arrangement"       value={arrangementLabel(k)} />
            <Row label="Length of Service" value={k.lengthOfService || '—'} />
            <Row label="Employer's Work"   value={k.workOfEmployer || '—'} />
          </Section>

          <Section title="Government IDs">
            <Row label="SSS"        value={k.sss || '—'} />
            <Row label="Pag-IBIG"   value={k.pagIbig || '—'} />
            <Row label="PhilHealth" value={k.philhealth || '—'} />
            <Row label="QCID"       value={k.qcid || '—'} />
          </Section>

          <Section title="Classifications">
            <Row label="Ex-OFW"        value={k.isExOfw ? 'Yes' : 'No'} />
            <Row label="Solo Parent"   value={k.isSoloParent ? 'Yes' : 'No'} />
            <Row label="PWD"           value={k.isPersonWithDisability ? 'Yes' : 'No'} />
            <Row label="Senior Citizen" value={k.isSeniorCitizen ? 'Yes' : 'No'} />
            <Row label="KAPSA Member"  value={k.isKapsaMember ? 'Yes' : 'No'} />
            <Row label="BCOOP Member"  value={k.isBcoopMember ? 'Yes' : 'No'} />
          </Section>

          <Section title="Trainings Attended">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
              {trainingFields.map(([label, attended]) => (
                <span key={label} style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 500,
                  background: attended ? '#eaf3de' : '#f1efe8',
                  color: attended ? '#3b6d11' : '#9ca3af',
                }}>
                  {attended ? '✓ ' : ''}{label}
                </span>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', fontWeight: 500, marginBottom: 10 }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '7px 0', borderBottom: '1px solid #f3f4f6', gap: 12 }}>
      <span style={{ fontSize: 13, color: '#6b7280', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#111827', textAlign: 'right', wordBreak: 'break-word', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}

// ─── USERS TAB ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    fetch(`${API}/users`, { headers: authHeader() })
      .then(r => r.json())
      .then(data => { setUsers(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setError('Failed to load users.'); setLoading(false) })
  }, [])

  return (
    <div>
      <div style={s.sectionHead}>
        <h2 style={s.sectionTitle}>System Users</h2>
        <p style={s.sectionSub}>Accounts with access to this system</p>
      </div>
      <div style={s.card}>
        <div style={{ ...s.tableToolbar, borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>All users</span>
          {!loading && <Badge text={`${users.length} accounts`} color="navy" />}
        </div>
        {error && <div style={{ ...s.errorBox, margin: 16 }}>{error}</div>}
        <table style={s.table}>
          <thead>
            <tr style={{ background: '#f9f8f5' }}>
              {['Name', 'Email', 'Role', 'Joined'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No users found.</td></tr>
            ) : users.map(u => (
              <tr key={u._id || u.email} style={s.tr}>
                <td style={{ ...s.td, fontWeight: 500, color: '#111827' }}>{u.name}</td>
                <td style={{ ...s.td, color: '#6b7280' }}>{u.email}</td>
                <td style={s.td}>
                  <Badge text={u.role} color={u.role === 'admin' ? 'navy' : 'green'} />
                </td>
                <td style={{ ...s.td, color: '#6b7280' }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-PH') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [tab, setTab] = useState('overview')
  const navigate      = useNavigate()
  const user          = JSON.parse(localStorage.getItem('user') || '{}')
  const initials      = user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AD'

  const logout = () => {
    localStorage.clear()
    navigate('/login')
  }

  return (
    <div style={s.shell}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sidebarLogo}>
          <div style={s.logoMark}>K</div>
          <div>
            <p style={s.logoName}>Kasambahay</p>
            <p style={s.logoSub}>QC Gov't System</p>
          </div>
        </div>

        <nav style={s.nav}>
          <p style={s.navSection}>Main</p>
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{ ...s.navItem, ...(tab === key ? s.navItemActive : {}) }}
            >
              <Icon color={tab === key ? '#1a2744' : '#9ca3af'} />
              {label}
            </button>
          ))}
        </nav>

        <div style={s.sidebarFooter}>
          <div style={s.userChip}>
            <div style={s.userAvatar}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.userName}>{user.name || 'Administrator'}</p>
              <p style={s.userRole}>{user.role || 'admin'}</p>
            </div>
          </div>
          <button onClick={logout} style={s.logoutBtn}>
            <LogoutIcon color="#ef4444" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={s.main}>
        <header style={s.topbar}>
          <h1 style={s.topbarTitle}>
            {tab === 'overview' ? 'Overview' : tab === 'records' ? 'Records' : 'Users'}
          </h1>
          <div style={s.topbarRight}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
        </header>

        <div style={s.content}>
          {tab === 'overview' && <OverviewTab />}
          {tab === 'records'  && <RecordsTab />}
          {tab === 'users'    && <UsersTab />}
        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f4f3ef; }
        select:focus, input:focus { outline: none; border-color: #2563a8; box-shadow: 0 0 0 3px rgba(37,99,168,0.1); }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1cfc7; border-radius: 3px; }
      `}</style>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  shell:       { display: 'flex', height: '100vh', fontFamily: "'DM Sans', sans-serif", background: '#f4f3ef', overflow: 'hidden' },
  sidebar:     { width: 230, flexShrink: 0, background: '#fff', borderRight: '1px solid #e8e5de', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  sidebarLogo: { display: 'flex', alignItems: 'center', gap: 10, padding: '20px 18px', borderBottom: '1px solid #f3f4f6' },
  logoMark:    { width: 32, height: 32, borderRadius: 8, background: '#1a2744', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: "'DM Serif Display', serif", flexShrink: 0 },
  logoName:    { fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.2 },
  logoSub:     { fontSize: 11, color: '#9ca3af', lineHeight: 1.2 },
  nav:         { flex: 1, padding: '12px 10px', overflowY: 'auto' },
  navSection:  { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c9c7c0', fontWeight: 500, padding: '8px 8px 4px', marginBottom: 2 },
  navItem:     { display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px', borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#6b7280', fontFamily: "'DM Sans', sans-serif", fontWeight: 400, textAlign: 'left', marginBottom: 1 },
  navItemActive: { background: '#eef0f5', color: '#1a2744', fontWeight: 500 },
  sidebarFooter: { padding: '12px 10px', borderTop: '1px solid #f3f4f6' },
  userChip:    { display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', marginBottom: 4 },
  userAvatar:  { width: 30, height: 30, borderRadius: '50%', background: '#eef0f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#1a2744', flexShrink: 0 },
  userName:    { fontSize: 12, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userRole:    { fontSize: 11, color: '#9ca3af' },
  logoutBtn:   { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#ef4444', fontFamily: "'DM Sans', sans-serif", fontWeight: 400, textAlign: 'left' },
  main:        { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar:      { height: 56, background: '#fff', borderBottom: '1px solid #e8e5de', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0 },
  topbarTitle: { fontSize: 16, fontWeight: 600, color: '#111827' },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 12 },
  content:     { flex: 1, overflowY: 'auto', padding: '28px 32px' },
  sectionHead: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: 600, color: '#111827', fontFamily: "'DM Serif Display', serif", marginBottom: 4 },
  sectionSub:  { fontSize: 13, color: '#6b7280' },
  statGrid:    { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 },
  statCard:    { background: '#fff', border: '1px solid #e8e5de', borderRadius: 10, padding: '16px 20px' },
  statLabel:   { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', fontWeight: 500, marginBottom: 8 },
  statValue:   { fontSize: 26, fontWeight: 700, color: '#111827', fontFamily: "'DM Serif Display', serif", lineHeight: 1, marginBottom: 6 },
  statSub:     { fontSize: 12, color: '#9ca3af' },
  card:        { background: '#fff', border: '1px solid #e8e5de', borderRadius: 10, overflow: 'hidden', marginBottom: 20 },
  cardHead:    { padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cardHeadTitle: { fontSize: 13, fontWeight: 600, color: '#111827' },
  breakdownItem: { display: 'flex', flexDirection: 'column', paddingLeft: 12, minWidth: 120 },
  filterBar:   { background: '#fff', border: '1px solid #e8e5de', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 20, flexWrap: 'wrap' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: 6 },
  filterLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', fontWeight: 500 },
  select:      { height: 38, padding: '0 12px', fontSize: 13, border: '1px solid #d1cfc7', borderRadius: 7, background: '#fafaf9', color: '#111827', cursor: 'pointer', minWidth: 160, fontFamily: "'DM Sans', sans-serif" },
  btn:         { height: 38, padding: '0 20px', background: '#1a2744', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0 },
  btnDisabled: { background: '#d1cfc7', cursor: 'not-allowed' },
  errorBox:    { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginBottom: 16 },
  loadingBox:  { background: '#fff', border: '1px solid #e8e5de', borderRadius: 10, padding: '40px 20px', textAlign: 'center', fontSize: 13, color: '#9ca3af' },
  tableToolbar: { padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid #f3f4f6' },
  searchWrap:  { display: 'flex', alignItems: 'center', gap: 8, background: '#fafaf9', border: '1px solid #e8e5de', borderRadius: 7, padding: '0 12px', height: 34, color: '#9ca3af' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#111827', width: 200, fontFamily: "'DM Sans', sans-serif" },
  table:       { width: '100%', borderCollapse: 'collapse' },
  th:          { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' },
  tr:          { borderBottom: '1px solid #f9f8f5' },
  td:          { padding: '10px 12px', fontSize: 12, color: '#374151' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100 },
  drawer:      { position: 'fixed', top: 0, right: 0, width: 420, height: '100vh', background: '#fff', borderLeft: '1px solid #e8e5de', zIndex: 101, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  drawerHead:  { display: 'flex', alignItems: 'flex-start', gap: 14, padding: '20px 22px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 },
  drawerAvatar: { width: 44, height: 44, borderRadius: '50%', background: '#eef0f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: '#1a2744', flexShrink: 0 },
  drawerName:  { fontSize: 15, fontWeight: 600, color: '#111827', lineHeight: 1.3 },
  closeBtn:    { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9ca3af', padding: 4, lineHeight: 1, flexShrink: 0, marginLeft: 'auto' },
  drawerBody:  { flex: 1, overflowY: 'auto', padding: '20px 22px' },
}
