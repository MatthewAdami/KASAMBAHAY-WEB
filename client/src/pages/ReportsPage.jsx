import { useColors } from '../ThemeContext.jsx'
import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LabelList, 
} from 'recharts'
import * as XLSX from 'xlsx'

import { API_ENDPOINTS } from '../utils/api'
const API_URL = API_ENDPOINTS.KASAMBAHAY
const DISTRICTS = ['District 1','District 2','District 3','District 4','District 5','District 6']
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
  { key: 'College Graduate' },
  { key: 'Highschool Graduate' },
  { key: 'Elementary Graduate' },
  { key: 'Vocational / TESDA' },
]

function classifyEdu(raw) {
  if (!raw) return 'Not Specified'
  const v = raw.trim().toLowerCase()
  if (v.includes('voc') || v.includes('tesda')) return 'Vocational / TESDA'
  if (v.includes('college') || v.includes('bachelor') || v.includes('bs ') || v.includes('ab ') || v.includes('university') || v.includes('master') || v.includes('phd') || v.includes('post-grad')) {
    return 'College Graduate'
  }
  if (v.includes('high school') || v.includes('highschool') || v.includes('hs ') || v.includes('secondary') || v.match(/^hs$/)) {
    return 'Highschool Graduate'
  }
  if (v.includes('elem') || v.includes('grade')) {
    return 'Elementary Graduate'
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
  const order = [...EDU_LEVELS.map(l => l.key), 'Not Specified']
  const overview = Object.entries(totals)
    .map(([level, count]) => ({ level, count, pct: total ? +((count / total) * 100).toFixed(1) : 0 }))
    .filter(x => x.count > 0)
    .sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level))

  const byDistrict = DISTRICTS.map(d => {
    const row = { name: d.replace('District ', 'D'), label: d }
    EDU_LEVELS.forEach(l => { row[l.key] = distMap[d][l.key] })
    row['Not Specified'] = distMap[d]['Not Specified']
    return row
  })

  const chartLevels = [...EDU_LEVELS.map(l => l.key), 'Not Specified']

  return { overview, byDistrict, chartLevels }
}

// ─── Build demographics data ──────────────────────────────────────────────────
function buildGenderStats(records) {
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

function buildAge(records) {
  const brackets = {
    '15 and below': 0, '16-30': 0, '31-45': 0, 
    '46 and above': 0, 'Unknown': 0
  }
  let total = 0
  for (const r of records) {
    total++
    const ageStr = String(r.age).trim()
    const age = parseInt(ageStr)
      if (isNaN(age) || ageStr.toLowerCase() === 'n/a' || ageStr === '' || age <= 0) { brackets['Unknown']++; continue }
    if (age <= 15) brackets['15 and below']++
    else if (age <= 30) brackets['16-30']++
    else if (age <= 45) brackets['31-45']++
    else brackets['46 and above']++
  }
  const order = ['15 and below', '16-30', '31-45', '46 and above', 'Unknown']
  const list = Object.entries(brackets)
    .map(([range, count]) => ({ range, count, pct: total ? +((count/total)*100).toFixed(1) : 0 }))
    .sort((a, b) => order.indexOf(a.range) - order.indexOf(b.range))
  return { list, total }
}

function buildReligion(records) {
  const counts = {}
  let total = 0
  for (const r of records) {
    total++
    let rel = r.religion ? r.religion.trim() : 'Unknown'
    if (!rel || rel.toLowerCase() === 'n/a') rel = 'Unknown'
    const lower = rel.toLowerCase()
    if (lower.includes('catholic')) rel = 'Roman Catholic'
    else if (lower.includes('iglesia') || lower.includes('inc')) rel = 'Iglesia ni Cristo'
    else if (lower.includes('islam') || lower.includes('muslim')) rel = 'Islam'
    else if (lower.includes('born') && lower.includes('again')) rel = 'Born Again Christian'
    else if (lower.includes('christian')) rel = 'Christian'
    counts[rel] = (counts[rel] || 0) + 1
  }
  const list = Object.entries(counts)
    .map(([religion, count]) => ({ religion, count, pct: total ? +((count/total)*100).toFixed(1) : 0 }))
    .sort((a, b) => b.count - a.count)
  return { list, total }
}

function buildLengthOfService(records) {
  const brackets = {
    'Below 1 year': 0, '1-3 years': 0, '3-5 years': 0,
    '5-10 years': 0, '10-20 years': 0, '20+ years': 0, 'Unknown': 0
  }
  let total = 0
  for (const r of records) {
    total++
    const los = r.lengthOfService || r.yearsOfService
    if (!los || String(los).trim().toLowerCase() === 'n/a') { brackets['Unknown']++; continue }
    let str = String(los).toLowerCase()

    if (str.includes('less than') || str.includes('below') || str.includes('few mo')) { brackets['Below 1 year']++; continue }

    // Convert common text numbers to digits in case they typed "two years"
    const numWords = { 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10', 'eleven': '11', 'twelve': '12', 'a year': '1', 'a month': '1', 'half': '0.5' };
    for (const w in numWords) { str = str.replace(new RegExp(`\\b${w}\\b`, 'g'), numWords[w]); }

    const match = str.match(/(\d+(\.\d+)?)/)
    if (!match) { brackets['Unknown']++; continue }
    let val = parseFloat(match[0])
    if (str.includes('month') || str.includes('mo')) { val = val / 12 }
    if (val < 1) brackets['Below 1 year']++
    else if (val <= 3) brackets['1-3 years']++
    else if (val <= 5) brackets['3-5 years']++
    else if (val <= 10) brackets['5-10 years']++
    else if (val <= 20) brackets['10-20 years']++
    else brackets['20+ years']++
  }
  const order = ['Below 1 year', '1-3 years', '3-5 years', '5-10 years', '10-20 years', '20+ years', 'Unknown']
  const list = Object.entries(brackets)
    .map(([range, count]) => ({ range, count, pct: total ? +((count/total)*100).toFixed(1) : 0 }))
    .filter(x => x.count > 0)
    .sort((a, b) => order.indexOf(a.range) - order.indexOf(b.range))
  return { list, total }
}

// ─── Build barangay distribution ──────────────────────────────────────────────
function buildBarangayStats(records) {
  const counts = {}
  let total = 0
  for (const r of records) {
    let raw = r.barangay || '';
    let b = raw.toUpperCase().replace(/^(BRGY\.|BRGY|BARANGAY)\s*/, '').replace(/[-.]/g, ' ').replace(/\s+/g, ' ').trim();
    if (b !== '' && b !== 'N/A') {
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
function exportToExcel(benefits, birthPlace, education, genderStats, barangayStats, ageStats, religionStats, losStats) {
  const wb = XLSX.utils.book_new()
  const autoW = data => data[0]?.map((_, ci) => ({ wch: Math.max(...data.map(r => String(r[ci] ?? '').length), 10) }))

  const buildSheet = (title, header, rows) => {
    const data = [header, ...rows]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = autoW(data)
    XLSX.utils.book_append_sheet(wb, ws, title)
  }

  buildSheet('Benefits by District', 
    ['District', 'Total', 'SSS #', 'SSS %', 'Pag-IBIG #', 'Pag-IBIG %', 'PhilHealth #', 'PhilHealth %', 'QCID #', 'QCID %'],
    benefits.byDistrict.map(r => [r.label, r.total, r.rawSss, `${r['SSS']}%`, r.rawPagibig, `${r['Pag-IBIG']}%`, r.rawPhilhealth, `${r['PhilHealth']}%`, r.rawQcid, `${r['QCID']}%`])
  )
  buildSheet('Benefits by Year', 
    ['Year', 'Total', 'SSS #', 'SSS %', 'Pag-IBIG #', 'Pag-IBIG %', 'PhilHealth #', 'PhilHealth %', 'QCID #', 'QCID %'],
    benefits.byYear.map(r => [r.name, r.total, r.rawSss, `${r['SSS']}%`, r.rawPagibig, `${r['Pag-IBIG']}%`, r.rawPhilhealth, `${r['PhilHealth']}%`, r.rawQcid, `${r['QCID']}%`])
  )
  buildSheet('Birth Place',
    ['Category', 'Count', 'Percentage'],
    [
      ...birthPlace.overview.map(r => [r.name, r.value, `${r.pct}%`]),
      [],
      ['Top Birth Places', '', ''],
      ...birthPlace.topPlaces.map(r => [r.place, r.count, `${r.pct}%`])
    ]
  )
  buildSheet('Education',
    ['Education Level', 'Count', 'Percentage'],
    education.overview.map(r => [r.level, r.count, `${r.pct}%`])
  )
  buildSheet('Gender',
    ['Gender', 'Count', 'Percentage'],
    genderStats.pieData.map(r => [r.name, r.value, `${r.pct}%`])
  )
  buildSheet('Age',
    ['Age Bracket', 'Count', 'Percentage'],
    ageStats.list.map(r => [r.range, r.count, `${r.pct}%`])
  )
  buildSheet('Length of Service',
    ['Length of Service', 'Count', 'Percentage'],
    losStats.list.map(r => [r.range, r.count, `${r.pct}%`])
  )
  buildSheet('Top Barangays',
    ['Barangay', 'Count', 'Percentage'],
    barangayStats.list.map(r => [r.barangay, r.count, `${r.pct}%`])
  )

  XLSX.writeFile(wb, 'Kasambahay_Analytics_Report.xlsx')
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page:   { padding: '20px 16px', fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 13, color: 'inherit', background: 'transparent', minHeight: '100vh' },
  card:   { background: '#fff', borderRadius: 10, border: '1px solid #e4e2f5', marginBottom: 20, overflow: 'hidden' },
  tabBar: { display: 'flex', borderBottom: '2px solid #e4e2f5', background: '#fff', padding: '0 16px', overflowX: 'auto' },
  tab:    (a) => ({ padding: '10px 18px', fontWeight: a ? 700 : 500, fontSize: 13, color: a ? '#534AB7' : '#888', background: 'none', border: 'none', borderBottom: `2px solid ${a ? '#534AB7' : 'transparent'}`, marginBottom: -2, cursor: 'pointer', whiteSpace: 'nowrap' }),
  subTabBar: { display: 'flex', background: '#faf9fe', padding: '12px 16px', borderBottom: '1px solid #e4e2f5', flexWrap: 'wrap', gap: 8 },
  subTab: (a) => ({ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: a ? 700 : 500, color: a ? '#fff' : '#534AB7', background: a ? '#534AB7' : '#eef', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }),
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
  const [tab,          setTab]          = useState('demographics')
  const [subTab,       setSubTab]       = useState('gender')
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [benefits,     setBenefits]     = useState(null)
  const [birthPlace,   setBirthPlace]   = useState(null)
  const [education,    setEducation]    = useState(null)
  const [genderStats,  setGenderStats]  = useState(null)
  const [barangayStats,setBarangayStats]= useState(null)
  const [ageStats,     setAgeStats]     = useState(null)
  const [religionStats,setReligionStats]= useState(null)
  const [losStats,     setLosStats]     = useState(null)
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
        setGenderStats(buildGenderStats(records))
        setBarangayStats(buildBarangayStats(records))
        setAgeStats(buildAge(records))
        setLosStats(buildLengthOfService(records))
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
        <button onClick={() => exportToExcel(benefits, birthPlace, education, genderStats, barangayStats, ageStats, losStats)} style={{ ...S.btn, background: '#10b981' }} className="hide-on-print">
          📊 Export to Excel
        </button>
      </div>

      {/* Tabs */}
      <div style={S.card}>
        <div style={S.tabBar}>
          {[
            { key: 'demographics', label: ' Demographic Profile' },
          ].map(t => (
            <button key={t.key} style={S.tab(tab === t.key)} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {tab === 'demographics' && (
          <>
            <div style={S.subTabBar}>
              {[
                { key: 'gender',          label: 'Gender' },
                { key: 'age',             label: 'Age' },
                { key: 'education',       label: 'Educational Attainment' },
                { key: 'birthplace',      label: 'Birth Place' },
                { key: 'lengthOfService', label: 'Length of Service' },
                { key: 'barangay',        label: 'Top Barangays' },
                { key: 'benefits',        label: 'Benefit Coverage' },
              ].map(t => (
                <button key={t.key} style={S.subTab(subTab === t.key)} onClick={() => setSubTab(t.key)}>{t.label}</button>
              ))}
            </div>

        {/* ── Benefit Coverage Sub Tab ── */}
        {subTab === 'benefits' && benefits && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
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
              <BarChart data={benefits.byDistrict} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => `${v}%`} domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => `${val}%`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {Object.entries(BENEFIT_COLORS).map(([b, color]) => (
                  <Bar key={b} dataKey={b} fill={color} radius={[3, 3, 0, 0]}>
                    <LabelList dataKey={b} position="top" formatter={(v) => `${v}%`} style={{ fontSize: 10, fill: '#555', fontWeight: 600 }} />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>

            <div style={{ overflowX: 'auto', marginTop: 20 }}>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    <th style={S.thL}>District</th>
                    <th style={S.th}>Total</th>
                    {Object.keys(BENEFIT_COLORS).flatMap(b => [
                      <th key={`${b}n`} style={S.th}>{b} #</th>,
                      <th key={`${b}p`} style={{ ...S.th, color: BENEFIT_COLORS[b] }}>{b} %</th>
                    ])}
                  </tr>
                </thead>
                <tbody>
                  {benefits.byDistrict.map((r, i) => (
                    <tr key={r.label} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fe' }}>
                      <td style={S.tdL}>{r.label}</td>
                      <td style={S.td}>{r.total.toLocaleString()}</td>
                      {[['rawSss','SSS'],['rawPagibig','Pag-IBIG'],['rawPhilhealth','PhilHealth'],['rawQcid','QCID']].flatMap(([rk, bk]) => [
                        <td key={`${rk}n`} style={S.td}>{r[rk].toLocaleString()}</td>,
                        <td key={`${rk}p`} style={{ ...S.td, fontWeight: 600, color: BENEFIT_COLORS[bk] }}>{r[bk]}%</td>
                      ])}
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
                        {[['rawSss','SSS'],['rawPagibig','Pag-IBIG'],['rawPhilhealth','PhilHealth'],['rawQcid','QCID']].flatMap(([rk, bk]) => {
                          const p = tot.total ? +((tot[rk] / tot.total) * 100).toFixed(1) : 0
                          return [
                            <td key={`${rk}tn`} style={{ ...S.td, ...S.tot }}>{tot[rk].toLocaleString()}</td>,
                            <td key={`${rk}tp`} style={{ ...S.td, ...S.tot }}>{p}%</td>
                          ]
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

        {/* ── Birth Place Sub Tab ── */}
        {subTab === 'birthplace' && birthPlace && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
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
                    <Pie data={birthPlace.overview} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ payload }) => `${payload.name}: ${payload.value.toLocaleString()} (${payload.pct}%)`} labelLine={true}>
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
                        <th style={{ ...S.th,  position: 'sticky', top: 0 }}>Active Kasambahay</th>
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
                  <BarChart data={birthPlace.topPlaces.slice(0, 10).map(r => ({ name: r.place.length > 16 ? r.place.slice(0, 14) + '…' : r.place, fullName: r.place, count: r.count }))} margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, n, p) => [v, p.payload.fullName]} />
                    <Bar dataKey="count" fill="#534AB7" radius={[3, 3, 0, 0]}>
                      <LabelList dataKey="count" position="top" formatter={(v) => v.toLocaleString()} style={{ fontSize: 10, fill: '#333', fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        )}

        {/* ── Education Sub Tab ── */}
        {subTab === 'education' && education && (
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
          <div style={{ marginBottom: 24 }}>
            <p style={S.sectionHead}>Numbers & Percentage</p>
                <table style={S.tbl}>
                  <thead>
                    <tr>
                      <th style={S.thL}>Education Level</th>
                    <th style={S.th}>Numbers</th>
                    <th style={S.th}>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {education.overview.map((r, i) => (
                      <tr key={r.level} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fe' }}>
                        <td style={S.tdL}>{r.level}</td>
                        <td style={S.td}>{r.count.toLocaleString()}</td>
                        <td style={{ ...S.td, fontWeight: 600, color: COLORS[i % COLORS.length] }}>{r.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
            <p style={{ ...S.sectionHead, marginTop: 8 }}>Educational Attainment by District</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={education.byDistrict} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {education.chartLevels.map((levelKey, i) => (
                  <Bar key={levelKey} dataKey={levelKey} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === education.chartLevels.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}>
                    {/* For stacked bar, position center lets it stay visible when numbers fit inside */}
                    <LabelList dataKey={levelKey} position="center" formatter={(v) => v > 0 ? v : ''} style={{ fontSize: 9, fill: '#fff', fontWeight: 600 }} />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Gender Sub Tab ── */}
        {subTab === 'gender' && genderStats && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
              <div style={S.metric}><div style={S.mLabel}>Female</div><div style={{ ...S.mVal, color: '#d4537e' }}>{genderStats.female.toLocaleString()}</div><div style={S.mSub}>{genderStats.pieData.find(x => x.name === 'Female')?.pct || 0}%</div></div>
              <div style={S.metric}><div style={S.mLabel}>Male</div><div style={{ ...S.mVal, color: '#3b82f6' }}>{genderStats.male.toLocaleString()}</div><div style={S.mSub}>{genderStats.pieData.find(x => x.name === 'Male')?.pct || 0}%</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
              <div>
                <p style={S.sectionHead}>Gender Distribution</p>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={genderStats.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ payload }) => `${payload.name}: ${payload.value.toLocaleString()} (${payload.pct}%)`} labelLine={true}>
                      {genderStats.pieData.map((entry, i) => <Cell key={i} fill={entry.name === 'Female' ? '#d4537e' : '#3b82f6'} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── Age Sub Tab ── */}
        {subTab === 'age' && ageStats && (
          <div style={{ padding: 20 }}>
            <p style={S.sectionHead}>Age Distribution</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
              <div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ageStats.list} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#457B9D" radius={[3, 3, 0, 0]}>
                      <LabelList dataKey="count" position="top" formatter={(v) => v.toLocaleString()} style={{ fontSize: 10, fill: '#333', fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <table style={S.tbl}>
                  <thead>
                    <tr>
                      <th style={S.thL}>Age Bracket</th>
                      <th style={S.th}>Count</th>
                      <th style={S.th}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ageStats.list.map((r, i) => (
                      <tr key={r.range} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fe' }}>
                        <td style={S.tdL}>{r.range}</td>
                        <td style={S.td}>{r.count.toLocaleString()}</td>
                        <td style={{ ...S.td, fontWeight: 600 }}>{r.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Length of Service Sub Tab ── */}
        {subTab === 'lengthOfService' && losStats && (
          <div style={{ padding: 20 }}>
            <p style={S.sectionHead}>Length of Service</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
              <div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={losStats.list} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2EC4B6" radius={[3, 3, 0, 0]}>
                      <LabelList dataKey="count" position="top" formatter={(v) => v.toLocaleString()} style={{ fontSize: 10, fill: '#333', fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <table style={S.tbl}>
                  <thead>
                    <tr>
                      <th style={S.thL}>Length of Service</th>
                      <th style={S.th}>Count</th>
                      <th style={S.th}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {losStats.list.map((r, i) => (
                      <tr key={r.range} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fe' }}>
                        <td style={S.tdL}>{r.range}</td>
                        <td style={S.td}>{r.count.toLocaleString()}</td>
                        <td style={{ ...S.td, fontWeight: 600 }}>{r.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Barangays Sub Tab ── */}
        {subTab === 'barangay' && barangayStats && (
          <div style={{ padding: 20 }}>
            <p style={S.sectionHead}>Top 20 Barangays with Most Kasambahay</p>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={barangayStats.list.slice(0, 20)} margin={{ top: 20, right: 20, left: 0, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                <XAxis dataKey="barangay" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val) => val.toLocaleString()} />
                <Bar dataKey="count" fill="#2EC4B6" radius={[3, 3, 0, 0]} name="Kasambahay Count">
                  <LabelList dataKey="count" position="top" formatter={(v) => v.toLocaleString()} style={{ fontSize: 9, fill: '#333', fontWeight: 600 }} />
                </Bar>
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
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@media print { .hide-on-print { display: none !important; } }` }} />
    </div>
  )
}