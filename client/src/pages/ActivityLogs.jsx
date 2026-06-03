import { useState, useEffect, useCallback } from 'react'
import { API_ENDPOINTS } from '../utils/api'

const LIMIT = 50

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ACTION_CONFIG = {
  CREATE: { bg: '#dcfce7', fg: '#15803d', dot: '#22c55e', label: 'Create' },
  ADD:    { bg: '#dcfce7', fg: '#15803d', dot: '#22c55e', label: 'Add'    },
  UPDATE: { bg: '#dbeafe', fg: '#1d4ed8', dot: '#3b82f6', label: 'Update' },
  EDIT:   { bg: '#dbeafe', fg: '#1d4ed8', dot: '#3b82f6', label: 'Edit'   },
  DELETE: { bg: '#fee2e2', fg: '#b91c1c', dot: '#ef4444', label: 'Delete' },
  RESTORE:{ bg: '#fef9c3', fg: '#a16207', dot: '#eab308', label: 'Restore'},
}

function getActionConfig(action = '') {
  const key = Object.keys(ACTION_CONFIG).find(k => action.toUpperCase().includes(k))
  return ACTION_CONFIG[key] || { bg: '#f3f4f6', fg: '#4b5563', dot: '#9ca3af', label: action }
}

function ActionBadge({ action }) {
  const { bg, fg, dot, label } = getActionConfig(action)
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, padding: '3px 9px', borderRadius: 20,
      background: bg, color: fg, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      {label}
    </span>
  )
}

const MODULE_ICONS = {
  Kasambahay: '🏠', Users: '👥', System: '⚙️', default: '📋'
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ filtered }) {
  return (
    <tr>
      <td colSpan={5}>
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#374151', margin: '0 0 4px' }}>
            {filtered ? 'No matching logs' : 'No activity yet'}
          </p>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
            {filtered ? 'Try clearing your filters.' : 'Actions will appear here as users interact with the system.'}
          </p>
        </div>
      </td>
    </tr>
  )
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      {[120, 100, 80, 70, 220].map((w, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <div style={{
            height: 12, width: w, borderRadius: 6,
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s infinite',
          }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────
function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
      border: `1px solid ${active ? '#534AB7' : '#e4e4e7'}`,
      background: active ? '#EEEDFE' : '#fff',
      color: active ? '#534AB7' : '#6b7280',
      fontWeight: active ? 600 : 400,
      transition: 'all 0.15s',
      fontFamily: 'inherit',
    }}>
      {label}
    </button>
  )
}

function DescriptionCell({ text = '' }) {
  const truncate = (str, max = 40) => {
    if (!str || str === 'N/A') return str || ''
    return str.length > max ? str.slice(0, max) + '…' : str
  }

  // Check if it contains "Changed:" — if not, just show plain text
  if (!text.includes('Changed:')) {
    return <span style={{ color: '#374151' }}>{text}</span>
  }

  const [headerPart, changePart] = text.split('. Changed:')
  const rawChanges = changePart?.trim() || ''

  // Parse "field: "old" → "new"" entries split by "; "
  const changes = rawChanges
    .split('; ')
    .map(entry => {
      // Match: fieldName: "old" → "new"
      const match = entry.match(/^(.+?):\s*"(.*)"\s*→\s*"(.*)"$/)
      if (!match) return null
      const [, field, oldVal, newVal] = match
      // Skip if both are empty or both are N/A
      if ((oldVal === '' && newVal === '') || (oldVal === 'N/A' && newVal === 'N/A')) return null
      return { field: field.trim(), oldVal, newVal }
    })
    .filter(Boolean)

  return (
    <div>
      {/* Header */}
      <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#111', fontSize: 12 }}>
        {headerPart?.trim()}
      </p>

      {/* Changed fields list */}
      {changes.length > 0 && (
        <div style={{
          maxHeight: 140, overflowY: 'auto',
          background: '#f8f7ff', borderRadius: 6,
          border: '1px solid #e4e2f5',
          padding: '6px 8px',
        }}>
          {changes.map(({ field, oldVal, newVal }, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 6,
              padding: '3px 0',
              borderBottom: i < changes.length - 1 ? '1px solid #ede9f9' : 'none',
            }}>
              {/* Bullet + field name */}
              <span style={{ color: '#534AB7', fontSize: 11, flexShrink: 0, marginTop: 1 }}>•</span>
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#534AB7',
                minWidth: 100, flexShrink: 0,
              }}>
                {field}
              </span>
              {/* Old → New */}
              <span style={{ fontSize: 11, color: '#6b7280', wordBreak: 'break-all' }}>
                <span style={{
                  background: '#fee2e2', color: '#b91c1c',
                  padding: '1px 5px', borderRadius: 4, marginRight: 4,
                  fontFamily: 'monospace',
                }}>
                  {truncate(oldVal) || '—'}
                </span>
                <span style={{ color: '#9ca3af', margin: '0 4px' }}>→</span>
                <span style={{
                  background: '#dcfce7', color: '#15803d',
                  padding: '1px 5px', borderRadius: 4,
                  fontFamily: 'monospace',
                }}>
                  {truncate(newVal) || '—'}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ActivityLogs() {
  const [logs, setLogs]             = useState([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [page, setPage]             = useState(1)
  const [pagination, setPagination] = useState(null)
  const [search, setSearch]         = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')

  const fetchLogs = useCallback(async (pageNum = 1) => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
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

  useEffect(() => { fetchLogs(1) }, [fetchLogs])

  // ── Client-side filtering (search + module + action) ──
  const filtered = logs.filter(log => {
    const q = search.toLowerCase()
    const matchSearch = !q || [
      log.description, log.user?.name, log.userName, log.module, log.action
    ].some(v => v?.toLowerCase().includes(q))

    const matchModule = moduleFilter === 'all' || (log.module || 'System') === moduleFilter
    const matchAction = actionFilter === 'all' || getActionConfig(log.action).label.toLowerCase() === actionFilter

    return matchSearch && matchModule && matchAction
  })

  // Derive unique modules from loaded logs
  const modules = ['all', ...Array.from(new Set(logs.map(l => l.module || 'System')))]

  const pageBtn = (active) => ({
    height: 30, minWidth: 30, padding: '0 8px', borderRadius: 6,
    border: `1px solid ${active ? '#534AB7' : '#e4e4e7'}`,
    background: active ? '#534AB7' : '#fff',
    color: active ? '#fff' : '#374151',
    fontSize: 12, cursor: 'pointer', fontWeight: active ? 600 : 400,
    fontFamily: 'inherit', transition: 'all 0.15s',
  })

  const hasFilters = search || moduleFilter !== 'all' || actionFilter !== 'all'

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
        .log-row:hover { background: #f8f7ff !important; }
        .log-row { transition: background 0.1s; }
      `}</style>

      <div style={{ padding: '16px', minHeight: '100vh', background: '#f7f7f8' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#111', margin: '0 0 3px' }}>Activity Logs</h2>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              Track user actions, data changes, and system events.
              {pagination && !loading && (
                <span style={{ marginLeft: 6, color: '#534AB7', fontWeight: 500 }}>
                  {pagination.total.toLocaleString()} total entries
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => fetchLogs(page)}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 36, padding: '0 14px',
              background: '#fff', color: '#374151',
              border: '1px solid #e4e4e7', borderRadius: 8,
              fontSize: 12, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: loading ? 0.6 : 1,
            }}
          >
            <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>↻</span>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{
            background: '#fff1f1', border: '1px solid #fecaca', borderRadius: 8,
            padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ── Filters ── */}
        <div style={{
          background: '#fff', border: '1px solid #e4e4e7', borderRadius: 10,
          padding: '12px 14px', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 13, pointerEvents: 'none' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search logs…"
              style={{
                width: '100%', paddingLeft: 32, paddingRight: 10, height: 32,
                border: '1px solid #e4e4e7', borderRadius: 8, fontSize: 12,
                color: '#111', background: '#fafafa', outline: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: '#e4e4e7', flexShrink: 0 }} />

          {/* Module filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap' }}>Module</span>
            {modules.map(m => (
              <FilterChip
                key={m}
                label={m === 'all' ? 'All' : `${MODULE_ICONS[m] || MODULE_ICONS.default} ${m}`}
                active={moduleFilter === m}
                onClick={() => setModuleFilter(m)}
              />
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: '#e4e4e7', flexShrink: 0 }} />

          {/* Action filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap' }}>Action</span>
            {['all', 'create', 'add', 'edit', 'update', 'delete', 'restore'].map(a => (
              <FilterChip key={a} label={a === 'all' ? 'All' : a.charAt(0).toUpperCase() + a.slice(1)} active={actionFilter === a} onClick={() => setActionFilter(a)} />
            ))}
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setModuleFilter('all'); setActionFilter('all') }}
              style={{
                marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, border: 'none',
                background: '#f3f4f6', color: '#6b7280', fontSize: 11, cursor: 'pointer',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#fafafa', position: 'sticky', top: 0, zIndex: 1 }}>
                  {['Date & Time', 'User', 'Module', 'Action', 'Description'].map((h, i) => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left', fontWeight: 600,
                      fontSize: 11, color: '#6b7280', textTransform: 'uppercase',
                      letterSpacing: '0.05em', borderBottom: '1px solid #e4e4e7',
                      whiteSpace: 'nowrap', background: '#fafafa',
                      width: i === 4 ? '100%' : 'auto',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && logs.length === 0
                  ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                  : filtered.length === 0
                  ? <EmptyState filtered={hasFilters} />
                  : filtered.map((log) => {
                      const mod = log.module || 'System'
                      const icon = MODULE_ICONS[mod] || MODULE_ICONS.default
                      const name = log.user?.name || log.userName || 'Unknown'
                      const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

                      return (
                        <tr key={log._id} className="log-row" style={{ borderBottom: '1px solid #f3f4f6' }}>
                          {/* Date */}
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#6b7280', fontSize: 12 }}>
                            {new Date(log.createdAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>

                          {/* User */}
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 28, height: 28, borderRadius: '50%',
                                background: '#EEEDFE', color: '#534AB7',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 10, fontWeight: 600, flexShrink: 0,
                              }}>
                                {initials}
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>{name}</span>
                            </div>
                          </td>

                          {/* Module */}
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              fontSize: 12, color: '#374151', background: '#f9fafb',
                              border: '1px solid #e4e4e7', borderRadius: 6,
                              padding: '2px 8px',
                            }}>
                              {icon} {mod}
                            </span>
                          </td>

                          {/* Action */}
                          <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                            <ActionBadge action={log.action} />
                          </td>

                          {/* Description */}
                          <td style={{ padding: '12px 16px', fontSize: 12, minWidth: 200, maxWidth: 420 }}>
                            <DescriptionCell text={log.description} />
                          </td>
                        </tr>
                      )
                    })
                }
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {pagination?.totalPages > 1 && (
            <div style={{
              padding: '10px 16px', borderTop: '1px solid #e4e4e7',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 10, background: '#fafafa',
            }}>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>
                Showing <strong style={{ color: '#374151' }}>{((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, pagination.total)}</strong> of <strong style={{ color: '#374151' }}>{pagination.total.toLocaleString()}</strong> logs
              </span>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <button onClick={() => fetchLogs(page - 1)} disabled={page === 1 || loading} style={{ ...pageBtn(false), opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 2)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, idx) =>
                    p === '…'
                      ? <span key={`e-${idx}`} style={{ padding: '0 4px', fontSize: 12, color: '#9ca3af', lineHeight: '30px' }}>…</span>
                      : <button key={p} onClick={() => fetchLogs(p)} disabled={loading} style={pageBtn(p === page)}>{p}</button>
                  )}
                <button onClick={() => fetchLogs(page + 1)} disabled={page === pagination.totalPages || loading} style={{ ...pageBtn(false), opacity: page === pagination.totalPages ? 0.4 : 1 }}>Next →</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Filtered count hint ── */}
        {hasFilters && !loading && (
          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, textAlign: 'right' }}>
            Showing {filtered.length} of {logs.length} loaded logs matching filters
          </p>
        )}

      </div>
    </>
  )
}