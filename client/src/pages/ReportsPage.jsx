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
const COLORS = ['#534AB7','#9FE1CB','#F4A261','#E76F51','#6A4C93','#2EC4B6','#A8DADC','#457B9D']
const AGE_ORDER = ['15 and below', '16-30', '31-39', '40-50', '51-59', '60-70', '71-89', '90-100', 'Unknown']
const DISTRICT_HEADER_COLORS = ['#f4a9a8','#00bcd4','#e040fb','#4caf50','#f9c74f','#ff9800','#9c27b0','#e91e63','#03a9f4']

// ─── Robust Age Calculator ────────────────────────────────────────────────────
function calculateAge(record) {
  // 1. Trust the explicitly saved age field first
  const possibleAgeFields = ['age', 'currentAge', 'workerAge', 'kasambahayAge']
  for (const field of possibleAgeFields) {
    const val = parseInt(record[field])
    if (!isNaN(val) && val > 0 && val < 120) return val
  }

  // 2. Try computing from DOB fields if age is missing
  const dobRaw = record.dateOfBirth || record.birthday || record.birthDate
  if (dobRaw) {
    // Handle common PH date formats: MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY
    let d = new Date(dobRaw)
    // If direct parse fails, try MM/DD/YYYY
    if (isNaN(d.getTime()) && typeof dobRaw === 'string') {
      const parts = dobRaw.split(/[\/\-]/)
      if (parts.length === 3) {
        // Try YYYY-MM-DD
        if (parts[0].length === 4) d = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`)
        // Try MM/DD/YYYY
        else d = new Date(`${parts[2]}-${parts[0]}-${parts[1]}`)
      }
    }
    if (!isNaN(d.getTime())) {
      const today = new Date()
      let age = today.getFullYear() - d.getFullYear()
      const m = today.getMonth() - d.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
      if (age > 0 && age < 120) return age
    }
  }

  return null
}

// ─── Fetch all paginated records ──────────────────────────────────────────────
async function fetchAll(token) {
  let page = 1, all = []
  while (true) {
    const res = await fetch(`${API_URL}?limit=500&page=${page}&isDeleted=false`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    const json = await res.json()
    const rows = (json.data || json || []).map(r => ({ ...r, _computedAge: calculateAge(r) }))
    all = all.concat(rows)
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

// ─── Build benefit % data ─────────────────────────────────────────────────────
function buildBenefits(records, groupBy = 'district') {
  const distMap = {}
  const yearMap = {}
  YEARS.forEach(y => { yearMap[y] = { total: 0, sss: 0, pagibig: 0, philhealth: 0, qcid: 0 } })

  for (const r of records) {
    const yVal = r.year ? Number(r.year) : null
    if (yVal && !yearMap[yVal]) yearMap[yVal] = { total: 0, sss: 0, pagibig: 0, philhealth: 0, qcid: 0 }

    let key
    if (groupBy === 'district') {
      key = r.district || 'Unknown District'
    } else {
      const raw = r.barangay || ''
      key = raw.toUpperCase().replace(/^(BRGY\.|BRGY|BARANGAY)\s*/, '').replace(/[-.]/g, ' ').replace(/\s+/g, ' ').trim() || 'Unknown Barangay'
    }

    if (!distMap[key]) distMap[key] = { total: 0, sss: 0, pagibig: 0, philhealth: 0, qcid: 0 }

    const d = distMap[key]
    const y = yearMap[yVal]
    const hasSss        = r.sss        && r.sss        !== 'No'
    const hasPagibig    = r.pagIbig    && r.pagIbig    !== 'No'
    const hasPhilhealth = r.philhealth && r.philhealth !== 'No'
    const hasQcid       = r.qcid       && r.qcid       !== 'No'

    d.total++
    if (hasSss)        d.sss++
    if (hasPagibig)    d.pagibig++
    if (hasPhilhealth) d.philhealth++
    if (hasQcid)       d.qcid++

    if (y) {
      y.total++
      if (hasSss)        y.sss++
      if (hasPagibig)    y.pagibig++
      if (hasPhilhealth) y.philhealth++
      if (hasQcid)       y.qcid++
    }
  }

  const pct = (n, t) => t ? +((n / t) * 100).toFixed(1) : 0

  const byGroup = Object.keys(distMap).sort((a, b) => a.localeCompare(b)).map(d => {
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

  return { byGroup, byYear }
}

// ─── Build birth place data ───────────────────────────────────────────────────
function buildBirthPlace(records, groupBy = 'district') {
  let ncr = 0, province = 0, unknown = 0
  const placeCount = {}
  const distMap = {}

  for (const r of records) {
    let key
    if (groupBy === 'district') {
      key = r.district || 'Unknown District'
    } else {
      const raw = r.barangay || ''
      key = raw.toUpperCase().replace(/^(BRGY\.|BRGY|BARANGAY)\s*/, '').replace(/[-.]/g, ' ').replace(/\s+/g, ' ').trim() || 'Unknown Barangay'
    }
    if (!distMap[key]) distMap[key] = { NCR: 0, Province: 0, Unknown: 0 }

    const cls = classifyBirthPlace(r.birthPlace)
    distMap[key][cls]++
    if (cls === 'NCR') ncr++
    else if (cls === 'Province') province++
    else unknown++

    if (r.birthPlace?.trim()) {
      const k = r.birthPlace.trim()
      placeCount[k] = (placeCount[k] || 0) + 1
    }
  }

  const total = records.length
  const overview = [
    { name: 'NCR',      value: ncr,      pct: total ? +((ncr / total) * 100).toFixed(1) : 0 },
    { name: 'Province', value: province, pct: total ? +((province / total) * 100).toFixed(1) : 0 },
    { name: 'Unknown',  value: unknown,  pct: total ? +((unknown / total) * 100).toFixed(1) : 0 },
  ].filter(x => x.value > 0)

  const topPlaces = Object.entries(placeCount)
    .map(([place, count]) => ({ place, count, pct: total ? +((count / total) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  const byGroup = Object.keys(distMap).sort((a, b) => a.localeCompare(b)).map(d => {
    const v = distMap[d]
    return {
      name: d.replace('District ', 'D'),
      label: d,
      NCR: v.NCR, Province: v.Province, Unknown: v.Unknown,
      total: v.NCR + v.Province + v.Unknown,
    }
  })

  return { overview, topPlaces, ncr, province, unknown, total, byGroup }
}

// ─── Build educational attainment data ───────────────────────────────────────
const EDU_LEVELS = [
  { key: 'College Level' },
  { key: 'Highschool Level' },
  { key: 'Elementary Level' },
  { key: 'Vocational / TESDA' },
]

function classifyEdu(raw) {
  if (!raw) return 'Not Specified'
  const v = raw.trim().toLowerCase()
  if (v.includes('voc') || v.includes('tesda')) return 'Vocational / TESDA'
  if (v.includes('college') || v.includes('bachelor') || v.includes('bs ') || v.includes('ab ') || v.includes('university') || v.includes('master') || v.includes('phd') || v.includes('post-grad')) return 'College Level'
  if (v.includes('high school') || v.includes('highschool') || v.includes('hs ') || v.includes('secondary') || v.match(/^hs$/)) return 'Highschool Level'
  if (v.includes('elem') || v.includes('grade')) return 'Elementary Level'
  return 'Not Specified'
}

function buildEducation(records, groupBy = 'district') {
  const totals = {}
  EDU_LEVELS.forEach(l => { totals[l.key] = 0 })
  totals['Not Specified'] = 0
  const distMap = {}

  for (const r of records) {
    let key
    if (groupBy === 'district') {
      key = r.district || 'Unknown District'
    } else {
      const raw = r.barangay || ''
      key = raw.toUpperCase().replace(/^(BRGY\.|BRGY|BARANGAY)\s*/, '').replace(/[-.]/g, ' ').replace(/\s+/g, ' ').trim() || 'Unknown Barangay'
    }
    if (!distMap[key]) {
      distMap[key] = {}
      EDU_LEVELS.forEach(l => { distMap[key][l.key] = 0 })
      distMap[key]['Not Specified'] = 0
    }
    const cls = classifyEdu(r.educationalAttainment)
    totals[cls] = (totals[cls] || 0) + 1
    distMap[key][cls] = (distMap[key][cls] || 0) + 1
  }

  const total = records.length
  const order = [...EDU_LEVELS.map(l => l.key), 'Not Specified']
  const overview = Object.entries(totals)
    .map(([level, count]) => ({ level, count, pct: total ? +((count / total) * 100).toFixed(1) : 0 }))
    .filter(x => x.count > 0)
    .sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level))

  const byGroup = Object.keys(distMap).sort((a, b) => a.localeCompare(b)).map(d => {
    const row = { name: d.replace('District ', 'D'), label: d }
    let t = 0
    EDU_LEVELS.forEach(l => { row[l.key] = distMap[d][l.key]; t += distMap[d][l.key] })
    row['Not Specified'] = distMap[d]['Not Specified']
    t += distMap[d]['Not Specified']
    row.total = t
    return row
  })

  return { overview, byGroup, chartLevels: [...EDU_LEVELS.map(l => l.key), 'Not Specified'] }
}

// ─── Build gender stats ───────────────────────────────────────────────────────
function buildGenderStats(records, groupBy = 'district') {
  let male = 0, female = 0
  const total = records.length
  const distMap = {}

  for (const r of records) {
    if (r.isFemale) female++
    else if (r.isMale) male++

    let key
    if (groupBy === 'district') {
      key = r.district || 'Unknown District'
    } else {
      const raw = r.barangay || ''
      key = raw.toUpperCase().replace(/^(BRGY\.|BRGY|BARANGAY)\s*/, '').replace(/[-.]/g, ' ').replace(/\s+/g, ' ').trim() || 'Unknown Barangay'
    }
    if (!distMap[key]) distMap[key] = { Male: 0, Female: 0, total: 0 }
    distMap[key].total++
    if (r.isFemale) distMap[key].Female++
    else if (r.isMale) distMap[key].Male++
  }

  const pieData = [
    { name: 'Female', value: female, pct: total ? +((female / total) * 100).toFixed(1) : 0 },
    { name: 'Male',   value: male,   pct: total ? +((male   / total) * 100).toFixed(1) : 0 },
  ].filter(x => x.value > 0)

  const byGroup = Object.keys(distMap).sort((a, b) => a.localeCompare(b)).map(d => {
    const v = distMap[d]
    return { name: d.replace('District ', 'D'), label: d, Male: v.Male, Female: v.Female, total: v.total }
  })

  return { pieData, male, female, total, byGroup }
}

// ─── Build age stats (robust, Excel-format brackets) ─────────────────────────
function buildAge(records, groupBy = 'district') {
  const brackets = {}
  AGE_ORDER.forEach(b => { brackets[b] = 0 })
  const distMap = {}
  let total = 0

  for (const r of records) {
    total++

    let key
    if (groupBy === 'district') {
      key = r.district || 'Unknown District'
    } else {
      const raw = r.barangay || ''
      key = raw.toUpperCase().replace(/^(BRGY\.|BRGY|BARANGAY)\s*/, '').replace(/[-.]/g, ' ').replace(/\s+/g, ' ').trim() || 'Unknown Barangay'
    }
    if (!distMap[key]) {
      distMap[key] = {}
      AGE_ORDER.forEach(b => { distMap[key][b] = 0 })
    }

    let bucket = 'Unknown'
    const age = parseInt(r._computedAge)

    if (!isNaN(age) && age > 0 && age < 120) {
      if (age <= 15) {
        bucket = '15 and below'
        console.warn(`🚨 UNDERAGE RECORD FOUND: ${r.firstName} ${r.lastName} (Age: ${age}, District: ${r.district})`);
      } else if (age <= 30) bucket = '16-30'
      else if (age <= 39) bucket = '31-39'
      else if (age <= 50) bucket = '40-50'
      else if (age <= 59) bucket = '51-59'
      else if (age <= 70) bucket = '60-70'
      else if (age <= 89) bucket = '71-89'
      else                bucket = '90-100'
    }

    brackets[bucket]++
    distMap[key][bucket]++
  }

  const list = AGE_ORDER.map(range => ({
    range,
    count: brackets[range],
    pct: total ? +((brackets[range] / total) * 100).toFixed(1) : 0,
  }))

  const byGroup = Object.keys(distMap).sort((a, b) => a.localeCompare(b)).map(d => {
    const row = { name: d.replace('District ', 'D'), label: d }
    let rowTotal = 0
    AGE_ORDER.forEach(range => { row[range] = distMap[d][range]; rowTotal += distMap[d][range] })
    row.total = rowTotal
    return row
  })

  return { list, total, byGroup }
}

// ─── Build religion ───────────────────────────────────────────────────────────
function buildReligion(records) {
  const counts = {}
  let total = 0
  for (const r of records) {
    total++
    let rel = r.religion ? r.religion.trim() : 'Unknown'
    if (!rel || rel.toLowerCase() === 'n/a') rel = 'Unknown'
    const lower = rel.toLowerCase()
    if (lower.includes('catholic'))                              rel = 'Roman Catholic'
    else if (lower.includes('iglesia') || lower.includes('inc')) rel = 'Iglesia ni Cristo'
    else if (lower.includes('islam') || lower.includes('muslim')) rel = 'Islam'
    else if (lower.includes('born') && lower.includes('again')) rel = 'Born Again Christian'
    else if (lower.includes('christian'))                        rel = 'Christian'
    counts[rel] = (counts[rel] || 0) + 1
  }
  const list = Object.entries(counts)
    .map(([religion, count]) => ({ religion, count, pct: total ? +((count / total) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.count - a.count)
  return { list, total }
}

// ─── Build length of service ──────────────────────────────────────────────────
const LOS_ORDER = ['Below 1 year', '1-3 years', '3-5 years', '5-10 years', '10-20 years', '20+ years', 'Unknown']

function buildLengthOfService(records, groupBy = 'district') {
  const brackets = {}
  LOS_ORDER.forEach(b => { brackets[b] = 0 })
  const distMap = {}
  let total = 0

  for (const r of records) {
    total++
    const los = r.lengthOfService || r.yearsOfService

    let key
    if (groupBy === 'district') {
      key = r.district || 'Unknown District'
    } else {
      const raw = r.barangay || ''
      key = raw.toUpperCase().replace(/^(BRGY\.|BRGY|BARANGAY)\s*/, '').replace(/[-.]/g, ' ').replace(/\s+/g, ' ').trim() || 'Unknown Barangay'
    }
    if (!distMap[key]) {
      distMap[key] = {}
      LOS_ORDER.forEach(b => { distMap[key][b] = 0 })
    }

    let bucket = 'Unknown'
    if (!los || String(los).trim().toLowerCase() === 'n/a') {
      bucket = 'Unknown'
    } else {
      let str = String(los).toLowerCase()
      if (str.includes('less than') || str.includes('below') || str.includes('few mo')) {
        bucket = 'Below 1 year'
      } else {
        const numWords = { 'one':'1','two':'2','three':'3','four':'4','five':'5','six':'6','seven':'7','eight':'8','nine':'9','ten':'10','eleven':'11','twelve':'12','a year':'1','a month':'1','half':'0.5' }
        for (const w in numWords) { str = str.replace(new RegExp(`\\b${w}\\b`, 'g'), numWords[w]) }
        const match = str.match(/(\d+(\.\d+)?)/)
        if (!match) {
          bucket = 'Unknown'
        } else {
          let val = parseFloat(match[0])
          if (str.includes('month') || str.includes('mo')) val = val / 12
          if      (val < 1)   bucket = 'Below 1 year'
          else if (val <= 3)  bucket = '1-3 years'
          else if (val <= 5)  bucket = '3-5 years'
          else if (val <= 10) bucket = '5-10 years'
          else if (val <= 20) bucket = '10-20 years'
          else                bucket = '20+ years'
        }
      }
    }
    brackets[bucket]++
    distMap[key][bucket]++
  }

  const list = LOS_ORDER
    .map(range => ({ range, count: brackets[range], pct: total ? +((brackets[range] / total) * 100).toFixed(1) : 0 }))
    .filter(x => x.count > 0)

  const byGroup = Object.keys(distMap).sort((a, b) => a.localeCompare(b)).map(d => {
    const row = { name: d.replace('District ', 'D'), label: d }
    let rowTotal = 0
    LOS_ORDER.forEach(range => { row[range] = distMap[d][range]; rowTotal += distMap[d][range] })
    row.total = rowTotal
    return row
  })

  return { list, total, byGroup }
}

// ─── Build barangay stats ─────────────────────────────────────────────────────
function buildBarangayStats(records, groupBy = 'district') {
  const counts = {}
  const groupCounts = {}
  let total = 0

  for (const r of records) {
    const raw = r.barangay || ''
    const b = raw.toUpperCase().replace(/^(BRGY\.|BRGY|BARANGAY)\s*/, '').replace(/[-.]/g, ' ').replace(/\s+/g, ' ').trim()
    if (b && b !== 'N/A') {
      counts[b] = (counts[b] || 0) + 1
      total++
    }
    let key
    if (groupBy === 'district') {
      key = r.district || 'Unknown District'
    } else {
      key = b || 'Unknown Barangay'
    }
    groupCounts[key] = (groupCounts[key] || 0) + 1
  }

  const list = Object.entries(counts)
    .map(([barangay, count]) => ({ barangay, count, pct: total ? +((count / total) * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.count - a.count)

  const totalRecords = records.length
  const allGroups = Object.entries(groupCounts)
    .map(([key, count]) => ({
      name: key.replace('District ', 'D'),
      label: key,
      count,
      pct: totalRecords ? +((count / totalRecords) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  return { list, total, allGroups }
}

// ─── Export to Excel ──────────────────────────────────────────────────────────
function exportToExcel(benefits, birthPlace, education, genderStats, barangayStats, ageStats, losStats, groupBy) {
  const wb = XLSX.utils.book_new()
  const autoW = data => data[0]?.map((_, ci) => ({ wch: Math.max(...data.map(r => String(r[ci] ?? '').length), 10) }))

  const buildSheet = (title, header, rows) => {
    const data = [header, ...rows]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = autoW(data)
    XLSX.utils.book_append_sheet(wb, ws, title.substring(0, 31))
  }

  const gLabel = groupBy === 'district' ? 'District' : 'Barangay'

  buildSheet(`Benefits by ${gLabel}`,
    [gLabel, 'Total', 'SSS #', 'SSS %', 'Pag-IBIG #', 'Pag-IBIG %', 'PhilHealth #', 'PhilHealth %', 'QCID #', 'QCID %'],
    benefits.byGroup.map(r => [r.label, r.total, r.rawSss, `${r['SSS']}%`, r.rawPagibig, `${r['Pag-IBIG']}%`, r.rawPhilhealth, `${r['PhilHealth']}%`, r.rawQcid, `${r['QCID']}%`])
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
      ...birthPlace.topPlaces.map(r => [r.place, r.count, `${r.pct}%`]),
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
  buildSheet(`Gender by ${gLabel}`,
    [gLabel, 'Total', 'Female', 'Male'],
    genderStats.byGroup.map(r => [r.label, r.total, r.Female, r.Male])
  )

  // Age — cross-table matching Excel format
  const ageHeader = ['Age Bracket', ...ageStats.byGroup.map(r => r.label), 'TOTAL']
  const ageRows = AGE_ORDER.map(range => [
    range,
    ...ageStats.byGroup.map(r => r[range] || 0),
    ageStats.byGroup.reduce((s, r) => s + (r[range] || 0), 0),
  ])
  const ageTotalRow = [
    'TOTAL',
    ...ageStats.byGroup.map(r => r.total),
    ageStats.byGroup.reduce((s, r) => s + r.total, 0),
  ]
  buildSheet(`Age Bracket per ${gLabel}`, ageHeader, [...ageRows, ageTotalRow])

  buildSheet('Length of Service',
    ['Length of Service', 'Count', 'Percentage'],
    losStats.list.map(r => [r.range, r.count, `${r.pct}%`])
  )
  buildSheet('Top Barangays',
    ['Barangay', 'Count', 'Percentage'],
    barangayStats.list.map(r => [r.barangay, r.count, `${r.pct}%`])
  )

  XLSX.writeFile(wb, `Kasambahay_Analytics_${groupBy === 'district' ? 'District' : 'Barangay'}.xlsx`)
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page:        { padding: '20px 16px', fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: 13, color: 'inherit', background: 'transparent', minHeight: '100vh' },
  card:        { background: '#fff', borderRadius: 10, border: '1px solid #e4e2f5', marginBottom: 20, overflow: 'hidden' },
  tabBar:      { display: 'flex', borderBottom: '2px solid #e4e2f5', background: '#fff', padding: '0 16px', overflowX: 'auto' },
  tab:         (a) => ({ padding: '10px 18px', fontWeight: a ? 700 : 500, fontSize: 13, color: a ? '#534AB7' : '#888', background: 'none', border: 'none', borderBottom: `2px solid ${a ? '#534AB7' : 'transparent'}`, marginBottom: -2, cursor: 'pointer', whiteSpace: 'nowrap' }),
  subTabBar:   { display: 'flex', background: '#faf9fe', padding: '12px 16px', borderBottom: '1px solid #e4e2f5', flexWrap: 'wrap', gap: 8 },
  subTab:      (a) => ({ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: a ? 700 : 500, color: a ? '#fff' : '#534AB7', background: a ? '#534AB7' : '#eef', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }),
  tbl:         { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th:          { position: 'sticky', top: 0, zIndex: 1, background: '#f0eefb', color: '#534AB7', fontWeight: 600, padding: '8px 12px', textAlign: 'center', borderBottom: '2px solid #d5d0f0', borderRight: '1px solid #e0dcf5', whiteSpace: 'nowrap', fontSize: 11 },
  thL:         { position: 'sticky', top: 0, zIndex: 1, background: '#f0eefb', color: '#534AB7', fontWeight: 600, padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #d5d0f0', borderRight: '1px solid #e0dcf5', whiteSpace: 'nowrap', fontSize: 11 },
  td:          { padding: '7px 12px', textAlign: 'center', borderBottom: '1px solid #eeeaf8', borderRight: '1px solid #f0ecf9', color: '#333' },
  tdL:         { padding: '7px 12px', textAlign: 'left', borderBottom: '1px solid #eeeaf8', borderRight: '1px solid #f0ecf9', color: '#333', fontWeight: 600 },
  tot:         { background: '#edeaf9', fontWeight: 700, color: '#3c3289' },
  metric:      { background: '#f3f1fd', borderRadius: 8, padding: '14px 16px', textAlign: 'center' },
  mLabel:      { fontSize: 11, color: '#7874a7', marginBottom: 4 },
  mVal:        { fontSize: 24, fontWeight: 700, color: '#534AB7' },
  mSub:        { fontSize: 11, color: '#a09ec0', marginTop: 2 },
  btn:         { padding: '9px 20px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  sectionHead: { fontSize: 11, fontWeight: 700, color: '#7874a7', letterSpacing: '.07em', textTransform: 'uppercase', margin: '0 0 12px 0' },
  bar:         { height: 8, borderRadius: 4, background: '#e4e2f5', overflow: 'hidden', marginTop: 4 },
}

const pctBar = (val, color = '#534AB7') => (
  <div style={S.bar}>
    <div style={{ height: '100%', width: `${Math.min(100, val)}%`, background: color, borderRadius: 4, transition: 'width 0.5s' }} />
  </div>
)

const BENEFIT_COLORS = { 'SSS': '#534AB7', 'Pag-IBIG': '#F4A261', 'PhilHealth': '#2EC4B6', 'QCID': '#E76F51' }

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [tab,           setTab]           = useState('demographics')
  const [subTab,        setSubTab]        = useState('gender')
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [benefits,      setBenefits]      = useState(null)
  const [birthPlace,    setBirthPlace]    = useState(null)
  const [education,     setEducation]     = useState(null)
  const [genderStats,   setGenderStats]   = useState(null)
  const [barangayStats, setBarangayStats] = useState(null)
  const [ageStats,      setAgeStats]      = useState(null)
  const [losStats,      setLosStats]      = useState(null)
  const [rawCount,      setRawCount]      = useState(0)
  const [groupBy,       setGroupBy]       = useState('district')
  const [showAllBarangays, setShowAllBarangays] = useState(false)
  const [allRecords,    setAllRecords]    = useState([])

  const rebuildAll = (records, gb) => {
    setBenefits(buildBenefits(records, gb))
    setBirthPlace(buildBirthPlace(records, gb))
    setEducation(buildEducation(records, gb))
    setGenderStats(buildGenderStats(records, gb))
    setBarangayStats(buildBarangayStats(records, gb))
    setAgeStats(buildAge(records, gb))
    setLosStats(buildLengthOfService(records, gb))
  }

  useEffect(() => {
    const load = async () => {
      try {
        const token   = localStorage.getItem('token')
        const records = await fetchAll(token)
        setAllRecords(records)
        setRawCount(records.length)
        rebuildAll(records, 'district')
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (allRecords.length > 0) rebuildAll(allRecords, groupBy)
  }, [groupBy])

  const getChartWidth = (dataLen) =>
    (groupBy === 'barangay' && showAllBarangays) ? Math.max(1000, dataLen * 35) : '100%'

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
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, color: '#2d2a6e', fontWeight: 700 }}>Analytics Report</h2>
          <p style={{ margin: 0, color: '#888', fontSize: 12 }}>
            {rawCount.toLocaleString()} total records · Generated: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }} className="hide-on-print">
          {/* Group By toggle */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#7874a7', marginBottom: 3 }}>Group By</div>
            <div style={{ display: 'flex', border: '1px solid #d5d0f0', borderRadius: 6, overflow: 'hidden' }}>
              {['district','barangay'].map(g => (
                <button key={g} onClick={() => { setGroupBy(g); if (g === 'district') setShowAllBarangays(false) }}
                  style={{ padding: '4px 10px', fontSize: 12, border: 'none', cursor: 'pointer', background: groupBy === g ? '#534AB7' : '#fff', color: groupBy === g ? '#fff' : '#534AB7', fontWeight: groupBy === g ? 700 : 400, textTransform: 'capitalize' }}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {/* Show All toggle (barangay only) */}
          {groupBy === 'barangay' && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#7874a7', marginBottom: 3 }}>Limit</div>
              <div style={{ display: 'flex', border: '1px solid #d5d0f0', borderRadius: 6, overflow: 'hidden' }}>
                {[false, true].map(v => (
                  <button key={String(v)} onClick={() => setShowAllBarangays(v)}
                    style={{ padding: '4px 10px', fontSize: 12, border: 'none', cursor: 'pointer', background: showAllBarangays === v ? '#534AB7' : '#fff', color: showAllBarangays === v ? '#fff' : '#534AB7', fontWeight: showAllBarangays === v ? 700 : 400 }}>
                    {v ? 'All' : 'Top 20'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={() => exportToExcel(benefits, birthPlace, education, genderStats, barangayStats, ageStats, losStats, groupBy)}
            style={{ ...S.btn, background: '#10b981' }}>
            📊 Export to Excel
          </button>
        </div>
      </div>

      {/* ── Card with Tabs ── */}
      <div style={S.card}>
        <div style={S.tabBar}>
          <button style={S.tab(true)}>Demographic Profile</button>
        </div>

        <div style={S.subTabBar}>
          {[
            { key: 'gender',          label: '🚻 Gender' },
            { key: 'age',             label: '🎂 Age' },
            { key: 'education',       label: '🎓 Educational Level' },
            { key: 'birthplace',      label: '🏠 Birth Place' },
            { key: 'lengthOfService', label: '⏳ Length of Service' },
            { key: 'barangay',        label: '🏘️ Top Barangays' },
            { key: 'benefits',        label: '🛡️ Benefits Coverage' },
          ].map(t => (
            <button key={t.key} style={S.subTab(subTab === t.key)} onClick={() => setSubTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {/* ════════════════════════════════════════
            GENDER SUB-TAB
        ════════════════════════════════════════ */}
        {subTab === 'gender' && genderStats && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
              <div style={S.metric}><div style={S.mLabel}>Female</div><div style={{ ...S.mVal, color: '#d4537e' }}>{genderStats.female.toLocaleString()}</div><div style={S.mSub}>{genderStats.pieData.find(x => x.name === 'Female')?.pct || 0}%</div></div>
              <div style={S.metric}><div style={S.mLabel}>Male</div><div style={{ ...S.mVal, color: '#3b82f6' }}>{genderStats.male.toLocaleString()}</div><div style={S.mSub}>{genderStats.pieData.find(x => x.name === 'Male')?.pct || 0}%</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginBottom: 24 }}>
              <div>
                <p style={S.sectionHead}>Gender Distribution</p>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={genderStats.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                      label={({ payload }) => `${payload.name}: ${payload.value.toLocaleString()} (${payload.pct}%)`} labelLine>
                      {genderStats.pieData.map((entry, i) => <Cell key={i} fill={entry.name === 'Female' ? '#d4537e' : '#3b82f6'} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <p style={{ ...S.sectionHead, marginTop: 24 }}>Gender by {groupBy === 'district' ? 'District' : 'Barangay'} {groupBy === 'barangay' ? (showAllBarangays ? '(All)' : '(Top 20)') : ''}</p>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <div style={{ width: getChartWidth(genderStats.byGroup.length), height: groupBy === 'barangay' ? 400 : 340 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groupBy === 'district' ? genderStats.byGroup : [...genderStats.byGroup].sort((a,b) => b.total - a.total).slice(0, showAllBarangays ? undefined : 20)}
                    margin={{ top: 20, right: 20, left: 0, bottom: groupBy === 'barangay' ? 60 : 20 }} barCategoryGap="20%" barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                    <XAxis dataKey="name" tick={{ fontSize: groupBy === 'barangay' ? 10 : 12 }} angle={groupBy === 'barangay' ? -45 : 0} textAnchor={groupBy === 'barangay' ? 'end' : 'middle'} interval={0} height={groupBy === 'barangay' ? 80 : 30} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => v.toLocaleString()} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {['Female','Male'].map(g => (
                      <Bar key={g} dataKey={g} fill={g === 'Female' ? '#d4537e' : '#3b82f6'} radius={[3,3,0,0]} barSize={18}>
                        <LabelList dataKey={g} position="top" formatter={(v) => v > 0 ? v.toLocaleString() : ''} style={{ fontSize: 9, fill: '#333', fontWeight: 600 }} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            AGE SUB-TAB
        ════════════════════════════════════════ */}
        {subTab === 'age' && ageStats && (
          <div style={{ padding: 20 }}>
            <p style={S.sectionHead}>Age Distribution</p>

            {/* Overview chart + table */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
              <div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={ageStats.list} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#457B9D" radius={[3,3,0,0]}>
                      <LabelList dataKey="count" position="top" formatter={(v) => v.toLocaleString()} style={{ fontSize: 10, fill: '#333', fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: 300, borderBottom: '1px solid #eeeaf8' }}>
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

            {/* ── Excel-style cross-table ── */}
            <div style={{ marginTop: 28 }}>
              <p style={S.sectionHead}>
                Age Bracket per {groupBy === 'district' ? 'District' : 'Barangay'} {groupBy === 'barangay' ? (showAllBarangays ? '(All)' : '(Top 20)') : ''}
              </p>
              <div style={{ overflowX: 'auto', border: '1px solid #e4e2f5', borderRadius: 8 }}>
                {(() => {
                  const tableData = groupBy === 'district'
                    ? ageStats.byGroup
                    : [...ageStats.byGroup].sort((a,b) => b.total - a.total).slice(0, showAllBarangays ? undefined : 20)

                  return (
                    <table style={{ ...S.tbl, tableLayout: 'auto' }}>
                      <thead>
                        {/* Green title row */}
                        <tr>
                          <td colSpan={tableData.length + 2} style={{
                            background: '#c8f5c8', color: '#1a5c1a', fontWeight: 700, fontSize: 12,
                            padding: '9px 14px', textAlign: 'center', letterSpacing: '.06em',
                            textTransform: 'uppercase', borderBottom: '2px solid #a8e0a8',
                          }}>
                            AGE BRACKET PER {groupBy === 'district' ? 'DISTRICT' : 'BARANGAY'}
                          </td>
                        </tr>
                        {/* Column headers */}
                        <tr>
                          <th style={{ ...S.thL, background: '#c8f5c8', color: '#1a5c1a', minWidth: 130, position: 'sticky', top: 0, zIndex: 2 }}>
                            AGE BRACKET
                          </th>
                          {tableData.map((r, i) => (
                            <th key={r.label} style={{
                              ...S.th,
                              background: DISTRICT_HEADER_COLORS[i % DISTRICT_HEADER_COLORS.length],
                              color: DISTRICT_HEADER_COLORS[i % DISTRICT_HEADER_COLORS.length] === '#f9c74f' ? '#333' : '#fff',
                              minWidth: 100, position: 'sticky', top: 0, zIndex: 2,
                            }}>
                              {r.label.toUpperCase()}
                            </th>
                          ))}
                          <th style={{ ...S.th, background: '#3c3289', color: '#fff', minWidth: 80, position: 'sticky', top: 0, zIndex: 2 }}>
                            TOTAL
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {AGE_ORDER.map((range, ri) => {
                          const rowTotal = tableData.reduce((s, r) => s + (r[range] || 0), 0)
                          return (
                            <tr key={range} style={{ background: ri % 2 === 0 ? '#fff' : '#faf9fe' }}>
                              <td style={{ ...S.tdL, fontWeight: 700 }}>{range}</td>
                              {tableData.map(r => (
                                <td key={r.label} style={S.td}>{(r[range] || 0).toLocaleString()}</td>
                              ))}
                              <td style={{ ...S.td, fontWeight: 700, color: '#3c3289', background: '#f0eefb' }}>
                                {rowTotal.toLocaleString()}
                              </td>
                            </tr>
                          )
                        })}
                        <tr style={S.tot}>
                          <td style={{ ...S.tdL, ...S.tot }}>TOTAL</td>
                          {tableData.map(r => (
                            <td key={r.label} style={{ ...S.td, ...S.tot }}>{r.total.toLocaleString()}</td>
                          ))}
                          <td style={{ ...S.td, ...S.tot }}>
                            {tableData.reduce((s, r) => s + r.total, 0).toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )
                })()}
              </div>
            </div>

            {/* ── Grouped bar chart by district/barangay ── */}
            <div style={{ marginTop: 28 }}>
              <p style={S.sectionHead}>Age Range by {groupBy === 'district' ? 'District' : 'Barangay'} {groupBy === 'barangay' ? (showAllBarangays ? '(All)' : '(Top 20)') : ''}</p>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <div style={{ width: getChartWidth(ageStats.byGroup.length), height: groupBy === 'barangay' ? 400 : 340 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={groupBy === 'district' ? ageStats.byGroup : [...ageStats.byGroup].sort((a,b) => b.total - a.total).slice(0, showAllBarangays ? undefined : 20)}
                      margin={{ top: 20, right: 20, left: 0, bottom: groupBy === 'barangay' ? 60 : 20 }}
                      barCategoryGap="20%" barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                      <XAxis dataKey="name" tick={{ fontSize: groupBy === 'barangay' ? 10 : 12 }} angle={groupBy === 'barangay' ? -45 : 0} textAnchor={groupBy === 'barangay' ? 'end' : 'middle'} interval={0} height={groupBy === 'barangay' ? 80 : 30} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => v.toLocaleString()} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {AGE_ORDER.map((range, i) => (
                        <Bar key={range} dataKey={range} fill={COLORS[i % COLORS.length]} radius={[3,3,0,0]} barSize={14}>
                          <LabelList dataKey={range} position="top" formatter={(v) => v > 0 ? v.toLocaleString() : ''} style={{ fontSize: 9, fill: '#333', fontWeight: 600 }} />
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            EDUCATION SUB-TAB
        ════════════════════════════════════════ */}
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
            <div style={{ marginBottom: 24, overflowX: 'auto', maxHeight: 400, borderBottom: '1px solid #eeeaf8' }}>
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
            <p style={{ ...S.sectionHead, marginTop: 8 }}>Educational Level by {groupBy === 'district' ? 'District' : 'Barangay'} {groupBy === 'barangay' ? (showAllBarangays ? '(All)' : '(Top 20)') : ''}</p>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <div style={{ width: getChartWidth(education.byGroup.length), height: groupBy === 'barangay' ? 380 : 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groupBy === 'district' ? education.byGroup : [...education.byGroup].sort((a,b) => b.total - a.total).slice(0, showAllBarangays ? undefined : 20)}
                    margin={{ top: 30, right: 20, left: 0, bottom: groupBy === 'barangay' ? 60 : 5 }} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                    <XAxis dataKey="name" tick={{ fontSize: groupBy === 'barangay' ? 10 : 12 }} angle={groupBy === 'barangay' ? -45 : 0} textAnchor={groupBy === 'barangay' ? 'end' : 'middle'} interval={0} height={groupBy === 'barangay' ? 80 : 30} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => v.toLocaleString()} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {education.chartLevels.map((levelKey, i) => (
                      <Bar key={levelKey} dataKey={levelKey} fill={COLORS[i % COLORS.length]} radius={[3,3,0,0]} barSize={18}>
                        <LabelList dataKey={levelKey} position="top" formatter={(v) => v > 0 ? v.toLocaleString() : ''} style={{ fontSize: 9, fill: '#333', fontWeight: 600 }} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            BIRTH PLACE SUB-TAB
        ════════════════════════════════════════ */}
        {subTab === 'birthplace' && birthPlace && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'From NCR',      val: birthPlace.ncr.toLocaleString(),      sub: `${birthPlace.overview.find(x => x.name === 'NCR')?.pct ?? 0}% of total`,      color: '#2EC4B6' },
                { label: 'From Province', val: birthPlace.province.toLocaleString(), sub: `${birthPlace.overview.find(x => x.name === 'Province')?.pct ?? 0}% of total`, color: '#F4A261' },
                { label: 'Not Specified', val: birthPlace.unknown.toLocaleString(),  sub: 'blank birth place',                                                            color: '#999' },
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
                    <Pie data={birthPlace.overview} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                      label={({ payload }) => `${payload.name}: ${payload.value.toLocaleString()} (${payload.pct}%)`} labelLine>
                      {birthPlace.overview.map((_, i) => <Cell key={i} fill={['#2EC4B6','#F4A261','#ccc'][i]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} (${birthPlace.overview.find(x => x.name === n)?.pct}%)`, n]} />
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
                  <BarChart data={birthPlace.topPlaces.slice(0, 10).map(r => ({ name: r.place.length > 16 ? r.place.slice(0, 14) + '…' : r.place, fullName: r.place, count: r.count }))}
                    margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v, n, p) => [v, p.payload.fullName]} />
                    <Bar dataKey="count" fill="#534AB7" radius={[3,3,0,0]}>
                      <LabelList dataKey="count" position="top" formatter={(v) => v.toLocaleString()} style={{ fontSize: 10, fill: '#333', fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )}
            <div style={{ marginTop: 24 }}>
              <p style={{ ...S.sectionHead, marginTop: 8 }}>Birth Place by {groupBy === 'district' ? 'District' : 'Barangay'} {groupBy === 'barangay' ? (showAllBarangays ? '(All)' : '(Top 20)') : ''}</p>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <div style={{ width: getChartWidth(birthPlace.byGroup.length), height: groupBy === 'barangay' ? 400 : 340 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={groupBy === 'district' ? birthPlace.byGroup : [...birthPlace.byGroup].sort((a,b) => b.total - a.total).slice(0, showAllBarangays ? undefined : 20)}
                      margin={{ top: 20, right: 20, left: 0, bottom: groupBy === 'barangay' ? 60 : 20 }} barCategoryGap="20%" barGap={6}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                      <XAxis dataKey="name" tick={{ fontSize: groupBy === 'barangay' ? 10 : 12 }} angle={groupBy === 'barangay' ? -45 : 0} textAnchor={groupBy === 'barangay' ? 'end' : 'middle'} interval={0} height={groupBy === 'barangay' ? 80 : 30} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => v.toLocaleString()} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {['NCR','Province','Unknown'].map((key, i) => (
                        <Bar key={key} dataKey={key} fill={['#2EC4B6','#F4A261','#999'][i]} radius={[3,3,0,0]} barSize={18}>
                          <LabelList dataKey={key} position="top" formatter={(v) => v > 0 ? v.toLocaleString() : ''} style={{ fontSize: 9, fill: '#333', fontWeight: 600 }} />
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            LENGTH OF SERVICE SUB-TAB
        ════════════════════════════════════════ */}
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
                    <Bar dataKey="count" fill="#2EC4B6" radius={[3,3,0,0]}>
                      <LabelList dataKey="count" position="top" formatter={(v) => v.toLocaleString()} style={{ fontSize: 10, fill: '#333', fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ overflowX: 'auto', maxHeight: 300, borderBottom: '1px solid #eeeaf8' }}>
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
            <div style={{ marginTop: 20 }}>
              <p style={{ ...S.sectionHead, marginTop: 24 }}>Length of Service by {groupBy === 'district' ? 'District' : 'Barangay'} {groupBy === 'barangay' ? (showAllBarangays ? '(All)' : '(Top 20)') : ''}</p>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <div style={{ width: getChartWidth(losStats.byGroup.length), height: groupBy === 'barangay' ? 400 : 340 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={groupBy === 'district' ? losStats.byGroup : [...losStats.byGroup].sort((a,b) => b.total - a.total).slice(0, showAllBarangays ? undefined : 20)}
                      margin={{ top: 20, right: 20, left: 0, bottom: groupBy === 'barangay' ? 60 : 20 }} barCategoryGap="20%" barGap={6}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                      <XAxis dataKey="name" tick={{ fontSize: groupBy === 'barangay' ? 10 : 12 }} angle={groupBy === 'barangay' ? -45 : 0} textAnchor={groupBy === 'barangay' ? 'end' : 'middle'} interval={0} height={groupBy === 'barangay' ? 80 : 30} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => v.toLocaleString()} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {LOS_ORDER.map((range, i) => (
                        <Bar key={range} dataKey={range} fill={COLORS[i % COLORS.length]} radius={[3,3,0,0]} barSize={18}>
                          <LabelList dataKey={range} position="top" formatter={(v) => v > 0 ? v.toLocaleString() : ''} style={{ fontSize: 9, fill: '#333', fontWeight: 600 }} />
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            BARANGAY SUB-TAB
        ════════════════════════════════════════ */}
        {subTab === 'barangay' && barangayStats && (
          <div style={{ padding: 20 }}>
            <p style={S.sectionHead}>Kasambahay Count by {groupBy === 'district' ? 'District' : 'Barangay'} {groupBy === 'barangay' ? (showAllBarangays ? '(All)' : '(Top 20)') : ''}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 28 }}>
              <div style={{ overflowX: 'auto', width: '100%' }}>
                <div style={{ width: getChartWidth(barangayStats.allGroups.length), height: groupBy === 'barangay' ? 320 : 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={groupBy === 'district' ? barangayStats.allGroups : barangayStats.allGroups.slice(0, showAllBarangays ? undefined : 20)}
                      margin={{ top: 24, right: 20, left: 0, bottom: groupBy === 'barangay' ? 60 : 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                      <XAxis dataKey="name" tick={{ fontSize: groupBy === 'barangay' ? 10 : 12 }} angle={groupBy === 'barangay' ? -45 : 0} textAnchor={groupBy === 'barangay' ? 'end' : 'middle'} interval={0} height={groupBy === 'barangay' ? 80 : 30} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v, n, p) => [v.toLocaleString(), p.payload.label]} />
                      <Bar dataKey="count" radius={[4,4,0,0]} name="Kasambahay">
                        {barangayStats.allGroups.slice(0, groupBy === 'barangay' && !showAllBarangays ? 20 : undefined).map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                        <LabelList dataKey="count" position="top" formatter={(v) => v.toLocaleString()} style={{ fontSize: 11, fill: '#333', fontWeight: 600 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ maxHeight: 400, overflowY: 'auto', borderBottom: '1px solid #eeeaf8' }}>
                <table style={S.tbl}>
                  <thead>
                    <tr>
                      <th style={S.thL}>{groupBy === 'district' ? 'District' : 'Barangay'}</th>
                      <th style={S.th}>Count</th>
                      <th style={S.th}>% of Total</th>
                      <th style={{ ...S.th, minWidth: 120 }}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barangayStats.allGroups.map((r, i) => (
                      <tr key={r.label} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fe' }}>
                        <td style={{ ...S.tdL, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0, display: 'inline-block' }} />
                          {r.label}
                        </td>
                        <td style={S.td}>{r.count.toLocaleString()}</td>
                        <td style={{ ...S.td, fontWeight: 600, color: COLORS[i % COLORS.length] }}>{r.pct}%</td>
                        <td style={S.td}>
                          <div style={{ ...S.bar, margin: 0 }}>
                            <div style={{ height: '100%', width: `${Math.min(100, r.pct)}%`, background: COLORS[i % COLORS.length], borderRadius: 4, transition: 'width 0.5s' }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr style={S.tot}>
                      <td style={{ ...S.tdL, ...S.tot }}>TOTAL</td>
                      <td style={{ ...S.td,  ...S.tot }}>{barangayStats.allGroups.reduce((s, r) => s + r.count, 0).toLocaleString()}</td>
                      <td style={{ ...S.td,  ...S.tot }}>100%</td>
                      <td style={{ ...S.td,  ...S.tot }} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <p style={S.sectionHead}>{showAllBarangays ? 'All' : 'Top 20'} Barangays with Most Kasambahay</p>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <div style={{ width: showAllBarangays ? Math.max(1000, barangayStats.list.length * 35) : '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barangayStats.list.slice(0, showAllBarangays ? undefined : 20)} margin={{ top: 20, right: 20, left: 0, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                    <XAxis dataKey="barangay" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => v.toLocaleString()} />
                    <Bar dataKey="count" fill="#2EC4B6" radius={[3,3,0,0]} name="Kasambahay Count">
                      <LabelList dataKey="count" position="top" formatter={(v) => v.toLocaleString()} style={{ fontSize: 9, fill: '#333', fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
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

        {/* ════════════════════════════════════════
            BENEFITS SUB-TAB
        ════════════════════════════════════════ */}
        {subTab === 'benefits' && benefits && (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
              {Object.entries(BENEFIT_COLORS).map(([b, color]) => {
                const totalAll  = benefits.byGroup.reduce((s, r) => s + r.total, 0)
                const rawKey    = { 'SSS': 'rawSss', 'Pag-IBIG': 'rawPagibig', 'PhilHealth': 'rawPhilhealth', 'QCID': 'rawQcid' }[b]
                const totalHave = benefits.byGroup.reduce((s, r) => s + r[rawKey], 0)
                const pct       = totalAll ? +((totalHave / totalAll) * 100).toFixed(1) : 0
                return (
                  <div key={b} style={S.metric}>
                    <div style={S.mLabel}>{b}</div>
                    <div style={{ ...S.mVal, color }}>{pct}%</div>
                    <div style={S.mSub}>{totalHave.toLocaleString()} of {totalAll.toLocaleString()}</div>
                  </div>
                )
              })}
            </div>

            <p style={S.sectionHead}>Benefits Coverage % by {groupBy === 'district' ? 'District' : 'Barangay'} {groupBy === 'barangay' ? (showAllBarangays ? '(All)' : '(Top 20)') : ''}</p>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <div style={{ width: getChartWidth(benefits.byGroup.length), height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groupBy === 'district' ? benefits.byGroup : [...benefits.byGroup].sort((a,b) => b.total - a.total).slice(0, showAllBarangays ? undefined : 20)}
                    margin={{ top: 20, right: 20, left: 0, bottom: groupBy === 'barangay' ? 60 : 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                    <XAxis dataKey="name" tick={{ fontSize: groupBy === 'barangay' ? 10 : 12 }} angle={groupBy === 'barangay' ? -45 : 0} textAnchor={groupBy === 'barangay' ? 'end' : 'middle'} interval={0} height={groupBy === 'barangay' ? 80 : 30} />
                    <YAxis tickFormatter={v => `${v}%`} domain={[0,100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {Object.entries(BENEFIT_COLORS).map(([b, color]) => (
                      <Bar key={b} dataKey={b} fill={color} radius={[3,3,0,0]}>
                        <LabelList dataKey={b} position="top" formatter={(v) => `${v}%`} style={{ fontSize: 10, fill: '#555', fontWeight: 600 }} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ overflowX: 'auto', marginTop: 20, maxHeight: 400, borderBottom: '1px solid #eeeaf8' }}>
              <table style={S.tbl}>
                <thead>
                  <tr>
                    <th style={S.thL}>{groupBy === 'district' ? 'District' : 'Barangay'}</th>
                    <th style={S.th}>Total</th>
                    {Object.keys(BENEFIT_COLORS).flatMap(b => [
                      <th key={`${b}n`} style={S.th}>{b} #</th>,
                      <th key={`${b}p`} style={{ ...S.th, color: BENEFIT_COLORS[b] }}>{b} %</th>,
                    ])}
                  </tr>
                </thead>
                <tbody>
                  {benefits.byGroup.map((r, i) => (
                    <tr key={r.label} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fe' }}>
                      <td style={S.tdL}>{r.label}</td>
                      <td style={S.td}>{r.total.toLocaleString()}</td>
                      {[['rawSss','SSS'],['rawPagibig','Pag-IBIG'],['rawPhilhealth','PhilHealth'],['rawQcid','QCID']].flatMap(([rk, bk]) => [
                        <td key={`${rk}n`} style={S.td}>{r[rk].toLocaleString()}</td>,
                        <td key={`${rk}p`} style={{ ...S.td, fontWeight: 600, color: BENEFIT_COLORS[bk] }}>{r[bk]}%</td>,
                      ])}
                    </tr>
                  ))}
                  {(() => {
                    const tot = benefits.byGroup.reduce((acc, r) => {
                      acc.total += r.total; acc.rawSss += r.rawSss; acc.rawPagibig += r.rawPagibig
                      acc.rawPhilhealth += r.rawPhilhealth; acc.rawQcid += r.rawQcid; return acc
                    }, { total: 0, rawSss: 0, rawPagibig: 0, rawPhilhealth: 0, rawQcid: 0 })
                    return (
                      <tr style={S.tot}>
                        <td style={{ ...S.tdL, ...S.tot }}>TOTAL / OVERALL</td>
                        <td style={{ ...S.td,  ...S.tot }}>{tot.total.toLocaleString()}</td>
                        {[['rawSss','SSS'],['rawPagibig','Pag-IBIG'],['rawPhilhealth','PhilHealth'],['rawQcid','QCID']].flatMap(([rk, bk]) => {
                          const p = tot.total ? +((tot[rk] / tot.total) * 100).toFixed(1) : 0
                          return [
                            <td key={`${rk}tn`} style={{ ...S.td, ...S.tot }}>{tot[rk].toLocaleString()}</td>,
                            <td key={`${rk}tp`} style={{ ...S.td, ...S.tot }}>{p}%</td>,
                          ]
                        })}
                      </tr>
                    )
                  })()}
                </tbody>
              </table>
            </div>

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
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@media print { .hide-on-print { display: none !important; } }` }} />
    </div>
  )
}