import { useState, useEffect, useCallback } from 'react'
import { API_ENDPOINTS } from '../utils/api'

const LIMIT = 50

function Badge({ color, children }) {
  const BADGE_COLORS = {
    blue:   ['#dbeafe', '#1d4ed8'], // Edit/Update
    green:  ['#dcfce7', '#15803d'], // Add/Create
    red:    ['#fee2e2', '#b91c1c'], // Delete
    purple: ['#EEEDFE', '#534AB7'], // System/Other
    gray:   ['#f3f4f6', '#4b5563'], // Default
  }
  const [bg, fg] = BADGE_COLORS[color] || BADGE_COLORS.gray
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: bg, color: fg, whiteSpace: 'nowrap', fontWeight: 600 }}>
      {children}
    </span>
  )
}

export default function ActivityLogs() {
  const [logs, setLogs]             = useState([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [page, setPage]             = useState(1)
  const [pagination, setPagination] = useState(null)

  const fetchLogs = useCallback(async (pageNum = 1) => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      // Ensure you add ACTIVITY_LOGS to your api.js endpoints, fallback provided here
      const endpoint = API_ENDPOINTS.ACTIVITY_LOGS || '/api/activity-logs'
      const res = await fetch(`${endpoint}?page=${pageNum}&limit=${LIMIT}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed to fetch activity logs.')
      
      setLogs(json.data || [])
      setPagination(json.pagination)
      setPage(pageNum)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  const getActionBadgeColor = (action) => {
    const act = action?.toUpperCase() || ''
    if (act.includes('CREATE') || act.includes('ADD')) return 'green'
    if (act.includes('UPDATE') || act.includes('EDIT')) return 'blue'
    if (act.includes('DELETE')) return 'red'
    return 'gray'
  }

  const pageBtn = (active) => ({
    height: 30, minWidth: 30, padding: '0 8px', borderRadius: 6,
    border: '1px solid #e4e4e7',
    background: active ? '#534AB7' : '#fff',
    color: active ? '#fff' : '#111',
    fontSize: 12, cursor: 'pointer', fontWeight: active ? 600 : 400,
  })

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#f9f9f9' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111', margin: 0 }}>Activity Logs</h2>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Track user actions, data modifications, and system events.</p>
        </div>
        <button 
          onClick={() => fetchLogs(page)} 
          disabled={loading}
          style={{ height: 38, padding: '0 16px', background: '#fff', color: '#111', border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444', marginBottom: 16 }}>{error}</div>}

      {/* Logs Table */}
      <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '2px solid #e4e4e7', position: 'sticky', top: 0, background: '#fafafa' }}>Date & Time</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '2px solid #e4e4e7', position: 'sticky', top: 0, background: '#fafafa' }}>User</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '2px solid #e4e4e7', position: 'sticky', top: 0, background: '#fafafa' }}>Module</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '2px solid #e4e4e7', position: 'sticky', top: 0, background: '#fafafa' }}>Action</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '2px solid #e4e4e7', width: '100%', position: 'sticky', top: 0, background: '#fafafa' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {loading && logs.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Loading activity logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 13 }}>No activity logs found.</td></tr>
              ) : logs.map((log) => (
                <tr key={log._id} style={{ borderBottom: '1px solid #f0f0f0' }} onMouseEnter={e => e.currentTarget.style.background = '#fafff8'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px', color: '#666' }}>
                    {new Date(log.createdAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 500, color: '#111' }}>
                    {log.user?.name || log.userName || 'Unknown User'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#555' }}>
                    {log.module || 'System'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge color={getActionBadgeColor(log.action)}>{log.action}</Badge>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#333', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                    {log.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination?.totalPages > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, background: '#fff' }}>
            <span style={{ fontSize: 12, color: '#888' }}>
              Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, pagination.total)} of {pagination.total.toLocaleString()} logs
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => fetchLogs(page - 1)} disabled={page === 1 || loading} style={{ ...pageBtn(false), opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 2)
                .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...'); acc.push(p); return acc }, [])
                .map((p, idx) =>
                  p === '...'
                    ? <span key={`e-${idx}`} style={{ padding: '0 4px', fontSize: 12, color: '#aaa', lineHeight: '30px' }}>…</span>
                    : <button key={p} onClick={() => fetchLogs(p)} disabled={loading} style={pageBtn(p === page)}>{p}</button>
                )}
              <button onClick={() => fetchLogs(page + 1)} disabled={page === pagination.totalPages || loading} style={{ ...pageBtn(false), opacity: page === pagination.totalPages ? 0.4 : 1 }}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}