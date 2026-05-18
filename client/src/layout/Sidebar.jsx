import { useNavigate, useLocation } from 'react-router-dom'

const NAV = [
  {
    section: 'Main',
    items: [
      { key: 'overview',   label: 'Overview',        icon: '⊞', route: '/admin' },
    ],
  },
  {
    section: 'Manage',
    items: [
      { key: 'users',      label: 'Users',           icon: '👤', route: '/admin/users' },
      { key: 'kasambahay', label: 'Kasambahay data', icon: '📋', route: '/admin/kasambahay' },
      { key: 'reports',    label: 'Reports',         icon: '📊', route: '/admin/reports' },
    ],
  },
  {
    section: 'System',
    items: [
      { key: 'settings',   label: 'Settings',        icon: '⚙️', route: '/admin/settings' },
      { key: 'auditlog',   label: 'Audit log',       icon: '🛡️', route: '/admin/audit' },
    ],
  },
]

export default function Sidebar({ stats = {} }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const user      = JSON.parse(localStorage.getItem('user') || '{}')

  const activeKey = NAV.flatMap(s => s.items)
    .slice().reverse()
    .find(item => location.pathname === item.route || location.pathname.startsWith(item.route + '/'))
    ?.key ?? 'overview'

  const s = {
    sidebar: {
      width: 220,
      flexShrink: 0,
      background: '#fff',
      borderRight: '1px solid #e4e4e7',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
    },
    brand: {
      padding: '14px 16px',
      borderBottom: '1px solid #e4e4e7',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    },
    logo: {
      width: 28, height: 28,
      borderRadius: 6,
      background: '#534AB7',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 14, fontWeight: 600,
    },
    sectionLabel: {
      fontSize: 11, color: '#aaa',
      padding: '10px 10px 4px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      margin: 0,
    },
    item: (isActive) => ({
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: 13,
      marginBottom: 2,
      background: isActive ? '#EEEDFE' : 'transparent',
      color:      isActive ? '#534AB7' : '#666',
      transition: 'background .12s, color .12s',
    }),
    navContent: {
      padding: 8,
      flex: 1,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
    },
    statusSection: {
      marginTop: 'auto',
      paddingTop: 10,
      borderTop: '1px solid #e4e4e7',
    },
    statusCard: {
      background: '#f4f4f5',
      borderRadius: 8,
      padding: '8px 10px',
      marginBottom: 6,
    },
    statusCardTitle: {
      fontSize: 12,
      fontWeight: 600,
      color: '#111',
      marginBottom: 2,
    },
    statusCardSub: {
      fontSize: 11,
      color: '#888',
    },
    footer: {
      padding: 8,
      borderTop: '1px solid #e4e4e7',
    },
    userRow: {
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px',
      borderRadius: 8,
    },
    avatar: {
      width: 28, height: 28,
      borderRadius: '50%',
      background: '#EEEDFE',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 500, color: '#534AB7',
      flexShrink: 0,
    },
  }

  return (
    <div style={s.sidebar}>

      {/* Brand */}
      <div style={s.brand}>
        <div style={s.logo}>K</div>
        <span style={{ fontSize: 13, fontWeight: 500 }}>Kasambahay</span>
      </div>

      {/* Nav */}
      <div style={s.navContent}>
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p style={s.sectionLabel}>{section}</p>
            {items.map(item => (
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
        ))}

        {/* ── Status cards fill the empty sidebar space ── */}
        <div style={s.statusSection}>
          <p style={{ ...s.sectionLabel, paddingTop: 10 }}>System status</p>

          <div style={s.statusCard}>
            <div style={s.statusCardTitle}>
              {stats.pendingReview ?? 3} pending review
            </div>
            <div style={s.statusCardSub}>Kasambahay records</div>
          </div>

          <div style={s.statusCard}>
            <div style={s.statusCardTitle}>
              {stats.unresolved ?? 1} unresolved
            </div>
            <div style={s.statusCardSub}>Reports this month</div>
          </div>

          <div style={{ ...s.statusCard, background: '#EEEDFE' }}>
            <div style={{ ...s.statusCardTitle, color: '#534AB7' }}>
              {stats.totalUsers ?? 24} total users
            </div>
            <div style={{ ...s.statusCardSub, color: '#7B72D4' }}>
              {stats.admins ?? 2} admins · {stats.helpers ?? 22} helpers
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={s.footer}>
        <div style={s.userRow}>
          <div style={s.avatar}>
            {(user.name?.charAt(0) || 'A').toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name || 'Admin'}
            </div>
            <div style={{ fontSize: 10, color: '#aaa' }}>
              {user.role || 'Super admin'}
            </div>
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