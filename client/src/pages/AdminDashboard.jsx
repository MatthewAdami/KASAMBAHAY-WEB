import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const pages = {
  overview: 'Overview',
  users: 'Users',
  kasambahay: 'Kasambahay data',
  reports: 'Reports',
}

function AdminDashboard() {
  const [active, setActive] = useState('overview')
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const sidebar = {
    width: 210, flexShrink: 0, background: '#fff',
    borderRight: '1px solid #e4e4e7', display: 'flex',
    flexDirection: 'column', height: '100vh'
  }
  const navItem = (key) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
    borderRadius: 8, cursor: 'pointer', fontSize: 13, marginBottom: 2,
    background: active === key ? '#EEEDFE' : 'transparent',
    color: active === key ? '#534AB7' : '#666',
  })
  const card = {
    background: '#fff', border: '1px solid #e4e4e7',
    borderRadius: 12, overflow: 'hidden', marginBottom: 16
  }
  const cardHead = {
    padding: '12px 16px', borderBottom: '1px solid #e4e4e7',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  }
  const badge = (color) => {
    const map = {
      purple: ['#EEEDFE', '#534AB7'],
      green: ['#EAF3DE', '#3B6D11'],
      amber: ['#FAEEDA', '#854F0B']
    }
    return {
      fontSize: 11, padding: '2px 8px', borderRadius: 20,
      background: map[color][0], color: map[color][1]
    }
  }
  const th = {
    padding: '8px 16px', textAlign: 'left', fontSize: 11,
    fontWeight: 500, color: '#888', borderBottom: '1px solid #e4e4e7',
    background: '#fafafa'
  }
  const td = {
    padding: '10px 16px', fontSize: 12, color: '#111',
    borderBottom: '1px solid #f0f0f0'
  }

  const handleNavClick = (key) => {
    if (key === 'kasambahay') {
      navigate('/admin/kasambahay')
    } else {
      setActive(key)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f9f9f9' }}>

      {/* Sidebar */}
      <div style={sidebar}>
        <div style={{
          padding: 16, borderBottom: '1px solid #e4e4e7',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, background: '#534AB7',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{ color: '#fff', fontSize: 14 }}>K</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 500 }}>Kasambahay</span>
        </div>

        <div style={{ padding: 8, flex: 1 }}>
          <p style={{
            fontSize: 11, color: '#aaa', padding: '8px 10px 4px',
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>Main</p>
          <div style={navItem('overview')} onClick={() => setActive('overview')}>
            <span>&#9783;</span> Overview
          </div>

          <p style={{
            fontSize: 11, color: '#aaa', padding: '8px 10px 4px',
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>Manage</p>
          {['users', 'kasambahay', 'reports'].map(key => (
            <div key={key} style={navItem(key)} onClick={() => handleNavClick(key)}>
              {key === 'users' && '👤'}{' '}
              {key === 'kasambahay' && '📋'}{' '}
              {key === 'reports' && '📊'}{' '}
              {pages[key]}
            </div>
          ))}
        </div>

        <div style={{ padding: 8, borderTop: '1px solid #e4e4e7' }}>
          <div
            style={{ ...navItem(''), color: '#ef4444' }}
            onClick={() => { localStorage.clear(); window.location.href = '/login' }}
          >
            Logout
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <div style={{
          padding: '0 20px', height: 52, borderBottom: '1px solid #e4e4e7',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fff'
        }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{pages[active]}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: '#EEEDFE',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 500, color: '#534AB7'
            }}>
              {user.name?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {/* Overview */}
          {active === 'overview' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                {[
                  ['Total users', '24', '2 admins · 22 helpers'],
                  ['Kasambahay records', '18', '3 pending review'],
                  ['Reports this month', '7', '1 unresolved']
                ].map(([label, val, sub]) => (
                  <div key={label} style={{ background: '#f5f5f5', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 22, fontWeight: 500, color: '#111' }}>{val}</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{sub}</div>
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
                      ['Report submitted', 'juan@example.com', 'May 14, 2026'],
                      ['Profile updated', 'ana@example.com', 'May 13, 2026']
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

          {/* Users */}
          {active === 'users' && (
            <div style={card}>
              <div style={cardHead}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>All users</span>
                <span style={badge('purple')}>24 total</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>Name</th>
                    <th style={th}>Email</th>
                    <th style={th}>Role</th>
                    <th style={th}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Admin User', 'admin@kasambahay.com', 'Admin', 'Jan 1, 2026'],
                    ['Maria Santos', 'maria@example.com', 'Helper', 'Feb 3, 2026'],
                    ['Juan Dela Cruz', 'juan@example.com', 'Helper', 'Mar 10, 2026']
                  ].map(([n, e, r, d]) => (
                    <tr key={e}>
                      <td style={td}>{n}</td>
                      <td style={td}>{e}</td>
                      <td style={td}>
                        <span style={badge(r === 'Admin' ? 'purple' : 'green')}>{r}</span>
                      </td>
                      <td style={td}>{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Reports */}
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
                    ['Late salary payment', 'maria@example.com', 'May 14, 2026', 'Pending'],
                    ['Contract issue', 'juan@example.com', 'May 10, 2026', 'Resolved'],
                    ['Working hours dispute', 'ana@example.com', 'Apr 28, 2026', 'Resolved']
                  ].map(([r, u, d, s]) => (
                    <tr key={r}>
                      <td style={td}>{r}</td>
                      <td style={td}>{u}</td>
                      <td style={td}>{d}</td>
                      <td style={td}>
                        <span style={badge(s === 'Pending' ? 'amber' : 'green')}>{s}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default AdminDashboard