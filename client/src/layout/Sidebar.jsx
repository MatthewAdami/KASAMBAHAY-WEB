import { useNavigate, useLocation } from 'react-router-dom'
import { can, getRole } from '../rbac'

// ─── Nav definition with required permission per item ─────────────────────────
const NAV = [
  {
    section: 'Main',
    items: [
      { key: 'overview',   label: 'Overview',        icon: '⊞',  route: '/admin',            permission: 'viewDashboard' },
    ],
  },
  {
    section: 'Manage',
    items: [
      { key: 'users',      label: 'Users',           icon: '👥', route: '/admin/users',       permission: 'viewUsers' },
      { key: 'kasambahay', label: 'Kasambahay data', icon: '📋', route: '/admin/kasambahay',  permission: 'viewKasambahay' },
      { key: 'reports',    label: 'Reports',         icon: '📈', route: '/admin/reports',     permission: 'viewReports' },
    ],
  },
  {
    section: 'System',
    items: [
      { key: 'settings',   label: 'Settings',        icon: '⚙️', route: '/admin/settings',    permission: 'viewSettings' },
      { key: 'auditlog',   label: 'Audit log',       icon: '🗒️', route: '/admin/audit',       permission: 'viewAuditLog' },
    ],
  },
]

export default function Sidebar({ stats = {} }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const user      = JSON.parse(localStorage.getItem('user') || '{}')
  const role      = user.role || ''

  const activeKey = NAV.flatMap(s => s.items)
    .slice().reverse()
    .find(item => location.pathname === item.route || location.pathname.startsWith(item.route + '/'))
    ?.key ?? 'overview'

  // Role badge style
  const rolePill = {
    Admin:   { bg: '#EEEDFE', fg: '#534AB7' },
    Encoder: { bg: '#EAF3DE', fg: '#3B6D11' },
    helper:  { bg: '#f3f3f3', fg: '#666' },
  }[role] || { bg: '#f3f3f3', fg: '#666' }

  const roleLabel = {
    Admin:   'Administrator',
    Encoder: 'Encoder',
    helper:  'Viewer',
  }[role] || role

  const s = {
    sidebar: {
      width: 220, flexShrink: 0, background: '#fff',
      borderRight: '1px solid #e4e4e7', display: 'flex',
      flexDirection: 'column', height: '100vh', position: 'sticky', top: 0,
    },
    brand: {
      padding: '14px 16px', borderBottom: '1px solid #e4e4e7',
      display: 'flex', alignItems: 'center', gap: 8,
    },
    logo: {
      width: 28, height: 28, borderRadius: 6, background: '#534AB7',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 14, fontWeight: 600,
    },
    sectionLabel: {
      fontSize: 11, color: '#aaa', padding: '10px 10px 4px',
      textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0,
    },
    item: (isActive) => ({
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
      fontSize: 13, marginBottom: 2,
      background: isActive ? '#EEEDFE' : 'transparent',
      color:      isActive ? '#534AB7' : '#666',
      transition: 'background .12s, color .12s',
    }),
    navContent: {
      padding: 8, flex: 1, overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
    },
    statusSection: {
      marginTop: 'auto', paddingTop: 10, borderTop: '1px solid #e4e4e7',
    },
    statusCard: {
      background: '#f4f4f5', borderRadius: 8, padding: '8px 10px', marginBottom: 6,
    },
    footer: { padding: 8, borderTop: '1px solid #e4e4e7' },
    userRow: {
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px', borderRadius: 8,
    },
    avatar: {
      width: 28, height: 28, borderRadius: '50%', background: '#EEEDFE',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 500, color: '#534AB7', flexShrink: 0,
    },
  }

  return (
    <div style={s.sidebar}>

      {/* Brand */}
      <div style={s.brand}>
        <div style={s.logo}>K</div>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Kasambahay</span>
      </div>

      {/* Nav — only show items the current role can access */}
      <div style={s.navContent}>
        {NAV.map(({ section, items }) => {
          // Filter items by permission
          const allowed = items.filter(item => can(role, item.permission))
          if (allowed.length === 0) return null
          return (
            <div key={section}>
              <p style={s.sectionLabel}>{section}</p>
              {allowed.map(item => (
                <div
                  key={item.key}
                  style={s.item(activeKey === item.key)}
                  onClick={() => navigate(item.route)}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </div>
          )
        })}

        {/* Status cards — admin only */}
        {role === 'Admin' && (
          <div style={s.statusSection}>
            <p style={{ ...s.sectionLabel, paddingTop: 10 }}>System status</p>
            <div style={s.statusCard}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#111', marginBottom: 2 }}>
                {stats.pendingReview ?? 3} pending review
              </div>
              <div style={{ fontSize: 11, color: '#888' }}>Kasambahay records</div>
            </div>
            <div style={s.statusCard}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#111', marginBottom: 2 }}>
                {stats.unresolved ?? 1} unresolved
              </div>
              <div style={{ fontSize: 11, color: '#888' }}>Reports this month</div>
            </div>
            <div style={{ ...s.statusCard, background: '#EEEDFE' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#534AB7', marginBottom: 2 }}>
                {stats.totalUsers ?? 0} total users
              </div>
              <div style={{ fontSize: 11, color: '#7B72D4' }}>
                {stats.admins ?? 0} admins · {stats.encoders ?? 0} encoders
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer — user info + role badge + logout */}
      <div style={s.footer}>
        <div style={s.userRow}>
          <div style={s.avatar}>
            {(user.name?.charAt(0) || 'A').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name || 'Admin'}
            </div>
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: rolePill.bg, color: rolePill.fg, fontWeight: 500 }}>
              {roleLabel}
            </span>
          </div>
        </div>
        <div
          style={{ ...s.item(false), color: '#ef4444', marginBottom: 0 }}
          onClick={() => { localStorage.clear(); window.location.href = '/login' }}
        >
          🚪 Logout
        </div>
      </div>
    </div>
  )
}
