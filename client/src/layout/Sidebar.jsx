import { useNavigate, useLocation } from 'react-router-dom'
import { can, getRole } from '../rbac'
import { useTheme, useColors } from '../ThemeContext.jsx'

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
      { key: 'interns',   label: 'Interns',        icon: '📑', route: '/admin/programs',    permission: 'viewKasambahay' },
      { key: 'trainings', label: 'Trainings/Programs', icon: '🎓', route: '/admin/trainings', permission: 'viewKasambahay' },
      { key: 'reports',    label: 'Statistical Reports',         icon: '📈', route: '/admin/reports',     permission: 'viewReports' },
      { key: 'summary-report', label: 'Summary Report', icon: '📊', route: '/admin/summary-report', permission: 'viewReports' },

    ],
  },
  {
    section: 'System',
    items: [
      { key: 'settings',   label: 'Settings',        icon: '⚙️', route: '/admin/settings',    permission: 'viewSettings' },
      { key: 'activitylogs', label: 'Activity logs', icon: '📝', route: '/admin/activity-logs', permission: 'viewAuditLog' },
    ],
  },
]

export default function Sidebar({ stats = {}, onClose }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const user      = JSON.parse(localStorage.getItem('user') || '{}')
  const role      = user.role || ''

  const { dark, toggle } = useTheme()
  const c = useColors()

  const activeKey = NAV.flatMap(s => s.items)
    .slice().reverse()
    .find(item => location.pathname === item.route || location.pathname.startsWith(item.route + '/'))
    ?.key ?? 'overview'

  // Role badge style
  const rolePill = {
    Admin:   { bg: '#EEEDFE', fg: '#534AB7' },
    SPES:    { bg: '#EAF3DE', fg: '#3B6D11' },
    GIP:     { bg: '#E0F0FF', fg: '#1D5FA8' },
    helper:  { bg: '#f3f3f3', fg: '#666' },
  }[role] || { bg: '#f3f3f3', fg: '#666' }

  const roleLabel = {
    Admin:   'Administrator',
    SPES:    'SPES Intern',
    GIP:     'GIP Intern',
    helper:  'Viewer',
  }[role] || role

  const s = {
    sidebar: {
      width: 220, flexShrink: 0, background: c.bgSidebar,
      borderRight: `1px solid ${c.border}`, display: 'flex',
      flexDirection: 'column', height: '100vh', position: 'sticky', top: 0,
      transition: 'background 0.2s, border-color 0.2s',
    },
    brand: {
      padding: '14px 16px', borderBottom: `1px solid ${c.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },

    sectionLabel: {
      fontSize: 11, color: c.textMuted, padding: '10px 10px 4px',
      textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0,
    },
    item: (isActive) => ({
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
      fontSize: 13, marginBottom: 2,
      background: isActive ? c.bgActive : 'transparent',
      color:      isActive ? c.textActive : c.textSub,
      transition: 'background .12s, color .12s',
    }),
    navContent: {
      padding: 8, flex: 1, overflowY: 'auto',
      display: 'flex', flexDirection: 'column',
    },
    statusSection: {
      marginTop: 'auto', paddingTop: 10, borderTop: `1px solid ${c.border}`,
    },
    statusCard: {
      background: c.bgMuted, borderRadius: 8, padding: '8px 10px', marginBottom: 6,
    },
    footer: { padding: 8, borderTop: `1px solid ${c.border}` },
    userRow: {
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 10px', borderRadius: 8,
    },
    avatar: {
      width: 28, height: 28, borderRadius: '50%', background: c.accentLight,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 500, color: c.accent, flexShrink: 0,
    },
  }

  return (
    <div style={s.sidebar}>

      {/* Brand */}
      <div style={s.brand}> 
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}> 
          <img src="/kasambahaylogo.png" alt="Kasambahay Logo" style={{ width: 90, height: 56, objectFit: "contain" }} /> 
        </div>
        <button
          className="sidebar-close-btn"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: 18,
            color: c.textMuted,
            cursor: "pointer",
            padding: 0
          }}
        >
          ✕ {/* Added a close symbol here so users have something to click on mobile */}
        </button>
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
                  onClick={() => { navigate(item.route); if (onClose) onClose(); }}
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
              <div style={{ fontSize: 12, fontWeight: 600, color: c.text, marginBottom: 2 }}>
                {stats.pendingReview ?? 3} pending review
              </div>
              <div style={{ fontSize: 11, color: c.textMuted }}>Kasambahay records</div>
            </div>
            <div style={s.statusCard}>
              <div style={{ fontSize: 12, fontWeight: 600, color: c.text, marginBottom: 2 }}>
                {stats.unresolved ?? 1} unresolved
              </div>
              <div style={{ fontSize: 11, color: c.textMuted }}>Reports this month</div>
            </div>
            <div style={{ ...s.statusCard, background: '#EEEDFE' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: c.accent, marginBottom: 2 }}>
                {stats.totalUsers ?? 0} total users
              </div>
              <div style={{ fontSize: 11, color: c.textActive }}>
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
            <div style={{ fontSize: 12, fontWeight: 500, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name || 'Admin'}
            </div>
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: rolePill.bg, color: rolePill.fg, fontWeight: 500 }}>
              {roleLabel}
            </span>
          </div>
        </div>
        <div
          style={{ ...s.item(false), color: c.textSub, marginBottom: 4 }}
          onClick={toggle}
        >
          {dark ? '☀️' : '🌙'} {dark ? 'Light mode' : 'Dark mode'}
        </div>
        <div
          style={{ ...s.item(false), color: '#ef4444', marginBottom: 0 }}
          onClick={() => { localStorage.clear(); window.location.href = '/login' }}
        >
          🚪 Logout
        </div>
      </div>

      <style>{`
        .sidebar-close-btn { display: none; }
        @media (max-width: 768px) {
          .sidebar-close-btn { display: block; }
        }
      `}</style>
    </div>
  )
}
