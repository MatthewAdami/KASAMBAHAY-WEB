/**
 * kasambahaySeeder2026.js
 * -----------------------
 * Migration tool for: 'Copy of 2026 E. SPD KASAMBAHAY MASTERLIST .xlsx'
 * 
 * Reads ALL sheets from the Kasambahay Excel masterlist,
 * auto-detects year and district from each sheet name, and bulk-inserts
 * records into MongoDB.
 *
 * Handles sheet name formats:
 *   ✅ '2024 DISTRICT 5'  → year=2024, district='District 5'
 *   ✅ '2025 DISTRICT 5'  → year=2025, district='District 5'
 *   ✅ '2024 DISTRICT 4'  → year=2024, district='District 4'
 *   ⛔ 'DISTRICT 4'       → blocked (ambiguous year, likely duplicate of 2024 DISTRICT 4)
 *   ⛔ 'Copy of ...'      → blocked (draft copies)
 *   ⏭ 'NEW MASTERLIST SUMMARY', 'MASTERLIST' → skipped (no year+district)
 *
 * Usage:
 *   node kasambahaySeeder2026.js             → seeds all sheets
 *   node kasambahaySeeder2026.js --dry-run   → parses & logs without writing to DB
 *   node kasambahaySeeder2026.js --clear     → drops existing records before seeding
 */

const dns = require('dns')
dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '8.8.4.4'])

const mongoose = require('mongoose')
const path = require('path')
const XLSX = require('xlsx')
require('dotenv').config({ path: '../.env' })

const Kasambahay = require('../models/Kasambahay')

// ─── CLI FLAGS ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const DRY_RUN     = args.includes('--dry-run')
const CLEAR_FIRST = args.includes('--clear')

// ─── EXCEL FILE PATH ──────────────────────────────────────────────────────────
const EXCEL_FILE = path.join(
  __dirname,
  '../Copy of 2026 E. SPD KASAMBAHAY MASTERLIST .xlsx'
)

// ─── BLOCKED SHEETS ───────────────────────────────────────────────────────────
// In this 2026 file, the "DISTRICT" sheets are our actual target data, 
// so we leave this blocklist empty.
const SKIP_SHEETS = new Set([])

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Converts various truthy representations from Excel to a JS boolean.
 * Handles: 1, '1', 'yes', 'y', 'x', 'true' (case-insensitive).
 */
const toBool = (val) => {
  if (val === null || val === undefined) return false
  if (typeof val === 'boolean') return val
  const s = String(val).trim().toLowerCase()
  return ['1', 'true', 'yes', 'y', 'x'].includes(s)
}

/** Converts a value to a trimmed string. Returns '' for null/undefined. */
const toStr = (val) => {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

/** Converts a value to a float. Returns null for non-numeric values. */
const toNum = (val) => {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

/**
 * Converts a value to a Date object.
 * Handles Excel serial date numbers and ISO/string dates.
 * Returns null if the value cannot be parsed.
 */
const toDate = (val) => {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') {
    const excelEpoch = new Date(1899, 11, 30)
    const date = new Date(excelEpoch.getTime() + val * 86400000)
    return isNaN(date.getTime()) ? null : date
  }
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

// ─── SHEET NAME PARSERS ───────────────────────────────────────────────────────

/**
 * Extracts a 4-digit year (2000–2099) from a sheet name.
 * Returns null if not found.
 */
const getYear = (sheetName) => {
  const match = sheetName.match(/\b(20\d{2})\b/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Extracts district number 1–6 from a sheet name.
 * Matches: 'DISTRICT 5', 'DISTRICT5', 'DIST 3', 'DIST. 3'
 * Returns formatted string 'District N', or null if not found.
 */
const getDistrict = (sheetName) => {
  const match = sheetName.match(/DIST(?:RICT)?\.?\s*([1-6])/i)
  return match ? `District ${match[1]}` : null
}

/**
 * Returns true for year-only sheets like '2024' or '2025'.
 * These set the year context for following district-only sheets.
 */
const isYearOnlySheet = (sheetName) => {
  return /^\s*(20\d{2})\s*$/.test(sheetName)
}

// ─── ROW MAPPER ───────────────────────────────────────────────────────────────

const mapRow = (row, district, year) => ({
  registrationNo: toNum(
    row['REGISTRATION NO'] ??
    row['Unnamed: 0'] ??
    row['__EMPTY'] ??
    null
  ),

  dateRegistered:   toDate(row['DATE REGISTERED']),
  lastName:         toStr(row['LAST NAME']),
  firstName:        toStr(row['FIRST NAME']),
  middleName:       toStr(row['MIDDLE NAME']),
  barangay:         toStr(row['BARANGAY']),
  employerAddress:  toStr(row['EMPLOYER ADDRESS']),
  birthPlace:       toStr(row['BIRTH PLACE']),
  currentResidence: toStr(row['CURRENT RESIDENCE']),
  birthday:         toDate(row['BIRTHDAY']),
  age:              toNum(row['AGE']),

  educationalAttainment: toStr(row['EDUCATIONAL INFORMATION']),
  civilStatus:           toStr(row['CIVIL STATUS']),
  mobileNumber:          toStr(row['MOBILE NUMBER']),

  sss:        toStr(row['SSS']),
  pagIbig:    toStr(row['PAG-IBIG FUND']),
  philhealth: toStr(row['PHILHEALTH']),
  qcid:       toStr(row['QCID']),

  monthlySalary: toNum(row['MONTHLY SALARY']),

  isExOfw:                toBool(row['EX  OFW']),
  isSoloParent:           toBool(row['SOLO PARENT']),
  isPersonWithDisability: toBool(row['PERSON WITH DISABILITY']),
  isSeniorCitizen:        toBool(row['SENIOR CITIZEN']),

  kasambahayOrientation:       toBool(row['KASAMBAHAY ORIENTATION']),
  kasambahayOrganizing:        toBool(row['KASAMBAHAY ORGANIZING']),
  occupationalSafetyAndHealth: toBool(row['OCCUPATIONAL SAFETY AND HEALTH']),
  genderSensitivityTraining:   toBool(row['GENDER SENSITIVITY TRAINING']),
  basicFirstAidTraining:       toBool(row['BASIC FIRST AID TRAINING']),
  homeSecurityAwareness:       toBool(row['HOME SECURITY AWARENESS']),
  kasambahayGeneralAssembly:   toBool(row['KASAMBAHAY GENERAL ASSEMBLY']),
  kasambahayDay:               toBool(row['KASAMBAHAY DAY']),
  disasterPreparedness:        toBool(row['DESASTER PREPAREDNESS']),

  isFemale:  toBool(row['FEMALE']),
  isMale:    toBool(row['MALE']),
  isLiveIn:  toBool(row['LIVE IN']),
  isLiveOut: toBool(row['LIVE OUT']),
  isOnCall:  toBool(row['ON CALL']),

  isGeneralHousehelp: toBool(row['GENERAL HOUSEHELP']),
  isCook:             toBool(row['cook']),
  isLaundryPerson:    toBool(row['LAUNDRY PERSON']),
  isYaya:             toBool(row['YAYA']),
  isGardener:         toBool(row['GARDENER']),

  lengthOfService:        toStr(row['KASAMBAHAY LENGTH OF SERVICE']),
  isQcVoter:              toStr(row['QC VOTERS']),
  noOfFamilyVoters:       toStr(row['NO. FAMILY VOTERS']),
  noOfKasambahayInFamily: toStr(row['NO. OF KASAMBAHAY IN YOUR FAMILY']),
  workOfEmployer:         toStr(row["WORK OF EMPLOYER'S"]),
  isKapsaMember:          toBool(row['KAPSA  Member']),
  isBcoopMember:          toBool(row['BCOOP Member']),

  district,
  year,
})

// ─── PROCESS ONE SHEET ────────────────────────────────────────────────────────

const processSheet = async (workbook, name, year, district, sheetSummary) => {
  console.log(`📄 Processing: "${name}" → ${district}, ${year}`)

  const sheet = workbook.Sheets[name]
  const rows  = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true })

  if (rows.length === 0) {
    console.log(`   ⚠  No data rows found — skipping\n`)
    sheetSummary.push({ sheet: name, district, year, count: 0, status: 'empty' })
    return 0
  }

  const records = rows
    .map(row => mapRow(row, district, year))
    .filter(rec => rec.lastName || rec.firstName || rec.registrationNo)

  const skipped = rows.length - records.length
  if (skipped > 0) console.log(`   ℹ  Skipped ${skipped} empty/invalid row(s)`)

  if (DRY_RUN) {
    console.log(`   ✔ [DRY RUN] Would insert ${records.length} record(s)\n`)
    sheetSummary.push({ sheet: name, district, year, count: records.length, status: 'dry-run' })
    return records.length
  }

  try {
    const result = await Kasambahay.insertMany(records, { ordered: false })
    console.log(`   ✔ Inserted ${result.length} record(s)\n`)
    sheetSummary.push({ sheet: name, district, year, count: result.length, status: 'ok' })
    return result.length
  } catch (err) {
    if (err.name === 'MongoBulkWriteError' || err.code === 11000) {
      const inserted = err.result?.insertedCount ?? 0
      const dupes    = records.length - inserted
      console.warn(`   ⚠  ${inserted} inserted, ${dupes} duplicate(s) skipped\n`)
      sheetSummary.push({ sheet: name, district, year, count: inserted, status: 'partial (dupes)' })
      return inserted
    } else {
      console.error(`   ✖ Insert failed for "${name}": ${err.message}\n`)
      sheetSummary.push({ sheet: name, district, year, count: 0, status: `error: ${err.message}` })
      return 0
    }
  }
}

// ─── MAIN SEEDER ─────────────────────────────────────────────────────────────

const seed = async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Kasambahay 2026 Seeder ')
  if (DRY_RUN)     console.log('  MODE: DRY RUN — no DB writes')
  if (CLEAR_FIRST) console.log('  FLAG: --clear detected, will drop records first')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    if (!DRY_RUN) {
      await mongoose.connect(process.env.MONGO_URI)
      console.log('\n✔ Connected to MongoDB\n')
    }

    if (CLEAR_FIRST && !DRY_RUN) {
      const deleted = await Kasambahay.deleteMany({})
      console.log(`🗑  Cleared ${deleted.deletedCount} existing records\n`)
    }

    const workbook   = XLSX.readFile(EXCEL_FILE)
    const sheetNames = workbook.SheetNames
    console.log(`📂 Found ${sheetNames.length} sheet(s) in workbook\n`)

    let totalInserted      = 0
    let totalSkippedSheets = 0
    let contextYear        = 2026 // Force default to 2026 for this seeder
    const sheetSummary     = []

    for (const name of sheetNames) {
      // Block draft sheets
      if (SKIP_SHEETS.has(name) || name.startsWith('Copy of') || name.trim() === 'MASTERLIST') {
        console.log(`⛔ Blocked sheet: "${name}" (duplicate/copy — skipping)`)
        totalSkippedSheets++
        continue
      }

      const year     = getYear(name)
      const district = getDistrict(name)

      if (year && district) {
        contextYear = year
        totalInserted += await processSheet(workbook, name, year, district, sheetSummary)
        continue
      }

      if (isYearOnlySheet(name)) {
        contextYear = getYear(name)
        console.log(`🗓  Year-context sheet: "${name}" → contextYear set to ${contextYear}\n`)
        totalSkippedSheets++
        continue
      }

      if (!year && district && contextYear) {
        console.log(`   ℹ  No year in sheet name — using contextYear ${contextYear}`)
        totalInserted += await processSheet(workbook, name, contextYear, district, sheetSummary)
        continue
      }

      console.log(`⏭  Skipping sheet: "${name}" (cannot resolve year/district)`)
      totalSkippedSheets++
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  SEEDING SUMMARY')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.table(sheetSummary)
    console.log(`\n  Sheets processed : ${sheetSummary.length}`)
    console.log(`  Sheets skipped   : ${totalSkippedSheets}`)
    console.log(`  Records inserted : ${totalInserted}`)
    if (DRY_RUN) console.log('\n  ⚠ DRY RUN — nothing was written to the database.')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    process.exit(0)
  } catch (err) {
    console.error('\n✖ Fatal seeder error:', err.message)
    console.error(err.stack)
    process.exit(1)
  }
}

seed()