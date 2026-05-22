import { useColors } from '../ThemeContext.jsx'
import { useState, useEffect } from 'react'
import { API_ENDPOINTS } from '../utils/api'
import { getRole, getCurrentUser } from '../rbac'

const BASE_URL = 'https://kasambahay-backend.onrender.com/api'
const DISTRICTS = ['District 1', 'District 2', 'District 3', 'District 4', 'District 5', 'District 6']

function authHeader() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }
}

// ─── Tooltip / Tip component ──────────────────────────────────────────────────
function Tip({ children }) {
  const [open, setOpen] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 6 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 18, height: 18, borderRadius: '50%', border: '1.5px solid #a09ec0',
          background: open ? '#534AB7' : '#fff', color: open ? '#fff' : '#a09ec0',
          fontSize: 11, fontWeight: 700, cursor: 'pointer', lineHeight: 1,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
        }}
        title="Show tip"
      >?</button>
      {open && (
        <span style={{
          position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)',
          background: '#2d2a6e', color: '#fff', borderRadius: 8, padding: '8px 12px',
          fontSize: 12, lineHeight: 1.5, width: 240, zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          whiteSpace: 'normal',
        }}>
          {children}
          <button onClick={() => setOpen(false)} style={{ position: 'absolute', top: 4, right: 8, background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
        </span>
      )}
    </span>
  )
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
function Section({ icon, title, tip, children, adminOnly }) {
  const role = getRole()
  if (adminOnly && role !== 'Admin') return null
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e4e2f5', marginBottom: 20, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0eefb', display: 'flex', alignItems: 'center', gap: 8, background: '#faf9fe' }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#2d2a6e' }}>{title}</span>
        <Tip>{tip}</Tip>
        {adminOnly && (
          <span style={{ marginLeft: 'auto', fontSize: 11, background: '#edeaf9', color: '#534AB7', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
            Admin only
          </span>
        )}
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      background: type === 'error' ? '#fef2f2' : '#f0fdf4',
      border: `1px solid ${type === 'error' ? '#fca5a5' : '#86efac'}`,
      color: type === 'error' ? '#b91c1c' : '#15803d',
      borderRadius: 10, padding: '12px 20px', fontSize: 13, fontWeight: 600,
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)', maxWidth: 320,
    }}>
      {type === 'error' ? '❌' : '✅'} {msg}
    </div>
  )
}

// ─── Active Year Setting ──────────────────────────────────────────────────────
function ActiveYearSection({ toast }) {
  const STORAGE_KEY = 'kasambahay_active_year'
  const [year, setYear] = useState(() => parseInt(localStorage.getItem(STORAGE_KEY)) || new Date().getFullYear())
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, year)
    setSaved(true)
    toast('Active year updated to ' + year + '. New records will default to this year.', 'success')
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Section
      icon="📅"
      title="Active Encoding Year"
      adminOnly
      tip="Set the current year that Encoders are working on. When adding a new record, this year will be pre-filled automatically so they don't have to type it every time."
    >
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#666', lineHeight: 1.6 }}>
        This controls the default year pre-filled when adding new Kasambahay records.
        Change this at the start of each encoding year.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <select
          value={year}
          onChange={e => setYear(parseInt(e.target.value))}
          style={{ height: 40, padding: '0 12px', fontSize: 14, border: '1px solid #e4e4e7', borderRadius: 6, outline: 'none', minWidth: 120 }}
        >
          {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={handleSave} style={Btn.primary}>
          {saved ? '✓ Saved' : 'Save Year'}
        </button>
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 12, color: '#a09ec0' }}>
        💡 Tip: This is saved locally on this device. Each admin device should set this independently.
      </p>
    </Section>
  )
}

// ─── Barangay Manager ─────────────────────────────────────────────────────────
const DEFAULT_BARANGAYS = {
  'District 1': ['Alicia','Bagong Pag-asa','Bahay Toro','Balingasa','Bungad','Damar','Damayan','Del Monte','Katipunan','Laging Handa','Maharlika','Manresa','Mariblo','Masambong','New Era','Pag-ibig sa Nayon','Paang Bundok','Pahinga Norte','Pahinga Sur','Project 6','Ramon Magsaysay','Saint Peter','Salvacion','San Antonio','San Isidro Labrador','San Jose','Siena','Talayan','Veterans Village','West Triangle'],
  'District 2': ['Amihan','Bagong Silangan','Batasan Hills','Commonwealth','Holy Spirit','Payatas','Sauyo'],
  'District 3': ['Bagumbayan','Bagumbuhay','Bayanihan','Blue Ridge A','Blue Ridge B','Camp Aguinaldo','Claro','Dioquino Zobel','Duyan-Duyan','E. Rodriguez','East Kamias','Escopa I','Escopa II','Escopa III','Escopa IV','Kristong Hari','Krus na Ligas','Lourdes','Loyola Heights','Maharlika','Manga','Manhik','Mariana','Masagana','Matandang Balara','Milagrosa','Pansol','Quirino 2-A','Quirino 2-B','Quirino 2-C','Quirino 3-A','San Roque','Silangan','Socorro','Tagumpay','Ugong Norte','Villa Maria Clara','West Kamias','White Plains'],
  'District 4': ['Bagong Lipunan ng Crame','Botocan','Central','Damayang Lagi','Don Manuel','Doña Aurora','Doña Imelda','Doña Josefa','Horseshoe','Immaculate Concepcion','Kalusugan','Kamuning','Kaunlaran','Kristong Hari','Krus na Ligas','Laging Handa','Malaya','Marilag','Obrero','Old Capitol Site','Paligsahan','Pinagkaisahan','Pinyahan','Roxas','Sacred Heart','San Isidro Galas','San Martin de Porres','San Vicente','Santol','Scout Borromeo','Scout Chua','Scout Madriñan','Scout Rallos','Scout Albano','Sikatuna Village','South Triangle','Talayan','Teacher\'s Village East','Teacher\'s Village West','U.P. Campus','U.P. Village','Valencia'],
  'District 5': ['Bagbag','Capri','Fairview','Glendale','Greater Lagro','Gulod','Kaligayahan','Nagkaisang Nayon','North Fairview','Novaliches Proper','Paligayahan','San Agustin','San Bartolome','San Francisco','San Isidro','Sta. Lucia','Sta. Monica','Pasong Putik Proper','Sangandaan'],
  'District 6': ['Apolonio Samson','Baesa','Balumbato','Culiat','New Era','Pasong Tamo','Sangandaan','Sauyo','Talipapa','Tandang Sora','Unang Sigaw'],
}

function BarangayManagerSection({ toast }) {
  const STORAGE_KEY = 'kasambahay_barangay_list'
  const [district, setDistrict] = useState('District 1')
  const [list, setList] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_BARANGAYS }
    catch { return DEFAULT_BARANGAYS }
  })
  const [newName, setNewName] = useState('')
  const [filter, setFilter] = useState('')

  const save = (updated) => {
    setList(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const add = () => {
    const name = newName.trim()
    if (!name) return
    if (list[district]?.map(b => b.toLowerCase()).includes(name.toLowerCase())) {
      toast('That barangay already exists in ' + district, 'error'); return
    }
    const updated = { ...list, [district]: [...(list[district] || []), name].sort() }
    save(updated)
    setNewName('')
    toast(`Added "${name}" to ${district}`, 'success')
  }

  const remove = (brgy) => {
    if (!confirm(`Remove "${brgy}" from ${district}?`)) return
    const updated = { ...list, [district]: list[district].filter(b => b !== brgy) }
    save(updated)
    toast(`Removed "${brgy}"`, 'success')
  }

  const reset = () => {
    if (!confirm('Reset all barangay lists to the default QC list? This cannot be undone.')) return
    save(DEFAULT_BARANGAYS)
    toast('Barangay list reset to defaults.', 'success')
  }

  const filtered = (list[district] || []).filter(b => b.toLowerCase().includes(filter.toLowerCase()))

  return (
    <Section
      icon="📍"
      title="Barangay List Manager"
      adminOnly
      tip="Manage the official list of barangays per district. When this list is set, Encoders will pick from a dropdown instead of typing freely — this prevents spelling errors and keeps your reports consistent."
    >
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#666', lineHeight: 1.6 }}>
        Add or remove barangays per district. Pre-loaded with all official QC barangays.
        Changes here will reflect in the Add/Edit form dropdowns.
      </p>

      {/* District selector */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        {DISTRICTS.map(d => (
          <button key={d} onClick={() => { setDistrict(d); setFilter('') }}
            style={{ ...Btn.tab, ...(district === d ? Btn.tabActive : {}) }}>
            {d.replace('District ', 'D')}
            <span style={{ marginLeft: 5, fontSize: 11, opacity: 0.75 }}>({(list[d] || []).length})</span>
          </button>
        ))}
      </div>

      {/* Add new */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={`Add barangay to ${district}…`}
          style={{ flex: 1, height: 38, padding: '0 12px', fontSize: 13, border: '1px solid #e4e4e7', borderRadius: 6, outline: 'none' }}
        />
        <button onClick={add} style={Btn.primary}>+ Add</button>
      </div>

      {/* Filter */}
      <input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Filter barangays…"
        style={{ width: '100%', height: 36, padding: '0 12px', fontSize: 12, border: '1px solid #e4e4e7', borderRadius: 6, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
      />

      {/* List */}
      <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #e4e2f5', borderRadius: 8, marginBottom: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#aaa', fontSize: 13 }}>No barangays found</div>
        ) : filtered.map((b, i) => (
          <div key={b} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', background: i % 2 === 0 ? '#fff' : '#faf9fe', borderBottom: '1px solid #f0ecf9' }}>
            <span style={{ fontSize: 13 }}>{b}</span>
            <button onClick={() => remove(b)} style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }} title="Remove">×</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 12, color: '#a09ec0' }}>
          {filtered.length} of {(list[district] || []).length} barangay{(list[district] || []).length !== 1 ? 's' : ''} shown
        </span>
        <button onClick={reset} style={Btn.danger}>↺ Reset to defaults</button>
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 12, color: '#a09ec0' }}>
        💡 Tip: This list is saved locally. To apply it across all devices, ask your developer to move it to the database.
      </p>
    </Section>
  )
}

// ─── Change Password ──────────────────────────────────────────────────────────
function ChangePasswordSection({ toast }) {
  const user = getCurrentUser()
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState({ current: false, newPass: false, confirm: false })

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const toggleShow = key => setShow(s => ({ ...s, [key]: !s[key] }))

  const strength = (pw) => {
    let score = 0
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    return score
  }

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColor = ['', '#e53e3e', '#f6ad55', '#68d391', '#38a169']
  const s = strength(form.newPass)

  const handleSubmit = async () => {
    if (!form.current || !form.newPass || !form.confirm) { toast('Please fill in all fields.', 'error'); return }
    if (form.newPass !== form.confirm) { toast('New passwords do not match.', 'error'); return }
    if (form.newPass.length < 6) { toast('Password must be at least 6 characters.', 'error'); return }

    setLoading(true)
    try {
      // Re-authenticate first by calling login
      const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: form.current }),
      })
      if (!loginRes.ok) { toast('Current password is incorrect.', 'error'); setLoading(false); return }

      // Then update password via PUT /users/:id
      const res = await fetch(`${BASE_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: authHeader(),
        body: JSON.stringify({ password: form.newPass }),
      })
      if (!res.ok) { const e = await res.json(); toast(e.message || 'Failed to update password.', 'error'); setLoading(false); return }

      toast('Password changed successfully!', 'success')
      setForm({ current: '', newPass: '', confirm: '' })
    } catch {
      toast('Something went wrong. Please try again.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const EyeBtn = ({ field }) => (
    <button type="button" onClick={() => toggleShow(field)}
      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#a09ec0', fontSize: 16, padding: 0 }}>
      {show[field] ? '🙈' : '👁️'}
    </button>
  )

  const PwField = ({ label, name, tip }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 }}>
        {label} <Tip>{tip}</Tip>
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={show[name] ? 'text' : 'password'}
          name={name}
          value={form[name]}
          onChange={handleChange}
          style={{ width: '100%', height: 40, padding: '0 40px 0 12px', fontSize: 14, border: '1px solid #e4e4e7', borderRadius: 6, outline: 'none', boxSizing: 'border-box' }}
        />
        <EyeBtn field={name} />
      </div>
    </div>
  )

  return (
    <Section
      icon="🔐"
      title="Change Password"
      tip="You can change your own login password here. You'll need to enter your current password first to confirm it's really you. Choose a strong password with at least 8 characters."
    >
      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#666', lineHeight: 1.6 }}>
        Logged in as <strong>{user.name}</strong> ({user.email}) · Role: <strong>{user.role}</strong>
      </p>
      <div style={{ maxWidth: 360 }}>
        <PwField label="Current Password" name="current" tip="Enter the password you use right now to log in." />
        <PwField label="New Password" name="newPass" tip="Choose a new password. At least 8 characters is recommended. Mix letters, numbers, and symbols for a stronger password." />

        {/* Strength meter */}
        {form.newPass.length > 0 && (
          <div style={{ marginBottom: 16, marginTop: -8 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: i <= s ? strengthColor[s] : '#e4e2f5', transition: 'background 0.3s' }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: strengthColor[s], fontWeight: 600 }}>{strengthLabel[s]}</span>
          </div>
        )}

        <PwField label="Confirm New Password" name="confirm" tip="Type your new password again to make sure there are no typos." />

        {form.confirm.length > 0 && form.newPass !== form.confirm && (
          <p style={{ fontSize: 12, color: '#e53e3e', margin: '-8px 0 12px' }}>⚠ Passwords do not match</p>
        )}

        <button onClick={handleSubmit} disabled={loading} style={{ ...Btn.primary, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Saving…' : '🔐 Change Password'}
        </button>
      </div>
    </Section>
  )
}

// ─── My Account Info (read-only) ──────────────────────────────────────────────
function AccountInfoSection() {
  const user = getCurrentUser()
  const roleColors = { Admin: ['#edeaf9','#534AB7'], Encoder: ['#EAF3DE','#3B6D11'], helper: ['#fef3c7','#92400e'] }
  const [rc, rt] = roleColors[user.role] || ['#f0f0f0','#555']

  return (
    <Section
      icon="👤"
      title="My Account"
      tip="This shows your current account details. Your role determines what you can see and do in the system. Contact your Admin if any info is wrong."
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {[
          { label: 'Full Name', value: user.name || '—' },
          { label: 'Email', value: user.email || '—' },
          { label: 'Role', value: (
            <span style={{ background: rc, color: rt, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
              {user.role || '—'}
            </span>
          )},
        ].map(item => (
          <div key={item.label} style={{ background: '#faf9fe', borderRadius: 8, padding: '12px 14px', border: '1px solid #e4e2f5' }}>
            <div style={{ fontSize: 11, color: '#a09ec0', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.06em' }}>{item.label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2d2a6e' }}>{item.value}</div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ─── Button styles ────────────────────────────────────────────────────────────
const Btn = {
  primary: { padding: '9px 20px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  danger:  { padding: '7px 14px', background: '#fff', color: '#e53e3e', border: '1px solid #fca5a5', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 12 },
  tab:     { padding: '6px 14px', background: '#f0eefb', color: '#534AB7', border: '1px solid #e4e2f5', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
  tabActive: { background: '#534AB7', color: '#fff', border: '1px solid #534AB7' },
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [toast, setToast] = useState({ msg: '', type: '' })

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: '' }), 3500)
  }

  return (
    <div style={{ padding: '20px 16px', fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 13, color: 'inherit', background: 'transparent', minHeight: '100vh' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, color: '#2d2a6e', fontWeight: 700 }}>Settings</h2>
        <p style={{ margin: 0, color: '#888', fontSize: 12 }}>
          Click the <strong style={{ color: '#534AB7' }}>?</strong> button next to any section title for a quick tip on what it does.
        </p>
      </div>

      <AccountInfoSection />
      <ChangePasswordSection toast={showToast} />
      <ActiveYearSection toast={showToast} />
      <BarangayManagerSection toast={showToast} />

      <Toast msg={toast.msg} type={toast.type} />
    </div>
  )
}
