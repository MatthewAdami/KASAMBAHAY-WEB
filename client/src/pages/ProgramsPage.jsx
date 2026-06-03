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

// ── Reference data ────────────────────────────────────────────────────────────

const DISTRICTS = [1, 2, 3, 4, 5, 6]

const BARANGAYS_BY_DISTRICT = {
  1: ['Alicia','Bagong Pag-asa','Bahay Toro','Balingasa','Bungad','Damar','Damayan','Del Monte','Katipunan','Laging Handa','Maharlika','Manresa','Mariblo','Masambong','New Era','Pag-ibig sa Nayon','Paang Bundok','Pahinga Norte','Pahinga Sur','Project 6','Ramon Magsaysay','Saint Peter','Salvacion','San Antonio','San Isidro Labrador','San Jose','Siena','Talayan','Veterans Village','West Triangle'],
  2: ['Amihan','Bagong Silangan','Batasan Hills','Commonwealth','Holy Spirit','Payatas','Sauyo'],
  3: ['Bagumbayan','Bagumbuhay','Bayanihan','Blue Ridge A','Blue Ridge B','Camp Aguinaldo','Claro','Dioquino Zobel','Duyan-Duyan','E. Rodriguez','East Kamias','Escopa I','Escopa II','Escopa III','Escopa IV','Kristong Hari','Krus na Ligas','Lourdes','Loyola Heights','Maharlika','Manga','Manhik','Mariana','Masagana','Matandang Balara','Milagrosa','Pansol','Quirino 2-A','Quirino 2-B','Quirino 2-C','Quirino 3-A','San Roque','Silangan','Socorro','Tagumpay','Ugong Norte','Villa Maria Clara','West Kamias','White Plains'],
  4: ['Bagong Lipunan ng Crame','Botocan','Central','Damayang Lagi','Don Manuel','Doña Aurora','Doña Imelda','Doña Josefa','Horseshoe','Immaculate Concepcion','Kalusugan','Kamuning','Kaunlaran','Kristong Hari','Krus na Ligas','Laging Handa','Malaya','Marilag','Obrero','Old Capitol Site','Paligsahan','Pinagkaisahan','Pinyahan','Roxas','Sacred Heart','San Isidro Galas','San Martin de Porres','San Vicente','Santol','Scout Borromeo','Scout Chua','Scout Madriñan','Scout Rallos','Scout Albano','Sikatuna Village','South Triangle','Talayan',"Teacher's Village East","Teacher's Village West",'U.P. Campus','U.P. Village','Valencia'],
  5: ['Bagbag','Capri','Fairview','Glendale','Greater Lagro','Gulod','Kaligayahan','Nagkaisang Nayon','North Fairview','Novaliches Proper','Paligayahan','San Agustin','San Bartolome','San Francisco','San Isidro','Sta. Lucia','Sta. Monica','Pasong Putik Proper','Sangandaan'],
  6: ['Apolonio Samson','Baesa','Balumbato','Culiat','New Era','Pasong Tamo','Sangandaan','Sauyo','Talipapa','Tandang Sora','Unang Sigaw'],
}

const BATCH_OPTIONS  = [1, 2, 3, 4, 5]
const SEX_OPTIONS    = ['Male', 'Female']
const SOURCE_OPTIONS = [{ value: 'manual', label: 'Manual' }, { value: 'lgu_form', label: 'LGU Form' }]
const EDUC_OPTIONS   = ['Elementary Graduate','High School Graduate','Senior High Graduate','College Level','College Graduate','Vocational/Technical']

// ── Section layout definitions ────────────────────────────────────────────────

const GIP_SECTIONS = [
  {
    title: '📋 Program Info',
    fields: [
      { key: 'year',  label: 'Year',  half: true },
      { key: 'batch', label: 'Batch', half: true, required: true },
    ],
  },
  {
    title: '👤 Personal Info',
    fields: [
      { key: 'name', label: 'Full Name' },
      { key: 'age',  label: 'Age', half: true },
      { key: 'sex',  label: 'Sex', half: true },
    ],
  },
  {
    title: '📞 Contact',
    fields: [
      { key: 'contact', label: 'Contact Number', half: true },
      { key: 'email',   label: 'Email',           half: true },
    ],
  },
  {
    title: '📍 Location',
    fields: [
      { key: 'district', label: 'District', half: true },
      { key: 'barangay', label: 'Barangay', half: true },
    ],
  },
  {
    title: '🎓 Education',
    fields: [
      { key: 'educationalAttainment', label: 'Educational Attainment', half: true },
      { key: 'courseProgram',         label: 'Course / Program',       half: true },
      { key: 'skills',                label: 'Skills' },
    ],
  },
  {
    title: '📝 Assignment',
    fields: [
      { key: 'assignedSpdOfficer', label: 'Assigned SPD Officer', half: true },
      { key: 'recommendedBy',      label: 'Recommended By',       half: true },
      { key: 'remarks',            label: 'Remarks' },
    ],
  },
]

const SPES_SECTIONS = [
  {
    title: '📋 Program Info',
    fields: [
      { key: 'year',   label: 'Year',   half: true },
      { key: 'batch',  label: 'Batch',  half: true, required: true },
      { key: 'source', label: 'Source', half: true, required: true },
    ],
  },
  {
    title: '👤 Personal Info',
    fields: [
      { key: 'fullName',   label: 'Full Name' },
      { key: 'lastName',   label: 'Last Name',   half: true },
      { key: 'firstName',  label: 'First Name',  half: true },
      { key: 'middleName', label: 'Middle Name', half: true },
      { key: 'age',        label: 'Age',         half: true },
      { key: 'sex',        label: 'Sex',         half: true },
      { key: 'birthday',   label: 'Birthday',    half: true },
    ],
  },
  {
    title: '📞 Contact',
    fields: [
      { key: 'contact', label: 'Contact Number', half: true },
      { key: 'email',   label: 'Email',           half: true },
    ],
  },
  {
    title: '📍 Location',
    fields: [
      { key: 'district',       label: 'District', half: true },
      { key: 'barangay',       label: 'Barangay', half: true },
      { key: 'presentAddress', label: 'Present Address' },
    ],
  },
  {
    title: '🎓 Education',
    fields: [
      { key: 'educationalAttainment', label: 'Educational Attainment', half: true },
      { key: 'courseProgram',         label: 'Course / Program',       half: true },
      { key: 'skills',                label: 'Skills' },
    ],
  },
  {
    title: '📝 Assignment',
    fields: [
      { key: 'recommendedBy',  label: 'Recommended By',  half: true },
      { key: 'kasambahayType', label: 'Kasambahay Type', half: true },
      { key: 'deskOfficer',    label: 'Desk Officer',    half: true },
      { key: 'remarks',        label: 'Remarks' },
    ],
  },
]

// ── Field renderer ────────────────────────────────────────────────────────────

function ModalField({ fieldKey, value, onChange, district, c }) {
  const inputStyle = {
    width: '100%', padding: '7px 10px',
    border: `1px solid ${c.border}`, borderRadius: 6,
    background: c.bgInput, color: c.text,
    fontSize: 13, boxSizing: 'border-box',
  }
  const selectStyle = { ...inputStyle, cursor: 'pointer' }

  if (fieldKey === 'batch') {
    return (
      <select value={value ?? ''} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} style={selectStyle}>
        <option value="">— Select Batch —</option>
        {BATCH_OPTIONS.map(b => <option key={b} value={b}>Batch {b}</option>)}
      </select>
    )
  }
  if (fieldKey === 'district') {
    return (
      <select value={value ?? ''} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} style={selectStyle}>
        <option value="">— Select District —</option>
        {DISTRICTS.map(d => <option key={d} value={d}>District {d}</option>)}
      </select>
    )
  }
  if (fieldKey === 'barangay') {
    const barangayList = district ? (BARANGAYS_BY_DISTRICT[Number(district)] || []) : []
    if (barangayList.length > 0) {
      return (
        <select value={value || ''} onChange={e => onChange(e.target.value)} style={selectStyle}>
          <option value="">— Select Barangay —</option>
          {barangayList.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      )
    }
    return <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Select a district first" style={inputStyle} />
  }
  if (fieldKey === 'sex') {
    return (
      <select value={value || ''} onChange={e => onChange(e.target.value)} style={selectStyle}>
        <option value="">— Select Sex —</option>
        {SEX_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  if (fieldKey === 'source') {
    return (
      <select value={value || 'manual'} onChange={e => onChange(e.target.value)} style={selectStyle}>
        {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    )
  }
  if (fieldKey === 'educationalAttainment') {
    return (
      <select value={value || ''} onChange={e => onChange(e.target.value)} style={selectStyle}>
        <option value="">— Select —</option>
        {EDUC_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  if (fieldKey === 'skills') {
    const display = Array.isArray(value) ? value.join(', ') : (value || '')
    return (
      <div>
        <input
          value={display}
          onChange={e => onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
          placeholder="e.g. Encoding, Filing, Customer Service"
          style={inputStyle}
        />
        <span style={{ fontSize: 10, color: c.textMuted, marginTop: 2, display: 'block' }}>Separate with commas</span>
      </div>
    )
  }
  if (fieldKey === 'birthday') {
    const dateVal = value ? (() => { try { return new Date(value).toISOString().slice(0, 10) } catch { return '' } })() : ''
    return <input type="date" value={dateVal} onChange={e => onChange(e.target.value)} style={inputStyle} />
  }
  if (fieldKey === 'year' || fieldKey === 'age') {
    return <input type="number" value={value ?? ''} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle} />
  }
  if (fieldKey === 'remarks' || fieldKey === 'presentAddress' || fieldKey === 'permanentAddress') {
    return <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
  }
  return <input value={value ?? ''} onChange={e => onChange(e.target.value)} style={inputStyle} />
}

// ── Main modal ────────────────────────────────────────────────────────────────

function ProgramModal({ isGip, item, onClose, onSuccess, c }) {
  const sections = isGip ? GIP_SECTIONS : SPES_SECTIONS
  const defaultForm = isGip
    ? { year: new Date().getFullYear(), batch: '' }
    : { year: new Date().getFullYear(), batch: '', source: 'manual' }

  const [form, setForm] = useState(() => {
    if (!item) return defaultForm
    // strip Mongoose meta fields so PUT doesn't get rejected
    const { _id, __v, createdAt, updatedAt, ...rest } = item
    return rest
  })
  const [loading,    setLoading]    = useState(false)
  const [fieldError, setFieldError] = useState('')

  const setField = (key, val) => {
    setForm(prev => {
      const next = { ...prev, [key]: val }
      // clear barangay when district changes
      if (key === 'district') next.barangay = ''
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFieldError('')
    if (!form.batch)          { setFieldError('Batch is required.');  return }
    if (!isGip && !form.source) { setFieldError('Source is required.'); return }
    setLoading(true)
    const method = item ? 'PUT' : 'POST'
    const url    = `${isGip ? API_ENDPOINTS.GIP_PROFILES : API_ENDPOINTS.SPES_PROFILES}${item ? `/${item._id}` : ''}`
    try {
      const res  = await fetch(url, {
        method,
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save record.')
      onSuccess()
    } catch (err) {
      setFieldError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={handleSubmit} style={{ background: c.bgCard, width: '100%', maxWidth: 680, maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: 10, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${c.border}`, background: c.bgTopbar, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: c.text }}>{item ? `Edit ${isGip ? 'GIP' : 'SPES'} Record` : `Add ${isGip ? 'GIP' : 'SPES'} Record`}</h3>
            <p style={{ margin: 0, fontSize: 11, color: c.textMuted }}>Fields marked <span style={{ color: '#e53e3e' }}>*</span> are required</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.textMuted, fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {fieldError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#b91c1c' }}>
              ⚠ {fieldError}
            </div>
          )}

          {sections.map(section => (
            <div key={section.title}>
              {/* Section header */}
              <div style={{ fontSize: 11, fontWeight: 700, color: c.accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${c.border}` }}>
                {section.title}
              </div>
              {/* Fields grid */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {section.fields.map(f => (
                  <div key={f.key} style={{ flex: f.half ? '1 1 calc(50% - 5px)' : '1 1 100%', minWidth: f.half ? 160 : '100%' }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: c.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {f.label}{f.required && <span style={{ color: '#e53e3e', marginLeft: 2 }}>*</span>}
                    </label>
                    <ModalField
                      fieldKey={f.key}
                      value={form[f.key]}
                      onChange={val => setField(f.key, val)}
                      district={form.district}
                      c={c}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: `1px solid ${c.border}`, background: c.bgTopbar, display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 18px', border: `1px solid ${c.border}`, background: c.bgMuted, color: c.text, borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Cancel</button>
          <button type="submit" disabled={loading} style={{ padding: '8px 18px', border: 'none', background: '#534AB7', color: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Saving…' : (item ? 'Save Changes' : 'Add Record')}
          </button>
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

  // ── Fetch both datasets ───────────────────────────────────────────────────
  const loadData = (deleted) => {
    const isDeleted = deleted !== undefined ? deleted : viewDeleted
    setLoading({ gip: true, spes: true })
    const headers = authHeader()
    const qs = isDeleted ? '?deleted=true' : ''

    fetch(`${API_ENDPOINTS.GIP_PROFILES}${qs}`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setGipData(Array.isArray(data) ? data : data.data ?? [])
        setLoading(prev => ({ ...prev, gip: false }))
      })
      .catch(() => {
        setError('Failed to load GIP data.')
        setLoading(prev => ({ ...prev, gip: false }))
      })

    fetch(`${API_ENDPOINTS.SPES_PROFILES}${qs}`, { headers })
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

  useEffect(() => { loadData(viewDeleted) }, [viewDeleted])

  // ── Filter logic ────────────────────────────────────────────────────────
  const filterRows = (rows, search, batch) => {
    let out = [...rows]  // backend already filters isDeleted
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
  const gipBatches  = [...new Set(gipData.map(r => r.batch))].sort((a,b)=>a-b)
  const spesBatches = [...new Set(spesData.map(r => r.batch))].sort((a,b)=>a-b)

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
        <Tab label="GIP"  active={isGip}  count={gipData.length}  onClick={() => handleTabChange('gip')}  c={c} />
        <Tab label="SPES" active={!isGip} count={spesData.length} onClick={() => handleTabChange('spes')} c={c} />
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
        total={isGip ? gipData.length : spesData.length}
        filtered={displayRows.length}
        viewDeleted={viewDeleted}
        setViewDeleted={(v) => { setViewDeleted(v); setCheckedItems([]); loadData(v) }}
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