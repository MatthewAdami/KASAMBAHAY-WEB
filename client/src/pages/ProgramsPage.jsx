import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { useColors } from '../ThemeContext.jsx'
import { API_ENDPOINTS } from '../utils/api'

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` }
}

// ─── COLUMN DEFINITIONS ───────────────────────────────────────────────────────

const GIP_COLUMNS = [
  { key: 'year',                  label: 'Year'             },
  { key: 'batch',                 label: 'Batch'            },
  { key: 'name',                  label: 'Name'             },
  { key: 'age',                   label: 'Age'              },
  { key: 'sex',                   label: 'Sex'              },
  { key: 'contact',               label: 'Contact'          },
  { key: 'email',                 label: 'Email'            },
  { key: 'district',              label: 'District'         },
  { key: 'barangay',              label: 'Barangay'         },
  { key: 'educationalAttainment', label: 'Education'        },
  { key: 'courseProgram',         label: 'Course/Program'   },
  { key: 'skills',                label: 'Skills'           },
  { key: 'assignedSpdOfficer',    label: 'SPD Officer'      },
  { key: 'recommendedBy',         label: 'Recommended By'   },
  { key: 'remarks',               label: 'Remarks'          },
]

const SPES_COLUMNS = [
  { key: 'year',                  label: 'Year'             },
  { key: 'batch',                 label: 'Batch'            },
  { key: 'source',                label: 'Source'           },
  { key: 'fullName',              label: 'Full Name'        },
  { key: 'age',                   label: 'Age'              },
  { key: 'sex',                   label: 'Sex'              },
  { key: 'birthday',              label: 'Birthday'         },
  { key: 'contact',               label: 'Contact'          },
  { key: 'email',                 label: 'Email'            },
  { key: 'district',              label: 'District'         },
  { key: 'barangay',              label: 'Barangay'         },
  { key: 'presentAddress',        label: 'Address'          },
  { key: 'educationalAttainment', label: 'Education'        },
  { key: 'courseProgram',         label: 'Course/Program'   },
  { key: 'skills',                label: 'Skills'           },
  { key: 'recommendedBy',         label: 'Recommended By'   },
  { key: 'kasambahayType',        label: 'Kasambahay Type'  },
  { key: 'deskOfficer',           label: 'Desk Officer'     },
  { key: 'remarks',               label: 'Remarks'          },
]

// ─── CELL VALUE FORMATTER ─────────────────────────────────────────────────────

function formatCell(val, key) {
  if (val === null || val === undefined || val === '') return '—'
  if (Array.isArray(val)) return val.join(', ') || '—'
  if (key === 'birthday' && val) {
    try { return new Date(val).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) }
    catch { return val }
  }
  if (key === 'source') return val === 'lgu_form' ? 'LGU Form' : 'Manual'
  return String(val)
}

// ─── EXCEL EXPORT ─────────────────────────────────────────────────────────────

function exportToExcel(rows, columns, filenamePrefix) {
  if (rows.length === 0) {
    alert("No records to export.");
    return;
  }
  const wb = XLSX.utils.book_new();
  const batches = [...new Set(rows.map(r => r.batch))].sort((a, b) => a - b);

  batches.forEach(b => {
    const batchRows = rows.filter(r => r.batch === b);
    if (batchRows.length === 0) return;

    const headers = columns.map(c => c.label);
    const data = batchRows.map(row =>
      columns.map(c => {
        const v = row[c.key];
        if (Array.isArray(v)) return v.join(', ');
        if (v === null || v === undefined) return '';
        if (c.key === 'birthday' && v) {
          try { return new Date(v).toLocaleDateString('en-PH'); } catch { return v; }
        }
        return String(v);
      })
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    ws['!cols'] = columns.map((_, ci) => ({ wch: Math.max(...[headers, ...data].map(r => String(r[ci] || '').length), 10) }));
    XLSX.utils.book_append_sheet(wb, ws, `Batch ${b}`);
  });

  XLSX.writeFile(wb, `${filenamePrefix}.xlsx`);
}

// ─── SEARCH + FILTER BAR ──────────────────────────────────────────────────────

function Toolbar({ search, onSearch, onExport, total, filtered, viewDeleted, setViewDeleted, onAction, checkedCount, c }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px', borderBottom: `1px solid ${c.border}`, background: c.bgTopbar,
      flexWrap: 'wrap'
    }}>
      {/* Search */}
      <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
        <span style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          color: c.textMuted, fontSize: 14, pointerEvents: 'none',
        }}>🔍</span>
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search name, email, barangay…"
          style={{
            width: '100%', padding: '6px 10px 6px 32px',
            border: `1px solid ${c.border}`, borderRadius: 8,
            fontSize: 12, background: c.bgMuted, color: c.text,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Record count */}
      <span style={{ fontSize: 11, color: c.textMuted, whiteSpace: 'nowrap' }}>
        {filtered.toLocaleString()} / {total.toLocaleString()} records
      </span>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
        <button onClick={() => setViewDeleted(!viewDeleted)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: viewDeleted ? '#e53e3e' : c.bgMuted, color: viewDeleted ? '#fff' : c.text, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
          {viewDeleted ? 'View Active' : 'View Deleted'}
        </button>
        
        {!viewDeleted ? (
          <>
            <button onClick={() => onAction('add')} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: '#10b981', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>+ Add Record</button>
            <button onClick={() => onAction('edit')} disabled={checkedCount !== 1} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: checkedCount === 1 ? '#3b82f6' : c.bgMuted, color: checkedCount === 1 ? '#fff' : c.textMuted, fontSize: 12, cursor: checkedCount === 1 ? 'pointer' : 'not-allowed', fontWeight: 500 }}>Edit</button>
            <button onClick={() => onAction('soft')} disabled={checkedCount === 0} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: checkedCount > 0 ? '#f59e0b' : c.bgMuted, color: checkedCount > 0 ? '#fff' : c.textMuted, fontSize: 12, cursor: checkedCount > 0 ? 'pointer' : 'not-allowed', fontWeight: 500 }}>Soft Delete</button>
          </>
        ) : (
          <>
            <button onClick={() => onAction('restore')} disabled={checkedCount === 0} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: checkedCount > 0 ? '#10b981' : c.bgMuted, color: checkedCount > 0 ? '#fff' : c.textMuted, fontSize: 12, cursor: checkedCount > 0 ? 'pointer' : 'not-allowed', fontWeight: 500 }}>Restore</button>
            <button onClick={() => onAction('perm')} disabled={checkedCount === 0} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: checkedCount > 0 ? '#e53e3e' : c.bgMuted, color: checkedCount > 0 ? '#fff' : c.textMuted, fontSize: 12, cursor: checkedCount > 0 ? 'pointer' : 'not-allowed', fontWeight: 500 }}>Perm Delete</button>
          </>
        )}
        
        <button onClick={onExport} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${c.border}`, background: '#534AB7', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
          ⬇ Export to Excel
        </button>
      </div>
    </div>
  )
}

// ─── MODALS ───────────────────────────────────────────────────────────────────

function ProgramModal({ isGip, item, columns, onClose, onSuccess, c }) {
  const [form, setForm] = useState(item || { year: new Date().getFullYear(), batch: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const method = item ? 'PUT' : 'POST'
    const url = `${isGip ? API_ENDPOINTS.GIP_PROFILES : API_ENDPOINTS.SPES_PROFILES}${item ? `/${item._id}` : ''}`
    try {
      const res = await fetch(url, {
        method, headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error('Failed to save record.')
      onSuccess()
    } catch (err) { alert(err.message) } 
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <form onSubmit={handleSubmit} style={{ background: c.bgCard, width: '100%', maxWidth: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: 8, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${c.border}`, background: c.bgTopbar, display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, color: c.text }}>{item ? 'Edit Record' : `Add ${isGip ? 'GIP' : 'SPES'} Record`}</h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textMuted, fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {columns.map(col => (
            <div key={col.key}>
              <label style={{ display: 'block', fontSize: 12, color: c.textMuted, marginBottom: 4, fontWeight: 600 }}>{col.label}</label>
              <input value={form[col.key] || ''} onChange={e => setForm({ ...form, [col.key]: e.target.value })} style={{ width: '100%', padding: '8px 12px', border: `1px solid ${c.border}`, borderRadius: 6, background: c.bgInput, color: c.text, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 20px', borderTop: `1px solid ${c.border}`, background: c.bgTopbar, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', border: `1px solid ${c.border}`, background: c.bgMuted, color: c.text, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
          <button type="submit" disabled={loading} style={{ padding: '8px 16px', border: 'none', background: '#534AB7', color: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>{loading ? 'Saving...' : 'Save Record'}</button>
        </div>
      </form>
    </div>
  )
}

function ActionModal({ type, items, isGip, onClose, onSuccess, c }) {
  const [loading, setLoading] = useState(false)
  const actionName = { soft: 'Soft Delete', perm: 'Permanently Delete', restore: 'Restore' }[type]

  const handleConfirm = async () => {
    setLoading(true)
    const endpoint = isGip ? API_ENDPOINTS.GIP_PROFILES : API_ENDPOINTS.SPES_PROFILES
    try {
      for (const id of items) {
        if (type === 'perm') {
          await fetch(`${endpoint}/${id}`, { method: 'DELETE', headers: authHeader() })
        } else {
          await fetch(`${endpoint}/${id}`, { method: 'PATCH', headers: { ...authHeader(), 'Content-Type': 'application/json' }, body: JSON.stringify({ isDeleted: type === 'soft' }) })
        }
      }
      onSuccess()
    } catch (err) { alert('Error processing action') } 
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: c.bgCard, width: '100%', maxWidth: 400, borderRadius: 8, padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: '0 0 10px', color: c.text }}>Confirm Action</h3>
        <p style={{ color: c.textMuted, fontSize: 14, margin: '0 0 20px' }}>Are you sure you want to {actionName.toLowerCase()} <strong>{items.length}</strong> record(s)?</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', border: `1px solid ${c.border}`, background: c.bgMuted, color: c.text, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
          <button onClick={handleConfirm} disabled={loading} style={{ padding: '8px 16px', border: 'none', background: type === 'restore' ? '#10b981' : '#e53e3e', color: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>{loading ? 'Processing...' : actionName}</button>
        </div>
      </div>
    </div>
  )
}

// ─── TABLE ────────────────────────────────────────────────────────────────────

function DataTable({ rows, columns, checkedItems, setCheckedItems, c }) {
  if (rows.length === 0) return null;

  const handleCheckAll = (e) => {
    if (e.target.checked) setCheckedItems(rows.map(r => r._id))
    else setCheckedItems([])
  }
  const toggleCheck = (id) => {
    setCheckedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        fontSize: 12, tableLayout: 'fixed',
      }}>
        <colgroup>
          <col style={{ width: 44 }} />
          {columns.map(col => (
            <col key={col.key} style={{ width: col.width || 140 }} />
          ))}
        </colgroup>
        <thead>
          <tr style={{ background: c.bgMuted, position: 'sticky', top: 0, zIndex: 1 }}>
            <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: `1px solid ${c.border}` }}>
              <input type="checkbox" checked={rows.length > 0 && checkedItems.length === rows.length} onChange={handleCheckAll} />
            </th>
            {columns.map(col => (
              <th key={col.key} style={{
                padding: '8px 12px', textAlign: 'left',
                color: c.textMuted, fontWeight: 600, fontSize: 11,
                textTransform: 'uppercase', letterSpacing: '0.04em',
                borderBottom: `1px solid ${c.border}`,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row._id || i}
              style={{
                borderBottom: `1px solid ${c.border}`,
                background: i % 2 === 0 ? 'transparent' : `${c.border}22`,
              }}
            >
              <td style={{ padding: '7px 12px', textAlign: 'center', borderRight: `1px solid ${c.border}` }}>
                <input type="checkbox" checked={checkedItems.includes(row._id)} onChange={() => toggleCheck(row._id)} />
              </td>
              {columns.map(col => (
                <td key={col.key} style={{
                  padding: '7px 12px', color: col.key === 'batch' ? c.accent : c.text,
                  fontWeight: col.key === 'batch' ? 600 : 400,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  maxWidth: col.width || 140,
                }}
                  title={formatCell(row[col.key], col.key)}
                >
                  {formatCell(row[col.key], col.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── TAB ──────────────────────────────────────────────────────────────────────

function Tab({ label, active, count, onClick, c }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 20px', border: 'none', background: 'none',
        cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400,
        color: active ? c.accent : c.textMuted,
        borderBottom: active ? `2px solid ${c.accent}` : '2px solid transparent',
        transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 6,
      }}
    >
      {label}
      <span style={{
        fontSize: 10, padding: '1px 6px', borderRadius: 20,
        background: active ? '#EEEDFE' : c.bgMuted,
        color: active ? '#534AB7' : c.textMuted,
        fontWeight: 600,
      }}>
        {count ?? '…'}
      </span>
    </button>
  )
}

// ─── STATS ROW ────────────────────────────────────────────────────────────────

function StatsRow({ data, batches, c }) {
  const batchColors = ['#3b82f6', '#d4537e', '#e67e22', '#10b981', '#8b5cf6'];

  const pills = [
    { label: 'Total',   value: data.total,   color: '#534AB7' },
    ...batches.map((b, i) => ({ label: `Batch ${b}`, value: data[`batch${b}`], color: batchColors[i % batchColors.length] })),
    { label: 'Male',    value: data.male,    color: '#0F6E56' },
    { label: 'Female',  value: data.female,  color: '#993556' },
  ]
  return (
    <div style={{
      display: 'flex', gap: 10, padding: '10px 16px',
      borderBottom: `1px solid ${c.border}`, flexWrap: 'wrap',
    }}>
      {pills.map(p => (
        <div key={p.label} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 20,
          border: `1px solid ${p.color}22`, background: `${p.color}11`,
        }}>
          <span style={{ fontSize: 11, color: p.color, fontWeight: 700 }}>{p.value ?? '—'}</span>
          <span style={{ fontSize: 11, color: c.textMuted }}>{p.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ProgramsPage() {
  const c = useColors()

  const [activeTab, setActiveTab]     = useState('gip')
  const [gipData,   setGipData]       = useState([])
  const [spesData,  setSpesData]      = useState([])
  const [loading,   setLoading]       = useState({ gip: true, spes: true })
  const [error,     setError]         = useState('')
  const [viewDeleted, setViewDeleted] = useState(false)
  const [checkedItems, setCheckedItems] = useState([])
  const [modalState, setModalState]   = useState(null)

  const [gipSearch,  setGipSearch]    = useState('')
  const [speSearch,  setSpesSearch]   = useState('')
  const [gipBatch,   setGipBatch]     = useState('')
  const [spesBatch,  setSpesBatch]    = useState('')

  // ── Fetch both datasets on mount ─────────────────────────────────────────
  const loadData = () => {
    setLoading({ gip: true, spes: true })
    const headers = authHeader()

    fetch(API_ENDPOINTS.GIP_PROFILES, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setGipData(Array.isArray(data) ? data : data.data ?? [])
        setLoading(prev => ({ ...prev, gip: false }))
      })
      .catch(() => {
        setError('Failed to load GIP data.')
        setLoading(prev => ({ ...prev, gip: false }))
      })

    fetch(API_ENDPOINTS.SPES_PROFILES, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setSpesData(Array.isArray(data) ? data : data.data ?? [])
        setLoading(prev => ({ ...prev, spes: false }))
      })
      .catch(() => {
        setError('Failed to load SPES data.')
        setLoading(prev => ({ ...prev, spes: false }))
      })
  }

  useEffect(() => { loadData() }, [])

  // ── Filter logic ────────────────────────────────────────────────────────
  const filterRows = (rows, search, batch) => {
    let out = rows.filter(r => !!r.isDeleted === viewDeleted)
    if (batch) out = out.filter(r => String(r.batch) === String(batch))
    if (search.trim()) {
      const q = search.toLowerCase()
      out = out.filter(r =>
        ['name', 'fullName', 'email', 'barangay', 'contact', 'recommendedBy', 'courseProgram']
          .some(k => (r[k] || '').toLowerCase().includes(q)) ||
        (r.skills || []).some(s => s.toLowerCase().includes(q))
      )
    }
    return out
  }

  const filteredGip  = filterRows(gipData,  gipSearch,  gipBatch)
  const filteredSpes = filterRows(spesData, speSearch, spesBatch)

  // ── Unique batches ───────────────────────────────────────────────────────
  const gipBatches  = [...new Set(gipData.filter(r => !!r.isDeleted === viewDeleted).map(r => r.batch))].sort((a,b)=>a-b)
  const spesBatches = [...new Set(spesData.filter(r => !!r.isDeleted === viewDeleted).map(r => r.batch))].sort((a,b)=>a-b)

  // ── Stats ────────────────────────────────────────────────────────────────
  const statsFor = (rows, batches) => {
    const stats = {
      total:  rows.length,
      male:   rows.filter(r => (r.sex || '').toLowerCase() === 'male').length,
      female: rows.filter(r => (r.sex || '').toLowerCase() === 'female').length,
    }
    batches.forEach(b => { stats[`batch${b}`] = rows.filter(r => r.batch === b).length })
    return stats
  }

  const isGip = activeTab === 'gip'
  const displayRows = isGip ? filteredGip : filteredSpes
  const columns     = isGip ? GIP_COLUMNS  : SPES_COLUMNS

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setCheckedItems([])
  }

  const handleAction = (actionType) => {
    if (actionType === 'add') {
      setModalState({ type: 'add' })
    } else if (actionType === 'edit') {
      const row = displayRows.find(r => r._id === checkedItems[0])
      if (row) setModalState({ type: 'edit', item: row })
    } else {
      setModalState({ type: actionType, items: checkedItems })
    }
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: c.bg, height: '100vh', overflow: 'hidden',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {modalState && ['add', 'edit'].includes(modalState.type) && (
        <ProgramModal isGip={isGip} item={modalState.item} columns={columns} c={c} onClose={() => setModalState(null)} onSuccess={() => { setModalState(null); loadData(); setCheckedItems([]) }} />
      )}

      {modalState && ['soft', 'perm', 'restore'].includes(modalState.type) && (
        <ActionModal isGip={isGip} type={modalState.type} items={modalState.items} c={c} onClose={() => setModalState(null)} onSuccess={() => { setModalState(null); loadData(); setCheckedItems([]) }} />
      )}

      {/* ── Top Bar ────────────────────────────────────────────────────── */}
      <div style={{
        background: c.bgTopbar, borderBottom: `1px solid ${c.border}`,
        padding: '14px 20px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: c.text }}>
            📋 Programs
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: c.textMuted }}>
            GIP & SPES intern profiling records
          </p>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          margin: '12px 16px', borderRadius: 8, padding: '8px 14px',
          fontSize: 12, color: '#b91c1c', flexShrink: 0,
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', borderBottom: `1px solid ${c.border}`,
        background: c.bgTopbar, flexShrink: 0,
        paddingLeft: 8,
      }}>
        <Tab label="GIP"  active={isGip}  count={gipData.filter(r => !!r.isDeleted === viewDeleted).length}  onClick={() => handleTabChange('gip')}  c={c} />
        <Tab label="SPES" active={!isGip} count={spesData.filter(r => !!r.isDeleted === viewDeleted).length} onClick={() => handleTabChange('spes')} c={c} />
      </div>

      {/* ── Batch Tabs (Replaces Dropdown & Stacking) ──────────────────── */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: c.bgMuted, overflowX: 'auto', borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
        <button
          onClick={() => isGip ? setGipBatch('') : setSpesBatch('')}
          style={{ padding: '6px 14px', borderRadius: 20, border: 'none', background: (isGip ? !gipBatch : !spesBatch) ? c.accent : '#fff', color: (isGip ? !gipBatch : !spesBatch) ? '#fff' : c.textMuted, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
        >All Batches</button>
        {(isGip ? gipBatches : spesBatches).map(b => (
          <button
            key={b}
            onClick={() => isGip ? setGipBatch(String(b)) : setSpesBatch(String(b))}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', background: String(b) === (isGip ? gipBatch : spesBatch) ? c.accent : '#fff', color: String(b) === (isGip ? gipBatch : spesBatch) ? '#fff' : c.textMuted, cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >Batch {b}</button>
        ))}
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <StatsRow data={statsFor(displayRows, isGip ? gipBatches : spesBatches)} batches={isGip ? gipBatches : spesBatches} c={c} />

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <Toolbar
        search={isGip ? gipSearch : speSearch}
        onSearch={isGip ? setGipSearch : setSpesSearch}
        onExport={() => exportToExcel(displayRows, columns, isGip ? 'GIP_Profiles' : 'SPES_Profiles')}
        total={isGip ? gipData.filter(r => !!r.isDeleted === viewDeleted).length : spesData.filter(r => !!r.isDeleted === viewDeleted).length}
        filtered={displayRows.length}
        viewDeleted={viewDeleted}
        setViewDeleted={(v) => { setViewDeleted(v); setCheckedItems([]) }}
        onAction={handleAction}
        checkedCount={checkedItems.length}
        c={c}
      />

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {(isGip ? loading.gip : loading.spes) ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: c.textMuted, fontSize: 13 }}>Loading records…</div>
        ) : displayRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: c.textMuted, fontSize: 13 }}>No records found.</div>
        ) : (
          <DataTable
            rows={displayRows}
            columns={columns}
            checkedItems={checkedItems}
            setCheckedItems={setCheckedItems}
            c={c}
          />
        )}
      </div>
    </div>
  )
}