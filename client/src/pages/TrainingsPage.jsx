import React, { useState, useEffect } from 'react'
import { API_ENDPOINTS } from '../utils/api'

const API_URL  = API_ENDPOINTS.KASAMBAHAY
const DISTRICTS = ['District 1','District 2','District 3','District 4','District 5','District 6']
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 2023 }, (_, i) => 2024 + i)

const TRAININGS = [
  { key: 'kasambahayOrientation',       label: 'Kasambahay Orientation',          field: 'orientation'  },
  { key: 'kasambahayOrganizing',        label: 'Kasambahay Organizing',            field: 'organizing'   },
  { key: 'occupationalSafetyAndHealth', label: 'Occupational Safety & Health',     field: 'osh'          },
  { key: 'genderSensitivityTraining',   label: 'Gender Sensitivity Training',      field: 'genderSens'   },
  { key: 'basicFirstAidTraining',       label: 'Basic First Aid Training',         field: 'firstAid'     },
  { key: 'homeSecurityAwareness',       label: 'Home Security Awareness',          field: 'homeSec'      },
  { key: 'kasambahayGeneralAssembly',   label: 'General Assembly',                 field: 'genAssembly'  },
  { key: 'kasambahayDay',               label: 'Kasambahay Day',                   field: 'kasDay'       },
  { key: 'disasterPreparedness',        label: 'Disaster Preparedness',            field: 'disaster'     },
  { key: 'qcCareOrientation',           label: 'QC Care Orientation',              field: 'qcCare'       },
]

async function fetchAll(token) {
  let page = 1, all = []
  while (true) {
    const res = await fetch(`${API_URL}?limit=500&page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    const json = await res.json()
    all = all.concat(json.data || json || [])
    const { totalPages } = json.pagination || {}
    if (!totalPages || page >= totalPages) break
    page++
  }
  return all
}

function buildTrainingData(records) {
  const map = {}
  DISTRICTS.forEach(d => {
    map[d] = { district: d }
    TRAININGS.forEach(t => { map[d][t.field] = 0 })
    map[d].subtotal = 0
  })

  for (const r of records) {
    const d = map[r.district]
    if (!d) continue
    d.subtotal++
    TRAININGS.forEach(t => { if (r[t.key]) d[t.field]++ })
  }

  return DISTRICTS.map(d => map[d])
}

function buildTotals(rows) {
  const t = { district: 'TOTAL', subtotal: 0 }
  TRAININGS.forEach(tr => { t[tr.field] = 0 })
  rows.forEach(r => {
    t.subtotal += r.subtotal
    TRAININGS.forEach(tr => { t[tr.field] += r[tr.field] || 0 })
  })
  return t
}

const S = {
  page:  { padding: '20px 16px', fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 13, color: 'inherit', background: 'transparent', minHeight: '100vh' },
  card:  { background: '#fff', borderRadius: 10, border: '1px solid #e4e2f5', marginBottom: 20, overflow: 'hidden' },
  th:    { background: '#f0eefb', color: '#534AB7', fontWeight: 600, padding: '8px 10px', textAlign: 'center', borderBottom: '2px solid #d5d0f0', borderRight: '1px solid #e0dcf5', whiteSpace: 'nowrap', fontSize: 11 },
  thL:   { background: '#f0eefb', color: '#534AB7', fontWeight: 600, padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid #d5d0f0', borderRight: '1px solid #e0dcf5', whiteSpace: 'nowrap', fontSize: 11 },
  td:    { padding: '7px 10px', textAlign: 'center', borderBottom: '1px solid #eeeaf8', borderRight: '1px solid #f0ecf9', color: '#333' },
  tdL:   { padding: '7px 10px', textAlign: 'left', borderBottom: '1px solid #eeeaf8', borderRight: '1px solid #f0ecf9', color: '#333', fontWeight: 600 },
  tot:   { background: '#edeaf9', fontWeight: 700, color: '#3c3289' },
  metric:{ background: '#f3f1fd', borderRadius: 8, padding: '12px 14px', textAlign: 'center' },
}

const n = (v) => (v || 0).toLocaleString()
const pct = (a, b) => b ? `${((a / b) * 100).toFixed(1)}%` : '0%'

export default function TrainingsPage() {
  const [rows,    setRows]    = useState([])
  const [totals,  setTotals]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [filterYear,     setFilterYear]     = useState('')
  const [filterDistrict, setFilterDistrict] = useState('')
  const [view,    setView]    = useState('count') // 'count' | 'percent'
  const [rawCount, setRawCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token')
        const records = await fetchAll(token)
        setRawCount(records.length)
        applyAndSet(records, '', '')
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const applyAndSet = (records, year, district) => {
    let filtered = records
    if (year)     filtered = filtered.filter(r => r.year === Number(year))
    if (district) filtered = filtered.filter(r => r.district === district)
    const built = buildTrainingData(filtered)
    setRows(built)
    setTotals(buildTotals(built))
  }

  const [allRecords, setAllRecords] = useState([])
  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token')
        const records = await fetchAll(token)
        setAllRecords(records)
        setRawCount(records.length)
        const built = buildTrainingData(records)
        setRows(built)
        setTotals(buildTotals(built))
      } catch (e) { setError(e.message) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const handleFilter = (year, district) => {
    setFilterYear(year)
    setFilterDistrict(district)
    applyAndSet(allRecords, year, district)
  }

  if (loading) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ textAlign: 'center', color: '#534AB7' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div style={{ fontWeight: 600 }}>Loading trainings data…</div>
        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>Fetching all records from the database</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ textAlign: 'center', color: '#c0392b' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 600 }}>Failed to load data</div>
        <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{error}</div>
      </div>
    </div>
  )

  const tot = totals || {}

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, color: '#2d2a6e', fontWeight: 700 }}>Trainings & Programs</h2>
          <p style={{ margin: 0, color: '#888', fontSize: 12 }}>
            {rawCount.toLocaleString()} total records · All 6 Districts ·
            Generated: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ ...S.card }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, padding: 16 }}>
          {TRAININGS.map(t => (
            <div key={t.field} style={S.metric}>
              <div style={{ fontSize: 10, color: '#7874a7', marginBottom: 4, lineHeight: 1.3 }}>{t.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#534AB7' }}>{n(tot[t.field])}</div>
              <div style={{ fontSize: 10, color: '#a09ec0', marginTop: 2 }}>{pct(tot[t.field], tot.subtotal)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters + Table */}
      <div style={S.card}>
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', padding: '12px 16px', background: '#f8f7fd', borderBottom: '1px solid #e4e2f5' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#534AB7', alignSelf: 'center' }}>🔍 Filters:</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#7874a7', marginBottom: 3 }}>Year</div>
            <select value={filterYear} onChange={e => handleFilter(e.target.value, filterDistrict)}
              style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #d5d0f0', fontSize: 12, color: '#333', background: '#fff', cursor: 'pointer' }}>
              <option value="">All Years</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#7874a7', marginBottom: 3 }}>District</div>
            <select value={filterDistrict} onChange={e => handleFilter(filterYear, e.target.value)}
              style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #d5d0f0', fontSize: 12, color: '#333', background: '#fff', cursor: 'pointer' }}>
              <option value="">All Districts</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#7874a7', marginBottom: 3 }}>View</div>
            <div style={{ display: 'flex', border: '1px solid #d5d0f0', borderRadius: 6, overflow: 'hidden' }}>
              {[['count','#  Count'],['percent','%  Percent']].map(([v, l]) => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: '5px 12px', fontSize: 12, border: 'none', cursor: 'pointer',
                  background: view === v ? '#534AB7' : '#fff',
                  color: view === v ? '#fff' : '#534AB7', fontWeight: view === v ? 700 : 400,
                }}>{l}</button>
              ))}
            </div>
          </div>
          {(filterYear || filterDistrict) && (
            <button onClick={() => handleFilter('', '')}
              style={{ padding: '5px 12px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12, alignSelf: 'flex-end' }}>
              ✕ Reset
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 900 }}>
            <thead>
              <tr>
                <th style={S.thL}>District</th>
                <th style={{ ...S.th, background: '#e8f3e8', color: '#3b6d11' }}>Total Kasambahay</th>
                {TRAININGS.map(t => (
                  <th key={t.field} style={{ ...S.th, background: '#eef5ff', color: '#1d4ed8' }}>{t.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.district} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fe' }}>
                  <td style={S.tdL}>{r.district}</td>
                  <td style={{ ...S.td, fontWeight: 700, color: '#3b6d11' }}>{n(r.subtotal)}</td>
                  {TRAININGS.map(t => (
                    <td key={t.field} style={S.td}>
                      {view === 'count' ? n(r[t.field]) : pct(r[t.field], r.subtotal)}
                    </td>
                  ))}
                </tr>
              ))}
              {totals && (
                <tr style={S.tot}>
                  <td style={{ ...S.tdL, ...S.tot }}>TOTAL</td>
                  <td style={{ ...S.td, ...S.tot }}>{n(tot.subtotal)}</td>
                  {TRAININGS.map(t => (
                    <td key={t.field} style={{ ...S.td, ...S.tot }}>
                      {view === 'count' ? n(tot[t.field]) : pct(tot[t.field], tot.subtotal)}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
