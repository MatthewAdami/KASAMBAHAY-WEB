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
const YEARS     = [2024, 2025]
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
  // per district
  const distMap = {}
  DISTRICTS.forEach(d => { distMap[d] = { total: 0, sss: 0, pagibig: 0, philhealth: 0, qcid: 0 } })
  // per year
  const yearMap = {}
  YEARS.forEach(y => { yearMap[y] = { total: 0, sss: 0, pagibig: 0, philhealth: 0, qcid: 0 } })

  for (const r of records) {
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

  const byYear = YEARS.map(y => {
    const v = yearMap[y]
    return {
      name: String(y),
      total: v.total,
      'SSS':        pct(v.sss, v.total),
      'Pag-IBIG':   pct(v.pagibig, v.total),
      'PhilHealth': pct(v.philhealth, v.total),
      'QCID':       pct(v.qcid, v.total),
      rawSss: v.sss, rawPagibig: v.pagibig, rawPhilhealth: v.philhealth, rawQcid: v.qcid,
    }
  })

  return { byDistrict, byYear }
}

// ─── Build birth place data ───────────────────────────────────────────────────
function buildBirthPlace(records) {
  // Overall NCR vs Province
  let ncr = 0, province = 0, unknown = 0
  // Breakdown by actual place (province-level)
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
  // Check from most specific to least
  for (const lvl of [...EDU_LEVELS].reverse()) {
    if (lvl.match.some(m => v.includes(m))) return lvl.key
  }
  return 'Not Specified'
}

function buildEducation(records) {
  const totals = {}
  EDU_LEVELS.forEach(l => { totals[l.key] = 0 })
  totals['Not Specified'] = 0

  // Per district breakdown
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
    .map(([level, count]) => ({
      level, count,
      pct: total ? +((count / total) * 100).toFixed(1) : 0,
    }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count)

  const byDistrict = DISTRICTS.map(d => {
    const row = { name: d.replace('District ', 'D'), label: d }
    EDU_LEVELS.forEach(l => { row[l.key] = distMap[d][l.key] })
    return row
  })

  return { overview, byDistrict }
}

// ─── Export to Excel ──────────────────────────────────────────────────────────
function exportToExcel(benefits, birthPlace, education) {
  const wb = XLSX.utils.book_new()
  const autoW = data => data[0]?.map((_, ci) => ({ wch: Math.max(...data.map(r => String(r[ci] ?? '').length), 10) }))

  // Sheet 1 – Benefits by District
  const b1 = [
    ['District', 'Total', 'SSS #', 'SSS %', 'Pag-IBIG #', 'Pag-IBIG %', 'PhilHealth #', 'PhilHealth %', 'QCID #', 'QCID %'],
    ...benefits.byDistrict.map(r => [r.label, r.total, r.rawSss, `${r['SSS']}%`, r.rawPagibig, `${r['Pag-IBIG']}%`, r.rawPhilhealth, `${r['PhilHealth']}%`, r.rawQcid, `${r['QCID']}%`]),
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(b1); ws1['!cols'] = autoW(b1)
  XLSX.utils.book_append_sheet(wb, ws1, 'Benefits by District')

  // Sheet 2 – Benefits by Year
  const b2 = [
    ['Year', 'Total', 'SSS #', 'SSS %', 'Pag-IBIG #', 'Pag-IBIG %', 'PhilHealth #', 'PhilHealth %', 'QCID #', 'QCID %'],
    ...benefits.byYear.map(r => [r.name, r.total, r.rawSss, `${r['SSS']}%`, r.rawPagibig, `${r['Pag-IBIG']}%`, r.rawPhilhealth, `${r['PhilHealth']}%`, r.rawQcid, `${r['QCID']}%`]),
  ]
  const ws2 = XLSX.utils.aoa_to_sheet(b2); ws2['!cols'] = autoW(b2)
  XLSX.utils.book_append_sheet(wb, ws2, 'Benefits by Year')

  // Sheet 3 – Birth Place
  const b3 = [
    ['Category', 'Count', 'Percentage'],
    ...birthPlace.overview.map(r => [r.name, r.value, `${r.pct}%`]),
    [],
    ['Top Birth Places', 'Count', 'Percentage'],
    ...birthPlace.topPlaces.map(r => [r.place, r.count, `${r.pct}%`]),
  ]
  const ws3 = XLSX.utils.aoa_to_sheet(b3); ws3['!cols'] = autoW(b3.filter(r => r.length > 0))
  XLSX.utils.book_append_sheet(wb, ws3, 'Birth Place')

  // Sheet 4 – Educational Attainment
  const b4 = [
    ['Education Level', 'Count', 'Percentage'],
    ...education.overview.map(r => [r.level, r.count, `${r.pct}%`]),
  ]
  const ws4 = XLSX.utils.aoa_to_sheet(b4); ws4['!cols'] = autoW(b4)
  XLSX.utils.book_append_sheet(wb, ws4, 'Educational Attainment')

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
  const [tab,       setTab]       = useState('benefits')
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [benefits,  setBenefits]  = useState(null)
  const [birthPlace, setBirthPlace] = useState(null)
  const [education, setEducation] = useState(null)
  const [rawCount,  setRawCount]  = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const token   = localStorage.getItem('token')
        const records = await fetchAll(token)
        setRawCount(records.length)
        setBenefits(buildBenefits(records))
        setBirthPlace(buildBirthPlace(records))
        setEducation(buildEducation(records))
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
          <h2 style={{ margin: '0 0 4px', fontSize: 20, color: '#2d2a6e', fontWeight: 700 }}>
            Analytics Report
          </h2>
          <p style={{ margin: 0, color: '#888', fontSize: 12 }}>
            {rawCount.toLocaleString()} total records · Generated: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => exportToExcel(benefits, birthPlace, education)}
          style={{ ...S.btn, background: '#10b981' }}
          className="hide-on-print"
        >
          📊 Export to Excel
        </button>
      </div>

      {/* Tabs */}
      <div style={S.card}>
        <div style={S.tabBar}>
          {[
            { key: 'benefits',  label: '🏥 Benefit Coverage %' },
            { key: 'birthplace',label: '📍 Birth Place' },
            { key: 'education', label: '🎓 Educational Attainment' },
          ].map(t => (
            <button key={t.key} style={S.tab(tab === t.key)} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Benefits Tab ── */}
        {tab === 'benefits' && benefits && (
          <div style={{ padding: 20 }}>

            {/* Summary metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total Records', val: rawCount.toLocaleString(), sub: '2024 + 2025' },
                ...Object.entries(BENEFIT_COLORS).map(([b, color]) => {
                  const totalAll   = benefits.byDistrict.reduce((s, r) => s + r.total, 0)
                  const rawKey     = { 'SSS': 'rawSss', 'Pag-IBIG': 'rawPagibig', 'PhilHealth': 'rawPhilhealth', 'QCID': 'rawQcid' }[b]
                  const totalHave  = benefits.byDistrict.reduce((s, r) => s + r[rawKey], 0)
                  const overallPct = totalAll ? +((totalHave / totalAll) * 100).toFixed(1) : 0
                  return { label: b, val: `${overallPct}%`, sub: `${totalHave.toLocaleString()} of ${totalAll.toLocaleString()}`, color }
                })
              ].map(m => (
                <div key={m.label} style={S.metric}>
                  <div style={S.mLabel}>{m.label}</div>
                  <div style={{ ...S.mVal, color: m.color || '#534AB7' }}>{m.val}</div>
                  <div style={S.mSub}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* By District chart */}
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

            {/* District table */}
            <div style={{ overflowX: 'auto', marginTop: 20 }}>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    <th style={S.thL}>District</th>
                    <th style={S.th}>Total</th>
                    {Object.keys(BENEFIT_COLORS).map(b => (
                      <>
                        <th key={`${b}n`} style={S.th}>{b} #</th>
                        <th key={`${b}p`} style={{ ...S.th, color: BENEFIT_COLORS[b] }}>{b} %</th>
                      </>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {benefits.byDistrict.map((r, i) => (
                    <tr key={r.label} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fe' }}>
                      <td style={S.tdL}>{r.label}</td>
                      <td style={S.td}>{r.total.toLocaleString()}</td>
                      {[['rawSss','SSS'],['rawPagibig','Pag-IBIG'],['rawPhilhealth','PhilHealth'],['rawQcid','QCID']].map(([rk, bk]) => (
                        <>
                          <td key={`${rk}n`} style={S.td}>{r[rk].toLocaleString()}</td>
                          <td key={`${rk}p`} style={{ ...S.td, fontWeight: 600, color: BENEFIT_COLORS[bk] }}>{r[bk]}%</td>
                        </>
                      ))}
                    </tr>
                  ))}
                  {/* Totals row */}
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
                            <>
                              <td key={`${rk}tn`} style={{ ...S.td, ...S.tot }}>{tot[rk].toLocaleString()}</td>
                              <td key={`${rk}tp`} style={{ ...S.td, ...S.tot }}>{p}%</td>
                            </>
                          )
                        })}
                      </tr>
                    )
                  })()}
                </tbody>
              </table>
            </div>

            {/* By Year */}
            <p style={{ ...S.sectionHead, marginTop: 28 }}>Benefit Coverage % by Year</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
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
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total Records',  val: birthPlace.total.toLocaleString(), sub: 'all kasambahay', color: '#534AB7' },
                { label: 'From NCR',       val: birthPlace.ncr.toLocaleString(),   sub: `${birthPlace.overview.find(x => x.name === 'NCR')?.pct ?? 0}% of total`, color: '#2EC4B6' },
                { label: 'From Province',  val: birthPlace.province.toLocaleString(), sub: `${birthPlace.overview.find(x => x.name === 'Province')?.pct ?? 0}% of total`, color: '#F4A261' },
                { label: 'Not Specified',  val: birthPlace.unknown.toLocaleString(),  sub: 'blank birth place', color: '#999' },
              ].map(m => (
                <div key={m.label} style={S.metric}>
                  <div style={S.mLabel}>{m.label}</div>
                  <div style={{ ...S.mVal, color: m.color }}>{m.val}</div>
                  <div style={S.mSub}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Pie + top list side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
              {/* Pie chart */}
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
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
                  {birthPlace.overview.map((x, i) => (
                    <span key={x.name} style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: ['#2EC4B6','#F4A261','#ccc'][i], display: 'inline-block' }} />
                      {x.name}: {x.value.toLocaleString()} ({x.pct}%)
                    </span>
                  ))}
                </div>
              </div>

              {/* Top provinces table */}
              <div>
                <p style={S.sectionHead}>Top 20 Birth Places (by count)</p>
                <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #e4e2f5', borderRadius: 8, overflow: 'hidden' }}>
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

            {/* Bar chart of top places */}
            {birthPlace.topPlaces.length > 0 && (
              <>
                <p style={{ ...S.sectionHead, marginTop: 8 }}>Top 10 Birth Places (chart)</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={birthPlace.topPlaces.slice(0, 10).map(r => ({ name: r.place.length > 16 ? r.place.slice(0, 14) + '…' : r.place, fullName: r.place, count: r.count, pct: r.pct }))} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
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
            {/* Summary cards */}
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
              {/* Pie */}
              <div>
                <p style={S.sectionHead}>Overall Distribution</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={education.overview} dataKey="count" nameKey="level" cx="50%" cy="50%" outerRadius={85} label={({ level, pct }) => `${pct}%`} labelLine={false}>
                      {education.overview.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                  {education.overview.map((x, i) => (
                    <span key={x.level} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'inline-block' }} />
                      {x.level}
                    </span>
                  ))}
                </div>
              </div>

              {/* Table */}
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

            {/* By District stacked bar */}
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

            {/* District breakdown table */}
            <p style={{ ...S.sectionHead, marginTop: 24 }}>Breakdown per District</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    <th style={S.thL}>District</th>
                    {EDU_LEVELS.map((l, i) => (
                      <th key={l.key} style={{ ...S.th, color: COLORS[i % COLORS.length] }}>{l.key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {education.byDistrict.map((r, i) => (
                    <tr key={r.label} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fe' }}>
                      <td style={S.tdL}>{r.label}</td>
                      {EDU_LEVELS.map(l => <td key={l.key} style={S.td}>{(r[l.key] || 0).toLocaleString()}</td>)}
                    </tr>
                  ))}
                  {/* Totals */}
                  {(() => {
                    const totRow = EDU_LEVELS.map(l => education.byDistrict.reduce((s, r) => s + (r[l.key] || 0), 0))
                    return (
                      <tr style={S.tot}>
                        <td style={{ ...S.tdL, ...S.tot }}>TOTAL</td>
                        {totRow.map((v, i) => <td key={i} style={{ ...S.td, ...S.tot }}>{v.toLocaleString()}</td>)}
                      </tr>
                    )
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@media print { .hide-on-print { display: none !important; } @page { size: landscape; margin: 10mm; } }` }} />
    </div>
  )
}
