import React from 'react'
import { useColors } from '../ThemeContext.jsx'
import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import * as XLSX from 'xlsx'

import { API_ENDPOINTS } from '../utils/api'
const API_URL = API_ENDPOINTS.KASAMBAHAY
const DISTRICTS = ['District 1','District 2','District 3','District 4','District 5','District 6']
// Dynamic: always includes current year, never needs manual updating
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 2023 }, (_, i) => 2024 + i)
const COLORS    = ['#534AB7','#9FE1CB','#F4A261','#E76F51','#6A4C93','#2EC4B6','#A8DADC','#457B9D']

// ─── Fetch all paginated records ──────────────────────────────────────────────
async function fetchAll(token) {
  let page = 1, all = []
  while (true) {
    const res  = await fetch(`${API_URL}?limit=500&page=${page}`, {
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

// ─── Classify birth place ─────────────────────────────────────────────────────
const NCR_KEYWORDS = [
  'manila','quezon city','qc','caloocan','malabon','navotas','valenzuela',
  'makati','pasay','taguig','parañaque','paranaque','las piñas','las pinas',
  'muntinlupa','mandaluyong','marikina','pasig','san juan','pateros',
  'ncr','metro manila','national capital',
]
function classifyBirthPlace(raw) {
  if (!raw) return 'Unknown'
  const v = raw.trim().toLowerCase()
  if (NCR_KEYWORDS.some(k => v.includes(k))) return 'NCR'
  return 'Province'
}

// ─── Build benefit % data by district and by year ────────────────────────────
function buildBenefits(records) {
  const distMap = {}
  DISTRICTS.forEach(d => { distMap[d] = { total: 0, sss: 0, pagibig: 0, philhealth: 0, qcid: 0 } })
  const yearMap = {}
  YEARS.forEach(y => { yearMap[y] = { total: 0, sss: 0, pagibig: 0, philhealth: 0, qcid: 0 } })

  // Also track any years in the data beyond our YEARS array
  for (const r of records) {
    if (r.year && !yearMap[r.year]) yearMap[r.year] = { total: 0, sss: 0, pagibig: 0, philhealth: 0, qcid: 0 }
    const d = distMap[r.district]
    const y = yearMap[r.year]
    const hasSss        = r.sss        && r.sss        !== 'No'
    const hasPagibig    = r.pagIbig    && r.pagIbig    !== 'No'
    const hasPhilhealth = r.philhealth && r.philhealth !== 'No'
    const hasQcid       = r.qcid       && r.qcid       !== 'No'

    if (d) {
      d.total++
      if (hasSss)        d.sss++
      if (hasPagibig)    d.pagibig++
      if (hasPhilhealth) d.philhealth++
      if (hasQcid)       d.qcid++
    }
    if (y) {
      y.total++
      if (hasSss)        y.sss++
      if (hasPagibig)    y.pagibig++
      if (hasPhilhealth) y.philhealth++
      if (hasQcid)       y.qcid++
    }
  }

  const pct = (n, t) => t ? +((n / t) * 100).toFixed(1) : 0

  const byDistrict = DISTRICTS.map(d => {
    const v = distMap[d]
    return {
      name: d.replace('District ', 'D'),
      label: d,
      total: v.total,
      'SSS':        pct(v.sss, v.total),
      'Pag-IBIG':   pct(v.pagibig, v.total),
      'PhilHealth': pct(v.philhealth, v.total),
      'QCID':       pct(v.qcid, v.total),
      rawSss: v.sss, rawPagibig: v.pagibig, rawPhilhealth: v.philhealth, rawQcid: v.qcid,
    }
  })

  // Only show years that actually have records
  const byYear = Object.entries(yearMap)
    .filter(([, v]) => v.total > 0)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([yr, v]) => ({
      name: String(yr),
      total: v.total,
      'SSS':        pct(v.sss, v.total),
      'Pag-IBIG':   pct(v.pagibig, v.total),
      'PhilHealth': pct(v.philhealth, v.total),
      'QCID':       pct(v.qcid, v.total),
      rawSss: v.sss, rawPagibig: v.pagibig, rawPhilhealth: v.philhealth, rawQcid: v.qcid,
    }))

  return { byDistrict, byYear }
}

// ─── Build birth place data ───────────────────────────────────────────────────
function buildBirthPlace(records) {
  let ncr = 0, province = 0, unknown = 0
  const placeCount = {}

  for (const r of records) {
    const cls = classifyBirthPlace(r.birthPlace)
    if (cls === 'NCR') ncr++
    else if (cls === 'Province') province++
    else unknown++

    if (r.birthPlace?.trim()) {
      const key = r.birthPlace.trim()
      placeCount[key] = (placeCount[key] || 0) + 1
    }
  }

  const total = records.length
  const overview = [
    { name: 'NCR', value: ncr, pct: total ? +((ncr / total) * 100).toFixed(1) : 0 },
    { name: 'Province', value: province, pct: total ? +((province / total) * 100).toFixed(1) : 0 },
    { name: 'Unknown', value: unknown, pct: total ? +((unknown / total) * 100).toFixed(1) : 0 },
  ].filter(x => x.value > 0)

  const topPlaces = Object.entries(placeCount)
    .map(([place, count]) => ({ place, count, pct: total ? +((count / total) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  return { overview, topPlaces, ncr, province, unknown, total }
}

// ─── Build educational attainment data ───────────────────────────────────────
const EDU_LEVELS = [
  { key: 'Elementary',          match: ['elementary', 'grade', 'elem'] },
  { key: 'High School',         match: ['high school', 'highschool', 'secondary', 'hs'] },
  { key: 'Vocational / TESDA',  match: ['vocational', 'tesda', 'tech-voc', 'techvoc', 'tech voc', 'nc ii', 'ncii'] },
  { key: 'College',             match: ['college', 'bachelor', 'bsn', 'bsa', 'bsba', 'ab ', 'bs ', 'undergraduate', 'graduate', 'university'] },
  { key: 'Post-Graduate',       match: ['master', 'doctorate', 'phd', 'post-grad', 'postgrad'] },
]

function classifyEdu(raw) {
  if (!raw) return 'Not Specified'
  const v = raw.trim().toLowerCase()
  for (const lvl of [...EDU_LEVELS].reverse()) {
    if (lvl.match.some(m => v.includes(m))) return lvl.key
  }
  return 'Not Specified'
}

function buildEducation(records) {
  const totals = {}
  EDU_LEVELS.forEach(l => { totals[l.key] = 0 })
  totals['Not Specified'] = 0

  const distMap = {}
  DISTRICTS.forEach(d => {
    distMap[d] = {}
    EDU_LEVELS.forEach(l => { distMap[d][l.key] = 0 })
    distMap[d]['Not Specified'] = 0
  })

  for (const r of records) {
    const cls = classifyEdu(r.educationalAttainment)
    totals[cls] = (totals[cls] || 0) + 1
    if (distMap[r.district]) distMap[r.district][cls] = (distMap[r.district][cls] || 0) + 1
  }

  const total = records.length
  const overview = Object.entries(totals)
    .map(([level, count]) => ({ level, count, pct: total ? +((count / total) * 100).toFixed(1) : 0 }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)

  const byDistrict = DISTRICTS.map(d => {
    const row = { name: d.replace('District ', 'D'), label: d }
    EDU_LEVELS.forEach(l => { row[l.key] = distMap[d][l.key] })
    return row
  })

  return { overview, byDistrict }
}

// ─── Build demographics data ──────────────────────────────────────────────────
function buildDemographics(records) {
  let male = 0, female = 0, total = records.length
  for (const r of records) {
    if (r.isMale) male++
    else if (r.isFemale) female++
  }
  const pieData = [
    { name: 'Female', value: female, pct: total ? +((female / total) * 100).toFixed(1) : 0 },
    { name: 'Male', value: male, pct: total ? +((male / total) * 100).toFixed(1) : 0 },
  ].filter(x => x.value > 0)
  return { pieData, male, female, total }
}

// ─── Build barangay distribution ──────────────────────────────────────────────
function buildBarangayStats(records) {
  const counts = {}
  let total = 0
  for (const r of records) {
    if (r.barangay && r.barangay.trim() !== '' && r.barangay.trim().toUpperCase() !== 'N/A') {
      const b = r.barangay.trim().toUpperCase()
      counts[b] = (counts[b] || 0) + 1
      total++
    }
  }
  const list = Object.entries(counts)
    .map(([barangay, count]) => ({ barangay, count, pct: total ? +((count / total) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.count - a.count)
  return { list, total }
}

// ─── Export to Excel ──────────────────────────────────────────────────────────
function exportToExcel(benefits, birthPlace, education, demographics, barangayStats) {
  const wb = XLSX.utils.book_new()
  const autoW = data => data[0]?.map((_, ci) => ({ wch: Math.max(...data.map(r => String(r[ci] ?? '').length), 10) }))

  const b1 = [
    ['District', 'Total', 'SSS #', 'SSS %', 'Pag-IBIG #', 'Pag-IBIG %', 'PhilHealth #', 'PhilHealth %', 'QCID #', 'QCID %'],
    ...benefits.byDistrict.map(r => [r.label, r.total, r.rawSss, `${r['SSS']}%`, r.rawPagibig, `${r['Pag-IBIG']}%`, r.rawPhilhealth, `${r['PhilHealth']}%`, r.rawQcid, `${r['QCID']}%`]),
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(b1); ws1['!cols'] = autoW(b1)
  XLSX.utils.book_append_sheet(wb, ws1, 'Benefits by District')

  const b2 = [
    ['Year', 'Total', 'SSS #', 'SSS %', 'Pag-IBIG #', 'Pag-IBIG %', 'PhilHealth #', 'PhilHealth %', 'QCID #', 'QCID %'],
    ...benefits.byYear.map(r => [r.name, r.total, r.rawSss, `${r['SSS']}%`, r.rawPagibig, `${r['Pag-IBIG']}%`, r.rawPhilhealth, `${r['PhilHealth']}%`, r.rawQcid, `${r['QCID']}%`]),
  ]
  const ws2 = XLSX.utils.aoa_to_sheet(b2); ws2['!cols'] = autoW(b2)
  XLSX.utils.book_append_sheet(wb, ws2, 'Benefits by Year')

  const b3 = [
    ['Category', 'Count', 'Percentage'],
    ...birthPlace.overview.map(r => [r.name, r.value, `${r.pct}%`]),
    [],
    ['Top Birth Places', 'Count', 'Percentage'],
    ...birthPlace.topPlaces.map(r => [r.place, r.count, `${r.pct}%`]),
  ]
  const ws3 = XLSX.utils.aoa_to_sheet(b3); ws3['!cols'] = autoW(b3.filter(r => r.length > 0))
  XLSX.utils.book_append_sheet(wb, ws3, 'Birth Place')

  const b4 = [
    ['Education Level', 'Count', 'Percentage'],
    ...education.overview.map(r => [r.level, r.count, `${r.pct}%`]),
  ]
  const ws4 = XLSX.utils.aoa_to_sheet(b4); ws4['!cols'] = autoW(b4)
  XLSX.utils.book_append_sheet(wb, ws4, 'Educational Attainment')

  const b5 = [['Gender', 'Count', 'Percentage'], ...demographics.pieData.map(r => [r.name, r.value, `${r.pct}%`])]
  const ws5 = XLSX.utils.aoa_to_sheet(b5); ws5['!cols'] = autoW(b5)
  XLSX.utils.book_append_sheet(wb, ws5, 'Demographics')

  const b6 = [['Barangay', 'Count', 'Percentage'], ...barangayStats.list.map(r => [r.barangay, r.count, `${r.pct}%`])]
  const ws6 = XLSX.utils.aoa_to_sheet(b6); ws6['!cols'] = autoW(b6)
  XLSX.utils.book_append_sheet(wb, ws6, 'Top Barangays')

  XLSX.writeFile(wb, 'Kasambahay_Analytics_Report.xlsx')
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page:   { padding: '20px 16px', fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 13, color: 'inherit', background: 'transparent', minHeight: '100vh' },
  card:   { background: '#fff', borderRadius: 10, border: '1px solid #e4e2f5', marginBottom: 20, overflow: 'hidden' },
  tabBar: { display: 'flex', borderBottom: '2px solid #e4e2f5', background: '#fff', padding: '0 16px', overflowX: 'auto' },
  tab:    (a) => ({ padding: '10px 18px', fontWeight: a ? 700 : 500, fontSize: 13, color: a ? '#534AB7' : '#888', background: 'none', border: 'none', borderBottom: `2px solid ${a ? '#534AB7' : 'transparent'}`, marginBottom: -2, cursor: 'pointer', whiteSpace: 'nowrap' }),
  tbl:    { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th:     { background: '#f0eefb', color: '#534AB7', fontWeight: 600, padding: '8px 12px', textAlign: 'center', borderBottom: '2px solid #d5d0f0', borderRight: '1px solid #e0dcf5', whiteSpace: 'nowrap', fontSize: 11 },
  thL:    { background: '#f0eefb', color: '#534AB7', fontWeight: 600, padding: '8px 12px', textAlign: 'left',   borderBottom: '2px solid #d5d0f0', borderRight: '1px solid #e0dcf5', whiteSpace: 'nowrap', fontSize: 11 },
  td:     { padding: '7px 12px', textAlign: 'center', borderBottom: '1px solid #eeeaf8', borderRight: '1px solid #f0ecf9', color: '#333' },
  tdL:    { padding: '7px 12px', textAlign: 'left',   borderBottom: '1px solid #eeeaf8', borderRight: '1px solid #f0ecf9', color: '#333', fontWeight: 600 },
  tot:    { background: '#edeaf9', fontWeight: 700, color: '#3c3289' },
  metric: { background: '#f3f1fd', borderRadius: 8, padding: '14px 16px', textAlign: 'center' },
  mLabel: { fontSize: 11, color: '#7874a7', marginBottom: 4 },
  mVal:   { fontSize: 24, fontWeight: 700, color: '#534AB7' },
  mSub:   { fontSize: 11, color: '#a09ec0', marginTop: 2 },
  btn:    { padding: '9px 20px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  sectionHead: { fontSize: 11, fontWeight: 700, color: '#7874a7', letterSpacing: '.07em', textTransform: 'uppercase', margin: '0 0 12px 0' },
  bar:  { height: 8, borderRadius: 4, background: '#e4e2f5', overflow: 'hidden', marginTop: 4 },
}

const pctBar = (val, color = '#534AB7') => (
  <div style={S.bar}>
    <div style={{ height: '100%', width: `${Math.min(100, val)}%`, background: color, borderRadius: 4, transition: 'width 0.5s' }} />
  </div>
)

const BENEFIT_COLORS = { 'SSS': '#534AB7', 'Pag-IBIG': '#F4A261', 'PhilHealth': '#2EC4B6', 'QCID': '#E76F51' }

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [tab,          setTab]          = useState('benefits')
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [benefits,     setBenefits]     = useState(null)
  const [birthPlace,   setBirthPlace]   = useState(null)
  const [education,    setEducation]    = useState(null)
  const [demographics, setDemographics] = useState(null)
  const [barangayStats,setBarangayStats]= useState(null)
  const [rawCount,     setRawCount]     = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const token   = localStorage.getItem('token')
        const records = await fetchAll(token)
        setRawCount(records.length)
        setBenefits(buildBenefits(records))
        setBirthPlace(buildBirthPlace(records))
        setEducation(buildEducation(records))
        setDemographics(buildDemographics(records))
        setBarangayStats(buildBarangayStats(records))
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ textAlign: 'center', color: '#534AB7' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div style={{ fontWeight: 600 }}>Loading analytics…</div>
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

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, color: '#2d2a6e', fontWeight: 700 }}>Analytics Report</h2>
          <p style={{ margin: 0, color: '#888', fontSize: 12 }}>
            {rawCount.toLocaleString()} total records · Generated: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={() => exportToExcel(benefits, birthPlace, education, demographics, barangayStats)} style={{ ...S.btn, background: '#10b981' }} className="hide-on-print">
          📊 Export to Excel
        </button>
      </div>

      {/* Tabs */}
      <div style={S.card}>
        <div style={S.tabBar}>
          {[
            { key: 'benefits',    label: '🏥 Benefit Coverage %' },
            { key: 'demographics',label: '🚻 Demographics' },
            { key: 'birthplace',  label: '📍 Birth Place' },
            { key: 'education',   label: '🎓 Educational Attainment' },
            { key: 'barangay',    label: '🏘️ Top Barangays' },
          ].map(t => (
            <button key={t.key} style={S.tab(tab === t.key)} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* ── Benefits Tab ── */}
        {tab === 'benefits' && benefits && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total Records', val: rawCount.toLocaleString(), sub: YEARS.join(' + ') },
                ...Object.entries(BENEFIT_COLORS).map(([b, color]) => {
                  const totalAll  = benefits.byDistrict.reduce((s, r) => s + r.total, 0)
                  const rawKey    = { 'SSS': 'rawSss', 'Pag-IBIG': 'rawPagibig', 'PhilHealth': 'rawPhilhealth', 'QCID': 'rawQcid' }[b]
                  const totalHave = benefits.byDistrict.reduce((s, r) => s + r[rawKey], 0)
                  const pct       = totalAll ? +((totalHave / totalAll) * 100).toFixed(1) : 0
                  return { label: b, val: `${pct}%`, sub: `${totalHave.toLocaleString()} of ${totalAll.toLocaleString()}`, color }
                })
              ].map(m => (
                <div key={m.label} style={S.metric}>
                  <div style={S.mLabel}>{m.label}</div>
                  <div style={{ ...S.mVal, color: m.color || '#534AB7' }}>{m.val}</div>
                  <div style={S.mSub}>{m.sub}</div>
                </div>
              ))}
            </div>

            <p style={S.sectionHead}>Benefit Coverage % by District</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={benefits.byDistrict} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => `${v}%`} domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => `${val}%`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {Object.entries(BENEFIT_COLORS).map(([b, color]) => (
                  <Bar key={b} dataKey={b} fill={color} radius={[3, 3, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>

            <div style={{ overflowX: 'auto', marginTop: 20 }}>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    <th style={S.thL}>District</th>
                    <th style={S.th}>Total</th>
                    {Object.keys(BENEFIT_COLORS).map(b => (
                      <React.Fragment key={b}>
                        <th style={S.th}>{b} #</th>
                        <th style={{ ...S.th, color: BENEFIT_COLORS[b] }}>{b} %</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {benefits.byDistrict.map((r, i) => (
                    <tr key={r.label} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fe' }}>
                      <td style={S.tdL}>{r.label}</td>
                      <td style={S.td}>{r.total.toLocaleString()}</td>
                      {[['rawSss','SSS'],['rawPagibig','Pag-IBIG'],['rawPhilhealth','PhilHealth'],['rawQcid','QCID']].map(([rk, bk]) => (
                        <React.Fragment key={rk}>
                          <td style={S.td}>{r[rk].toLocaleString()}</td>
                          <td style={{ ...S.td, fontWeight: 600, color: BENEFIT_COLORS[bk] }}>{r[bk]}%</td>
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                  {(() => {
                    const tot = benefits.byDistrict.reduce((acc, r) => {
                      acc.total += r.total; acc.rawSss += r.rawSss; acc.rawPagibig += r.rawPagibig; acc.rawPhilhealth += r.rawPhilhealth; acc.rawQcid += r.rawQcid; return acc
                    }, { total: 0, rawSss: 0, rawPagibig: 0, rawPhilhealth: 0, rawQcid: 0 })
                    return (
                      <tr style={S.tot}>
                        <td style={{ ...S.tdL, ...S.tot }}>TOTAL / OVERALL</td>
                        <td style={{ ...S.td, ...S.tot }}>{tot.total.toLocaleString()}</td>
                        {[['rawSss','SSS'],['rawPagibig','Pag-IBIG'],['rawPhilhealth','PhilHealth'],['rawQcid','QCID']].map(([rk, bk]) => {
                          const p = tot.total ? +((tot[rk] / tot.total) * 100).toFixed(1) : 0
                          return (
                            <React.Fragment key={rk}>
                              <td style={{ ...S.td, ...S.tot }}>{tot[rk].toLocaleString()}</td>
                              <td style={{ ...S.td, ...S.tot }}>{p}%</td>
                            </React.Fragment>
                          )
                        })}
                      </tr>
                    )
                  })()}
                </tbody>
              </table>
            </div>

            {/* By Year — only shows years with actual records */}
            <p style={{ ...S.sectionHead, marginTop: 28 }}>Benefit Coverage % by Year</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {benefits.byYear.map(y => (
                <div key={y.name} style={{ border: '1px solid #e4e2f5', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ background: '#534AB7', color: '#fff', padding: '8px 14px', fontWeight: 700, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Year {y.name}</span>
                    <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.85 }}>{y.total.toLocaleString()} records</span>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    {Object.entries(BENEFIT_COLORS).map(([b, color]) => (
                      <div key={b} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                          <span style={{ fontWeight: 600, color }}>{b}</span>
                          <span style={{ color: '#555' }}>{y[b]}% ({({ 'SSS': y.rawSss, 'Pag-IBIG': y.rawPagibig, 'PhilHealth': y.rawPhilhealth, 'QCID': y.rawQcid }[b]).toLocaleString()})</span>
                        </div>
                        {pctBar(y[b], color)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Birth Place Tab ── */}
        {tab === 'birthplace' && birthPlace && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total Records', val: birthPlace.total.toLocaleString(), sub: 'all kasambahay', color: '#534AB7' },
                { label: 'From NCR',      val: birthPlace.ncr.toLocaleString(),   sub: `${birthPlace.overview.find(x => x.name === 'NCR')?.pct ?? 0}% of total`, color: '#2EC4B6' },
                { label: 'From Province', val: birthPlace.province.toLocaleString(), sub: `${birthPlace.overview.find(x => x.name === 'Province')?.pct ?? 0}% of total`, color: '#F4A261' },
                { label: 'Not Specified', val: birthPlace.unknown.toLocaleString(),  sub: 'blank birth place', color: '#999' },
              ].map(m => (
                <div key={m.label} style={S.metric}>
                  <div style={S.mLabel}>{m.label}</div>
                  <div style={{ ...S.mVal, color: m.color }}>{m.val}</div>
                  <div style={S.mSub}>{m.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
              <div>
                <p style={S.sectionHead}>NCR vs Province Breakdown</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={birthPlace.overview} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, pct }) => `${name} ${pct}%`} labelLine={false}>
                      {birthPlace.overview.map((_, i) => <Cell key={i} fill={['#2EC4B6','#F4A261','#ccc'][i]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} (${birthPlace.overview.find(x=>x.name===n)?.pct}%)`, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p style={S.sectionHead}>Top 20 Birth Places</p>
                <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #e4e2f5', borderRadius: 8 }}>
                  <table style={S.tbl}>
                    <thead>
                      <tr>
                        <th style={{ ...S.thL, position: 'sticky', top: 0 }}>#</th>
                        <th style={{ ...S.thL, position: 'sticky', top: 0 }}>Birth Place</th>
                        <th style={{ ...S.th,  position: 'sticky', top: 0 }}>Count</th>
                        <th style={{ ...S.th,  position: 'sticky', top: 0 }}>%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {birthPlace.topPlaces.map((r, i) => (
                        <tr key={r.place} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fe' }}>
                          <td style={{ ...S.tdL, color: '#999', fontWeight: 400 }}>{i + 1}</td>
                          <td style={S.tdL}>{r.place}</td>
                          <td style={S.td}>{r.count.toLocaleString()}</td>
                          <td style={{ ...S.td, fontWeight: 600, color: '#534AB7' }}>{r.pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {birthPlace.topPlaces.length > 0 && (
              <>
                <p style={{ ...S.sectionHead, marginTop: 8 }}>Top 10 Birth Places (chart)</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={birthPlace.topPlaces.slice(0, 10).map(r => ({ name: r.place.length > 16 ? r.place.slice(0, 14) + '…' : r.place, fullName: r.place, count: r.count }))} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, n, p) => [v, p.payload.fullName]} />
                    <Bar dataKey="count" fill="#534AB7" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        )}

        {/* ── Education Tab ── */}
        {tab === 'education' && education && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
              {education.overview.map((r, i) => (
                <div key={r.level} style={S.metric}>
                  <div style={S.mLabel}>{r.level}</div>
                  <div style={{ ...S.mVal, color: COLORS[i % COLORS.length] }}>{r.count.toLocaleString()}</div>
                  <div style={S.mSub}>{r.pct}% of total</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
              <div>
                <p style={S.sectionHead}>Overall Distribution</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={education.overview} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius={85} label={({ pct }) => `${pct}%`} labelLine={false}>
                      {education.overview.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p style={S.sectionHead}>Count & Percentage</p>
                <table style={S.tbl}>
                  <thead>
                    <tr>
                      <th style={S.thL}>Education Level</th>
                      <th style={S.th}>Count</th>
                      <th style={S.th}>%</th>
                      <th style={{ ...S.th, width: 100 }}>Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {education.overview.map((r, i) => (
                      <tr key={r.level} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fe' }}>
                        <td style={S.tdL}>{r.level}</td>
                        <td style={S.td}>{r.count.toLocaleString()}</td>
                        <td style={{ ...S.td, fontWeight: 600, color: COLORS[i % COLORS.length] }}>{r.pct}%</td>
                        <td style={{ ...S.td, padding: '7px 12px' }}>{pctBar(r.pct, COLORS[i % COLORS.length])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p style={{ ...S.sectionHead, marginTop: 8 }}>Educational Attainment by District</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={education.byDistrict} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {EDU_LEVELS.map((l, i) => (
                  <Bar key={l.key} dataKey={l.key} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === EDU_LEVELS.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Demographics Tab ── */}
        {tab === 'demographics' && demographics && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
              <div style={S.metric}><div style={S.mLabel}>Total Kasambahay</div><div style={{ ...S.mVal, color: '#534AB7' }}>{demographics.total.toLocaleString()}</div></div>
              <div style={S.metric}><div style={S.mLabel}>Female</div><div style={{ ...S.mVal, color: '#d4537e' }}>{demographics.female.toLocaleString()}</div><div style={S.mSub}>{demographics.pieData.find(x => x.name === 'Female')?.pct || 0}%</div></div>
              <div style={S.metric}><div style={S.mLabel}>Male</div><div style={{ ...S.mVal, color: '#3b82f6' }}>{demographics.male.toLocaleString()}</div><div style={S.mSub}>{demographics.pieData.find(x => x.name === 'Male')?.pct || 0}%</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              <div>
                <p style={S.sectionHead}>Sex Distribution</p>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={demographics.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, pct }) => `${name} ${pct}%`}>
                      {demographics.pieData.map((entry, i) => <Cell key={i} fill={entry.name === 'Female' ? '#d4537e' : '#3b82f6'} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {barangayStats && (() => {
                const top = barangayStats.list.slice(0, 5)
                const others = barangayStats.list.slice(5).reduce((s, r) => s + r.count, 0)
                const pieData = [...top]
                if (others > 0) pieData.push({ barangay: 'Others', count: others, pct: barangayStats.total ? +((others / barangayStats.total) * 100).toFixed(1) : 0 })
                return (
                  <div>
                    <p style={S.sectionHead}>Top 5 Barangays Distribution</p>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={pieData} dataKey="count" nameKey="barangay" cx="50%" cy="50%" outerRadius={100} label={({ barangay, pct }) => `${barangay.length > 12 ? barangay.slice(0,10)+'…' : barangay} ${pct}%`}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.barangay === 'Others' ? '#e5e7eb' : COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* ── Barangays Tab ── */}
        {tab === 'barangay' && barangayStats && (
          <div style={{ padding: 20 }}>
            <p style={S.sectionHead}>Top 20 Barangays with Most Kasambahay</p>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={barangayStats.list.slice(0, 20)} margin={{ top: 5, right: 20, left: 0, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                <XAxis dataKey="barangay" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => val.toLocaleString()} />
                <Bar dataKey="count" fill="#2EC4B6" radius={[3, 3, 0, 0]} name="Kasambahay Count" />
              </BarChart>
            </ResponsiveContainer>
            <p style={{ ...S.sectionHead, marginTop: 30 }}>All Barangays Breakdown</p>
            <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid #e4e2f5', borderRadius: 8 }}>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    <th style={{ ...S.thL, position: 'sticky', top: 0 }}>Rank</th>
                    <th style={{ ...S.thL, position: 'sticky', top: 0 }}>Barangay</th>
                    <th style={{ ...S.th,  position: 'sticky', top: 0 }}>Total Kasambahay</th>
                    <th style={{ ...S.th,  position: 'sticky', top: 0 }}>% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {barangayStats.list.map((r, i) => (
                    <tr key={r.barangay} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fe' }}>
                      <td style={{ ...S.tdL, color: '#999', fontWeight: 400 }}>{i + 1}</td>
                      <td style={S.tdL}>{r.barangay}</td>
                      <td style={S.td}>{r.count.toLocaleString()}</td>
                      <td style={{ ...S.td, fontWeight: 600, color: '#534AB7' }}>{r.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@media print { .hide-on-print { display: none !important; } }` }} />
    </div>
  )
}
