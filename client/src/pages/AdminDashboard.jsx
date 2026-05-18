import { useState } from 'react'

export default function AdminDashboard() {
  const [active, setActive] = useState('overview')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const card = {
    background: '#fff', border: '1px solid #e4e4e7',
    borderRadius: 12, overflow: 'hidden', marginBottom: 16,
  }
  const cardHead = {
    padding: '12px 16px', borderBottom: '1px solid #e4e4e7',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }
  const badge = (color) => {
    const map = {
      purple: ['#EEEDFE', '#534AB7'],
      green:  ['#EAF3DE', '#3B6D11'],
      amber:  ['#FAEEDA', '#854F0B'],
    }
    return { fontSize: 11, padding: '2px 8px', borderRadius: 20, background: map[color][0], color: map[color][1] }
  }
  const th = {
    padding: '8px 16px', textAlign: 'left', fontSize: 11,
    fontWeight: 500, color: '#888', borderBottom: '1px solid #e4e4e7', background: '#fafafa',
  }
  const td = { padding: '10px 16px', fontSize: 12, color: '#111', borderBottom: '1px solid #f0f0f0' }

  const tabs = { overview: 'Overview', reports: 'Reports' }

  return (
    <>
      {/* Topbar */}
      <div style={{
        padding: '0 20px', height: 52, borderBottom: '1px solid #e4e4e7',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#fff', flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>{tabs[active]}</div>
          <div style={{ fontSize: 11, color: '#aaa' }}>Welcome back 👋</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Internal tab switcher */}
          <div style={{ display: 'flex', gap: 4, background: '#f3f3f3', borderRadius: 8, padding: 3 }}>
            {Object.entries(tabs).map(([key, label]) => (
              <div
                key={key}
                onClick={() => setActive(key)}
                style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  background: active === key ? '#fff' : 'transparent',
                  color:      active === key ? '#111' : '#888',
                  fontWeight: active === key ? 500 : 400,
                  boxShadow:  active === key ? '0 0 0 1px #e4e4e7' : 'none',
                }}
              >
                {label}
              </div>
            ))}
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: '#EEEDFE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 500, color: '#534AB7',
          }}>
            {(user.name?.charAt(0) || 'A').toUpperCase()}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

        {/* ── Overview ── */}
        {active === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                ['Total users',        '24', '2 admins · 22 helpers'],
                ['Kasambahay records', '18', '3 pending review'],
                ['Reports this month',  '7', '1 unresolved'],
              ].map(([label, val, sub]) => (
                <div key={label} style={{ background: '#f5f5f5', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: '#111' }}>{val}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>

            <div style={card}>
              <div style={cardHead}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>Recent activity</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Action</th>
                    <th style={th}>User</th>
                    <th style={th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['New registration', 'maria@example.com', 'May 15, 2026'],
                    ['Report submitted',  'juan@example.com', 'May 14, 2026'],
                    ['Profile updated',   'ana@example.com',  'May 13, 2026'],
                  ].map(([a, b, c]) => (
                    <tr key={a}>
                      <td style={td}>{a}</td>
                      <td style={td}>{b}</td>
                      <td style={td}>{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Reports ── */}
        {active === 'reports' && (
          <div style={card}>
            <div style={cardHead}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Reports</span>
              <span style={badge('amber')}>1 unresolved</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Report</th>
                  <th style={th}>Submitted by</th>
                  <th style={th}>Date</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Late salary payment',   'maria@example.com', 'May 14, 2026', 'Pending'],
                  ['Contract issue',         'juan@example.com', 'May 10, 2026', 'Resolved'],
                  ['Working hours dispute',   'ana@example.com', 'Apr 28, 2026', 'Resolved'],
                ].map(([r, u, d, s]) => (
                  <tr key={r}>
                    <td style={td}>{r}</td>
                    <td style={td}>{u}</td>
                    <td style={td}>{d}</td>
                    <td style={td}><span style={badge(s === 'Pending' ? 'amber' : 'green')}>{s}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}