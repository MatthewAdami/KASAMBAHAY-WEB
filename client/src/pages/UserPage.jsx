import { useState, useEffect } from 'react'
import { API_ENDPOINTS } from '../utils/api'

// ─── Constants ────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: '#EEEDFE', fg: '#534AB7' },
  { bg: '#EAF3DE', fg: '#3B6D11' },
  { bg: '#E1F5EE', fg: '#0F6E56' },
  { bg: '#FAEEDA', fg: '#854F0B' },
  { bg: '#FAECE7', fg: '#993C1D' },
]

const ALL_DISTRICTS = ['District 1','District 2','District 3','District 4','District 5','District 6']
const ALL_YEARS     = [2023, 2024, 2025, 2026]
const ALL_ROLES     = ['Admin', 'SPES', 'GIP', 'helper']
const ROLE_LABELS   = { Admin: 'Admin', SPES: 'SPES Intern', GIP: 'GIP Intern', helper: 'Viewer' }

function initials(name = '') {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Shared input style ───────────────────────────────────────────────────────
const inputStyle = (hasErr = false) => ({
  width: '100%', padding: '7px 10px', borderRadius: 8,
  border: `1px solid ${hasErr ? '#E24B4A' : '#e4e4e7'}`,
  fontSize: 12.5, color: '#111', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box', background: '#fff',
})

// ─── Role pill style ──────────────────────────────────────────────────────────
function rolePill(role) {
  const map = {
    Admin:   { bg: '#EEEDFE', fg: '#534AB7' },
    SPES:    { bg: '#EAF3DE', fg: '#3B6D11' },
    GIP:     { bg: '#E0F0FF', fg: '#1D5FA8' },
    helper:  { bg: '#f3f3f3', fg: '#666' },
  }
  return map[role] || map.helper
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────
function ConfirmDeleteModal({ user, onClose, onConfirm }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 12, width: 360, maxWidth: '100%', border: '1px solid #e4e4e7', boxShadow: '0 8px 32px rgba(0,0,0,.15)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e4e4e7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>Delete account</span>
          <span style={{ cursor: 'pointer', color: '#aaa', fontSize: 18 }} onClick={onClose}>✕</span>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 12px' }}>🗑️</div>
          <p style={{ fontSize: 13, color: '#111', textAlign: 'center', fontWeight: 500 }}>
            Delete <strong>{user.name}</strong>?
          </p>
          <p style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 6 }}>
            This will permanently remove their account. This action cannot be undone.
          </p>
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e4e4e7', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e4e4e7', background: 'transparent', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ padding: '6px 14px', borderRadius: 8, background: '#ef4444', color: '#fff', fontSize: 12, cursor: 'pointer', border: 'none', fontFamily: 'inherit', fontWeight: 500 }}>
            Yes, delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add / Edit Account Modal ─────────────────────────────────────────────────
function AccountModal({ existing, onClose, onSave }) {
  const isEdit = !!existing

  const [name,      setName]      = useState(existing?.name     || '')
  const [email,     setEmail]     = useState(existing?.email    || '')
  const [password,  setPassword]  = useState('')
  const [role,      setRole]      = useState(existing?.role     || 'SPES')
  const [districts, setDistricts] = useState(existing?.assignedDistricts || [])
  const [years,     setYears]     = useState(existing?.assignedYears     || [])
  const [errors,    setErrors]    = useState({})

  const needsAssignment = role === 'SPES' || role === 'GIP' || role === 'helper'

  function toggleDistrict(d) {
    setDistricts(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }
  function toggleYear(y) {
    setYears(prev => prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y])
  }
  function toggleAllDistricts() {
    setDistricts(prev => prev.length === ALL_DISTRICTS.length ? [] : [...ALL_DISTRICTS])
  }
  function toggleAllYears() {
    setYears(prev => prev.length === ALL_YEARS.length ? [] : [...ALL_YEARS])
  }

  function handleSave() {
    const e = {}
    if (!name.trim())  e.name  = true
    if (!email.trim()) e.email = true
    if (!isEdit && !password.trim()) e.password = true
    if (role === 'helper' && districts.length === 0) { e.districts = true }
    if (role === 'helper' && years.length === 0) { e.years = true }
    if (Object.keys(e).length) {
      setErrors(e)
      if (e.districts || e.years) alert('Viewers must have at least one district and one year assigned.')
      return
    }

    onSave({
      name: name.trim(),
      email: email.trim(),
      role,
      password: password || undefined,
      assignedDistricts: needsAssignment ? districts : [],
      assignedYears:     needsAssignment ? years     : [],
    })
    onClose()
  }

  const chip = (active) => ({
    padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
    border: `1px solid ${active ? '#534AB7' : '#e4e4e7'}`,
    background: active ? '#EEEDFE' : '#fafafa',
    color: active ? '#534AB7' : '#666',
    userSelect: 'none',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 12, width: 420, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid #e4e4e7', boxShadow: '0 8px 32px rgba(0,0,0,.15)' }}>

        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #e4e4e7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{isEdit ? 'Edit account' : 'Add account'}</span>
          <span style={{ cursor: 'pointer', color: '#aaa', fontSize: 18, lineHeight: 1 }} onClick={onClose}>✕</span>
        </div>

        {/* Body */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Name */}
          <div>
            <p style={{ fontSize: 11, color: '#666', marginBottom: 5 }}>Full name *</p>
            <input style={inputStyle(errors.name)} value={name}
              onChange={e => { setName(e.target.value); setErrors(v => ({ ...v, name: false })) }}
              placeholder="e.g. Maria Santos" />
            {errors.name && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>Name is required</p>}
          </div>

          {/* Email */}
          <div>
            <p style={{ fontSize: 11, color: '#666', marginBottom: 5 }}>Email address *</p>
            <input style={inputStyle(errors.email)} type="email" value={email}
              onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: false })) }}
              placeholder="e.g. maria@example.com"
              disabled={isEdit} />
            {errors.email && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>Email is required</p>}
          </div>

          {/* Role */}
          <div>
            <p style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>Role</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 6 }}>
              {ALL_ROLES.map(r => {
                const active = role === r
                return (
                  <div key={r} onClick={() => setRole(r)} style={{
                    padding: '10px 8px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                    border: `1px solid ${active ? '#534AB7' : '#e4e4e7'}`,
                    background: active ? '#EEEDFE' : 'transparent',
                    color: active ? '#534AB7' : '#555',
                  }}>
                    <span style={{ fontSize: 16, display: 'block', marginBottom: 3 }}>
                      {r === 'Admin' ? '🛡️' : r === 'SPES' ? '📋' : r === 'GIP' ? '💼' : '👁️'}
                    </span>
                    <span style={{ fontSize: 12 }}>{ROLE_LABELS[r]}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* District & Year Assignment — shown for Encoder and helper */}
          {needsAssignment && (
            <div style={{ background: '#f9f9f9', borderRadius: 10, padding: 14, border: '1px solid #e4e4e7' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#534AB7', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🗂 Data Access Assignment
              </p>
              <p style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>
                {role === 'helper'
                  ? <span style={{ color: '#b45309' }}>⚠ Viewers must be assigned specific districts and years — leaving empty gives access to <strong>all</strong> data.</span>
                  : <>Leave empty to allow access to <strong>all</strong> districts and years.</>
                }
              </p>

              {/* Districts */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontSize: 11, color: errors.districts ? '#e53e3e' : '#666', fontWeight: 500 }}>Districts {errors.districts && '(required for Viewer)'}</p>
                  <span onClick={toggleAllDistricts} style={{ fontSize: 11, color: '#534AB7', cursor: 'pointer' }}>
                    {districts.length === ALL_DISTRICTS.length ? 'Deselect all' : 'Select all'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ALL_DISTRICTS.map(d => (
                    <div key={d} onClick={() => toggleDistrict(d)} style={chip(districts.includes(d))}>
                      {d}
                    </div>
                  ))}
                </div>
              </div>

              {/* Years */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <p style={{ fontSize: 11, color: errors.years ? '#e53e3e' : '#666', fontWeight: 500 }}>Years {errors.years && '(required for Viewer)'}</p>
                  <span onClick={toggleAllYears} style={{ fontSize: 11, color: '#534AB7', cursor: 'pointer' }}>
                    {years.length === ALL_YEARS.length ? 'Deselect all' : 'Select all'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ALL_YEARS.map(y => (
                    <div key={y} onClick={() => toggleYear(y)} style={chip(years.includes(y))}>
                      {y}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <p style={{ fontSize: 11, color: '#666', marginBottom: 5 }}>
              {isEdit ? 'New password (leave blank to keep current)' : 'Password *'}
            </p>
            <input style={inputStyle(errors.password)} type="password" value={password}
              onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: false })) }}
              placeholder={isEdit ? 'Leave blank to keep unchanged' : 'Set a password'} />
            {errors.password && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>Password is required</p>}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e4e4e7', display: 'flex', justifyContent: 'flex-end', gap: 8, position: 'sticky', bottom: 0, background: '#fff' }}>
          <button onClick={onClose} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e4e4e7', background: 'transparent', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ padding: '6px 16px', borderRadius: 8, background: '#534AB7', color: '#fff', fontSize: 12, cursor: 'pointer', border: 'none', fontFamily: 'inherit', fontWeight: 500 }}>
            {isEdit ? 'Save changes' : 'Create account'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── User Card ────────────────────────────────────────────────────────────────
function UserCard({ user, colorIndex, isSelf, onEdit, onDelete }) {
  const { bg, fg }    = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]
  const { bg: rpBg, fg: rpFg } = rolePill(user.role)
  const hasRestrictions = (user.assignedDistricts?.length > 0 || user.assignedYears?.length > 0)

  return (
    <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
          {initials(user.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#111', lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 6 }}>
            {user.name}
            {isSelf && <span style={{ fontSize: 10, background: '#f0f9ff', color: '#0284c7', padding: '1px 6px', borderRadius: 20 }}>You</span>}
          </div>
          <div style={{ fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
        </div>
      </div>

      <div style={{ height: 1, background: '#f0f0f0' }} />

      {/* Role + Joined */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#aaa' }}>Role</span>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: rpBg, color: rpFg, fontWeight: 500 }}>
          {ROLE_LABELS[user.role] || user.role}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#aaa' }}>Joined</span>
        <span style={{ fontSize: 11, color: '#555' }}>{user.joined}</span>
      </div>

      {/* District/Year assignments (only for non-Admin) */}
      {(user.role === 'SPES' || user.role === 'GIP' || user.role === 'helper') && (
        <div style={{ background: '#f9f9f9', borderRadius: 8, padding: '8px 10px', fontSize: 11 }}>
          <div style={{ color: '#aaa', marginBottom: 5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 10 }}>Data access</div>
          {!hasRestrictions ? (
            <span style={{ color: '#3B6D11', background: '#EAF3DE', padding: '2px 8px', borderRadius: 20, fontSize: 10 }}>All districts · All years</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {user.assignedDistricts?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {user.assignedDistricts.map(d => (
                    <span key={d} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#EEEDFE', color: '#534AB7' }}>{d}</span>
                  ))}
                </div>
              )}
              {user.assignedYears?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {user.assignedYears.map(y => (
                    <span key={y} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#faeeda', color: '#854F0B' }}>{y}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onEdit} style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid #e4e4e7', background: 'transparent', fontSize: 12, cursor: 'pointer', color: '#534AB7', fontFamily: 'inherit' }}>
          ✏️ Edit
        </button>
        {!isSelf && (
          <button onClick={onDelete} style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid #fee2e2', background: '#fff5f5', fontSize: 12, cursor: 'pointer', color: '#ef4444', fontFamily: 'inherit' }}>
            🗑️ Delete
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Users Page ───────────────────────────────────────────────────────────────
export default function UserPage() {
  const [activeTab,    setActiveTab]    = useState('all')
  const [users,        setUsers]        = useState([])
  const [showModal,    setShowModal]    = useState(false)
  const [editTarget,   setEditTarget]   = useState(null)   // user being edited
  const [deleteTarget, setDeleteTarget] = useState(null)   // user to confirm delete
  const [toast,        setToast]        = useState('')
  const loggedUser = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => { fetchUsers() }, [])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function fetchUsers() {
    try {
      const token = localStorage.getItem('token') || ''
      const res = await fetch(API_ENDPOINTS.USERS, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) return
      const data = await res.json()
      setUsers(data.map(u => ({
        id:                u._id,
        name:              u.name || 'Unknown',
        email:             u.email,
        role:              u.role || 'SPES',
        assignedDistricts: u.assignedDistricts || [],
        assignedYears:     u.assignedYears     || [],
        joined:            fmtDate(u.createdAt),
      })))
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  // CREATE
  async function handleCreate({ name, email, role, password, assignedDistricts, assignedYears }) {
    const token = localStorage.getItem('token') || ''
    const res = await fetch(API_ENDPOINTS.USERS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, email, role, password, assignedDistricts, assignedYears }),
    })
    if (res.ok) {
      await fetchUsers()
      showToast('✅ Account created successfully.')
    } else {
      const err = await res.json()
      alert(`Error: ${err.message}`)
    }
  }

  // UPDATE
  async function handleUpdate({ name, role, password, assignedDistricts, assignedYears }) {
    const token = localStorage.getItem('token') || ''
    const res = await fetch(`${API_ENDPOINTS.USERS}/${editTarget.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, role, password, assignedDistricts, assignedYears }),
    })
    if (res.ok) {
      await fetchUsers()
      showToast('✅ Account updated successfully.')
    } else {
      const err = await res.json()
      alert(`Error: ${err.message}`)
    }
    setEditTarget(null)
  }

  // DELETE
  async function handleDelete() {
    const token = localStorage.getItem('token') || ''
    const res = await fetch(`${API_ENDPOINTS.USERS}/${deleteTarget.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
      showToast('🗑️ Account deleted.')
    } else {
      const err = await res.json()
      alert(`Error: ${err.message}`)
    }
    setDeleteTarget(null)
  }

  const filtered = activeTab === 'all'
    ? users
    : users.filter(u => u.role.toLowerCase() === activeTab)

  const tabs = ['all', 'admin', 'spes', 'gip', 'helper']

  return (
    <>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#111', color: '#fff', padding: '10px 18px', borderRadius: 10, fontSize: 13, zIndex: 999, boxShadow: '0 4px 16px rgba(0,0,0,.2)' }}>
          {toast}
        </div>
      )}

      {/* Topbar */}
      <div style={{ minHeight: 52, padding: '10px 16px', borderBottom: '1px solid #e4e4e7', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>Users</div>
          <div style={{ fontSize: 11, color: '#aaa' }}>{users.length} total accounts</div>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowModal(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: '#534AB7', color: '#fff', fontSize: 12, cursor: 'pointer', border: 'none', fontFamily: 'inherit', fontWeight: 500 }}>
          + Add account
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            ['Total',    users.length,                                    'all accounts'],
            ['Admins',   users.filter(u => u.role === 'Admin').length,   'admin role'],
            ['SPES',     users.filter(u => u.role === 'SPES').length,    'SPES interns'],
            ['GIP',      users.filter(u => u.role === 'GIP').length,     'GIP interns'],
            ['Viewers',  users.filter(u => u.role === 'helper').length,  'viewer role'],
          ].map(([label, val, sub]) => (
            <div key={label} style={{ background: '#f5f5f5', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#111' }}>{val}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#f3f3f3', borderRadius: 8, padding: 3, width: 'fit-content' }}>
          {tabs.map(tab => {
            const active = activeTab === tab
            return (
              <div key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '5px 16px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                background: active ? '#fff' : 'transparent',
                color: active ? '#111' : '#888',
                fontWeight: active ? 500 : 400,
                boxShadow: active ? '0 0 0 1px #e4e4e7' : 'none',
              }}>
                {tab === 'helper' ? 'Viewer' : tab.toUpperCase()}
              </div>
            )
          })}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {filtered.length === 0
            ? <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: '#bbb', fontSize: 13 }}>No accounts found</div>
            : filtered.map((user, i) => (
                <UserCard
                  key={user.id}
                  user={user}
                  colorIndex={i}
                  isSelf={user.email === loggedUser.email}
                  onEdit={() => { setEditTarget(user); setShowModal(true) }}
                  onDelete={() => setDeleteTarget(user)}
                />
              ))
          }
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <AccountModal
          existing={editTarget}
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          onSave={editTarget ? handleUpdate : handleCreate}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  )
}
