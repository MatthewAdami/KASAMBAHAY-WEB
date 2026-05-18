import { useState, useEffect } from 'react'

const AVATAR_COLORS = [
  { bg: '#EEEDFE', fg: '#534AB7' },
  { bg: '#EAF3DE', fg: '#3B6D11' },
  { bg: '#E1F5EE', fg: '#0F6E56' },
  { bg: '#FAEEDA', fg: '#854F0B' },
  { bg: '#FAECE7', fg: '#993C1D' },
]

function initials(name) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function formatNow() {
  return new Date().toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function formatJoined() {
  return new Date().toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ─── Add Account Modal ───────────────────────────────────────────────────────

function AddAccountModal({ onClose, onSave }) {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState('Admin')
  const [errors, setErrors]     = useState({})

  function handleSave() {
    const e = {}
    if (!name.trim())  e.name  = true
    if (!email.trim()) e.email = true
    if (Object.keys(e).length) { setErrors(e); return }
    onSave({ name: name.trim(), email: email.trim(), role, password })
    onClose()
  }

  const s = {
    overlay: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    },
    modal: {
      background: '#fff', borderRadius: 12, width: 340,
      border: '1px solid #e4e4e7', overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,.12)',
    },
    head: {
      padding: '14px 16px', borderBottom: '1px solid #e4e4e7',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
    body:  { padding: 16, display: 'flex', flexDirection: 'column', gap: 12 },
    label: { fontSize: 11, color: '#666', marginBottom: 4 },
    input: (hasErr) => ({
      width: '100%', padding: '7px 10px', borderRadius: 8,
      border: `1px solid ${hasErr ? '#E24B4A' : '#e4e4e7'}`,
      fontSize: 12.5, color: '#111', fontFamily: 'inherit', outline: 'none',
      boxSizing: 'border-box',
    }),
    roleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
    roleOpt: (selected) => ({
      padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
      textAlign: 'center', fontSize: 12,
      border: `1px solid ${selected ? '#534AB7' : '#e4e4e7'}`,
      background: selected ? '#EEEDFE' : 'transparent',
      color: selected ? '#534AB7' : '#555',
    }),
    foot: {
      padding: '12px 16px', borderTop: '1px solid #e4e4e7',
      display: 'flex', justifyContent: 'flex-end', gap: 8,
    },
    btnCancel: {
      padding: '6px 12px', borderRadius: 8, border: '1px solid #e4e4e7',
      background: 'transparent', fontSize: 12, cursor: 'pointer',
      color: '#555', fontFamily: 'inherit',
    },
    btnSave: {
      padding: '6px 14px', borderRadius: 8, background: '#534AB7',
      color: '#fff', fontSize: 12, cursor: 'pointer', border: 'none',
      fontFamily: 'inherit',
    },
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.head}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>Add account</span>
          <span style={{ cursor: 'pointer', color: '#aaa', fontSize: 18, lineHeight: 1 }} onClick={onClose}>✕</span>
        </div>

        <div style={s.body}>
          <div>
            <p style={s.label}>Full name</p>
            <input
              style={s.input(errors.name)}
              value={name}
              onChange={e => { setName(e.target.value); setErrors(v => ({ ...v, name: false })) }}
              placeholder="e.g. Maria Santos"
            />
          </div>
          <div>
            <p style={s.label}>Email address</p>
            <input
              style={s.input(errors.email)}
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: false })) }}
              placeholder="e.g. maria@example.com"
            />
          </div>
          <div>
            <p style={s.label}>Role</p>
            <div style={s.roleGrid}>
              {['Admin', 'Encoder'].map(r => (
                <div key={r} style={s.roleOpt(role === r)} onClick={() => setRole(r)}>
                  <span style={{ fontSize: 14, display: 'block', marginBottom: 3 }}>
                    {r === 'Admin' ? '🛡️' : '✏️'}
                  </span>
                  {r}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p style={s.label}>Password</p>
            <input
              style={s.input(false)}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Set a password"
            />
          </div>
        </div>

        <div style={s.foot}>
          <button style={s.btnCancel} onClick={onClose}>Cancel</button>
          <button style={s.btnSave} onClick={handleSave}>Create account</button>
        </div>
      </div>
    </div>
  )
}

// ─── User Card ───────────────────────────────────────────────────────────────

function UserCard({ user, colorIndex }) {
  const { bg, fg } = AVATAR_COLORS[colorIndex % AVATAR_COLORS.length]

  const pill = (role) => ({
    fontSize: 10, padding: '2px 7px', borderRadius: 20,
    background: role === 'Admin' ? '#EEEDFE' : '#EAF3DE',
    color:      role === 'Admin' ? '#534AB7' : '#3B6D11',
  })

  const statusPill = (status) => ({
    fontSize: 10, padding: '2px 7px', borderRadius: 20,
    background: status === 'Online' ? '#E1F5EE' : '#f3f3f3',
    color:      status === 'Online' ? '#0F6E56' : '#888',
  })

  return (
    <div style={{
      background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12,
      padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', background: bg, color: fg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 500, flexShrink: 0,
        }}>
          {initials(user.name)}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#111', lineHeight: 1.3 }}>{user.name}</div>
          <div style={{ fontSize: 11, color: '#888' }}>{user.email}</div>
        </div>
      </div>

      <div style={{ height: 1, background: '#f0f0f0' }} />

      {[
        ['Role',   <span key="role" style={pill(user.role)}>{user.role}</span>],
        ['Joined', <span key="joined" style={{ fontSize: 11, color: '#555' }}>{user.joined}</span>],
        ['Status', <span key="status" style={statusPill(user.status)}>{user.status}</span>],
      ].map(([label, val]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#aaa' }}>{label}</span>
          {val}
        </div>
      ))}

      <div style={{ background: '#f7f7f7', borderRadius: 8, padding: '8px 10px' }}>
        <div style={{ fontSize: 10, color: '#aaa', marginBottom: 2 }}>Last login</div>
        <div style={{ fontSize: 11, color: '#555', display: 'flex', alignItems: 'center', gap: 5 }}>
          🕐 {user.lastLogin}
        </div>
      </div>
    </div>
  )
}

// ─── Users Page ──────────────────────────────────────────────────────────────

export default function UserPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [users, setUsers]         = useState([])
  const [showModal, setShowModal] = useState(false)
  const loggedUser                = JSON.parse(localStorage.getItem('user') || '{}')

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      const token = localStorage.getItem('token') || ''
      const res = await fetch('http://localhost:5000/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const formattedUsers = data.map(u => ({
          id: u._id,
          name: u.name || 'Unknown',
          email: u.email,
          role: u.role || 'Encoder',
          joined: new Date(u.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }),
          lastLogin: 'N/A', // Maaari mong i-update ito kung tina-track mo ang real-time logins
          status: 'Offline' // Update this kapag may real-time activity checker ka na
        }))
        setUsers(formattedUsers)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }

  const filtered = activeTab === 'all'
    ? users
    : users.filter(u => u.role.toLowerCase() === activeTab)

  async function handleSave({ name, email, role, password }) {
    try {
      const token = localStorage.getItem('token') || ''
      const res = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, role, password })
      })

      if (res.ok) {
        const newUser = await res.json()
        setUsers(prev => [...prev, {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          joined: formatJoined(),
          lastLogin: formatNow(),
          status: 'Online',
        }])
      } else {
        const errorData = await res.json()
        alert(`Error: ${errorData.message}`)
      }
    } catch (err) {
      console.error('Failed to create user:', err)
      alert('Something went wrong. Please try again.')
    }
  }

  const s = {
    topbar: {
      height: 52, padding: '0 20px', borderBottom: '1px solid #e4e4e7',
      background: '#fff', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', flexShrink: 0,
    },
    content: { flex: 1, overflowY: 'auto', padding: 20 },
    tabs: {
      display: 'flex', gap: 4, marginBottom: 16,
      background: '#f3f3f3', borderRadius: 8, padding: 3, width: 'fit-content',
    },
    tab: (active) => ({
      padding: '5px 16px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
      background: active ? '#fff' : 'transparent',
      color:      active ? '#111' : '#888',
      fontWeight: active ? 500 : 400,
      boxShadow:  active ? '0 0 0 1px #e4e4e7' : 'none',
    }),
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
      gap: 12,
    },
    btnAdd: {
      display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
      borderRadius: 8, background: '#534AB7', color: '#fff', fontSize: 12,
      cursor: 'pointer', border: 'none', fontFamily: 'inherit', fontWeight: 500,
    },
    empty: {
      gridColumn: '1 / -1', textAlign: 'center',
      padding: '60px 20px', color: '#bbb', fontSize: 13,
    },
  }

  return (
    <>
      {/* Topbar */}
      <div style={s.topbar}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>Users</div>
          <div style={{ fontSize: 11, color: '#aaa' }}>{users.length} total accounts</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={s.btnAdd} onClick={() => setShowModal(true)}>
            + Add account
          </button>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: '#EEEDFE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 500, color: '#534AB7',
          }}>
            {(loggedUser.name?.charAt(0) || 'A').toUpperCase()}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={s.content}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            ['Total accounts', users.length,                            'all accounts'],
            ['Admins',         users.filter(u => u.role === 'Admin').length,   'admin role'],
            ['Encoders',       users.filter(u => u.role === 'Encoder').length, 'encoder role'],
          ].map(([label, val, sub]) => (
            <div key={label} style={{ background: '#f5f5f5', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#111' }}>{val}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          {['all', 'admin', 'encoder'].map(tab => (
            <div key={tab} style={s.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div style={s.grid}>
          {filtered.length === 0
            ? <div style={s.empty}>No accounts found</div>
            : filtered.map((user) => (
                <UserCard key={user.id} user={user} colorIndex={users.indexOf(user)} />
              ))
          }
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <AddAccountModal
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </>
  )
}