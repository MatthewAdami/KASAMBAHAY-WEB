/**
 * kasambahaySeeder.js
 * -------------------
 * Migration tool: reads ALL sheets from the Kasambahay Excel masterlist,
 * auto-detects year and district from each sheet name, and bulk-inserts
 * records into MongoDB.
 *
 * Usage:
 *   node kasambahaySeeder.js             → seeds all sheets
 *   node kasambahaySeeder.js --dry-run   → parses & logs without writing to DB
 *   node kasambahaySeeder.js --clear     → drops existing records before seeding
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
const DRY_RUN = args.includes('--dry-run')
const CLEAR_FIRST = args.includes('--clear')

// ─── EXCEL FILE PATH ──────────────────────────────────────────────────────────
const EXCEL_FILE = path.join(
  __dirname,
  '../Copy4 of  EDIT NEW KASAMBAHAY MASTERLIS  GIP.xlsx'
)

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

  // Excel stores dates as numeric serials (days since 1900-01-01)
  if (typeof val === 'number') {
    const excelEpoch = new Date(1899, 11, 30) // Dec 30 1899
    const date = new Date(excelEpoch.getTime() + val * 86400000)
    return isNaN(date.getTime()) ? null : date
  }

  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

// ─── SHEET NAME PARSERS ───────────────────────────────────────────────────────

/**
 * Extracts a 4-digit year from a sheet name.
 * Looks for years in the range 2000–2099.
 * Returns null if no year is found.
 *
 * Examples:
 *   '2024 DISTRICT 1'  → 2024
 *   'DISTRICT 3 2025'  → 2025
 *   'DISTRICT 1'       → null  (sheet will be skipped)
 */
const getYear = (sheetName) => {
  const match = sheetName.match(/\b(20\d{2})\b/)
  return match ? parseInt(match[1], 10) : null
}

/**
 * Extracts the district number from a sheet name.
 * Matches "DISTRICT" followed by a digit 1–6 anywhere in the name.
 * Returns a formatted string like 'District 1', or null if not found.
 *
 * Examples:
 *   '2024 DISTRICT 1'  → 'District 1'
 *   'DIST. 3 2025'     → null  (non-standard, will be skipped)
 *   'DISTRICT6'        → 'District 6'
 */
const getDistrict = (sheetName) => {
  const match = sheetName.match(/DISTRICT\s*([1-6])/i)
  return match ? `District ${match[1]}` : null
}

// ─── ROW MAPPER ───────────────────────────────────────────────────────────────

/**
 * Maps a raw Excel row object to a Kasambahay record.
 * All field keys must match the actual column headers in the Excel file.
 * Adjust the key strings if your headers differ.
 */
const mapRow = (row, district, year) => ({
  // The registration number column header varies across sheets.
  // We check the three most common variants.
  registrationNo: toNum(
    row['REGISTRATION NO'] ??
    row['Unnamed: 0'] ??
    row['__EMPTY'] ??
    null
  ),

  dateRegistered:  toDate(row['DATE REGISTERED']),
  lastName:        toStr(row['LAST NAME']),
  firstName:       toStr(row['FIRST NAME']),
  middleName:      toStr(row['MIDDLE NAME']),
  barangay:        toStr(row['BARANGAY']),
  employerAddress: toStr(row['EMPLOYER ADDRESS']),
  birthPlace:      toStr(row['BIRTH PLACE']),
  currentResidence:toStr(row['CURRENT RESIDENCE']),
  birthday:        toDate(row['BIRTHDAY']),
  age:             toNum(row['AGE']),

  educationalAttainment: toStr(row['EDUCATIONAL INFORMATION']),
  civilStatus:           toStr(row['CIVIL STATUS']),
  mobileNumber:          toStr(row['MOBILE NUMBER']),

  sss:        toStr(row['SSS']),
  pagIbig:    toStr(row['PAG-IBIG FUND']),
  philhealth: toStr(row['PHILHEALTH']),
  qcid:       toStr(row['QCID']),

  monthlySalary: toNum(row['MONTHLY SALARY']),

  // ── Kasambahay classifications ─────────────────────────────────────────────
  isExOfw:               toBool(row['EX  OFW']),
  isSoloParent:          toBool(row['SOLO PARENT']),
  isPersonWithDisability:toBool(row['PERSON WITH DISABILITY']),
  isSeniorCitizen:       toBool(row['SENIOR CITIZEN']),

  // ── Trainings & events attended ───────────────────────────────────────────
  kasambahayOrientation:      toBool(row['KASAMBAHAY ORIENTATION']),
  kasambahayOrganizing:       toBool(row['KASAMBAHAY ORGANIZING']),
  occupationalSafetyAndHealth:toBool(row['OCCUPATIONAL SAFETY AND HEALTH']),
  genderSensitivityTraining:  toBool(row['GENDER SENSITIVITY TRAINING']),
  basicFirstAidTraining:      toBool(row['BASIC FIRST AID TRAINING']),
  homeSecurityAwareness:      toBool(row['HOME SECURITY AWARENESS']),
  kasambahayGeneralAssembly:  toBool(row['KASAMBAHAY GENERAL ASSEMBLY']),
  kasambahayDay:              toBool(row['KASAMBAHAY DAY']),
  disasterPreparedness:       toBool(row['DESASTER PREPAREDNESS']), // typo kept from source

  // ── Gender & arrangement ───────────────────────────────────────────────────
  isFemale:  toBool(row['FEMALE']),
  isMale:    toBool(row['MALE']),
  isLiveIn:  toBool(row['LIVE IN']),
  isLiveOut: toBool(row['LIVE OUT']),
  isOnCall:  toBool(row['ON CALL']),

  // ── Job types ─────────────────────────────────────────────────────────────
  isGeneralHousehelp: toBool(row['GENERAL HOUSEHELP']),
  isCook:             toBool(row['cook']),           // lowercase 'c' in source
  isLaundryPerson:    toBool(row['LAUNDRY PERSON']),
  isYaya:             toBool(row['YAYA']),
  isGardener:         toBool(row['GARDENER']),

  // ── Additional fields ─────────────────────────────────────────────────────
  lengthOfService:          toStr(row['KASAMBAHAY LENGTH OF SERVICE']),
  isQcVoter:                toStr(row['QC VOTERS']),
  noOfFamilyVoters:         toStr(row['NO. FAMILY VOTERS']),
  noOfKasambahayInFamily:   toStr(row['NO. OF KASAMBAHAY IN YOUR FAMILY']),
  workOfEmployer:           toStr(row["WORK OF EMPLOYER'S"]),
  isKapsaMember:            toBool(row['KAPSA  Member']),
  isBcoopMember:            toBool(row['BCOOP Member']),

  // ── Sheet-derived metadata ─────────────────────────────────────────────────
  district,
  year,
})

// ─── MAIN SEEDER ─────────────────────────────────────────────────────────────

const seed = async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Kasambahay Seeder')
  if (DRY_RUN)    console.log('  MODE: DRY RUN — no DB writes')
  if (CLEAR_FIRST) console.log('  FLAG: --clear detected, will drop records first')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    // ── 1. Connect to MongoDB ────────────────────────────────────────────────
    if (!DRY_RUN) {
      await mongoose.connect(process.env.MONGO_URI)
      console.log('\n✔ Connected to MongoDB\n')
    }

    // ── 2. Optionally clear existing records ─────────────────────────────────
    if (CLEAR_FIRST && !DRY_RUN) {
      const deleted = await Kasambahay.deleteMany({})
      console.log(`🗑  Cleared ${deleted.deletedCount} existing records\n`)
    }

    // ── 3. Load workbook ─────────────────────────────────────────────────────
    const workbook = XLSX.readFile(EXCEL_FILE)
    const sheetNames = workbook.SheetNames

    console.log(`📂 Found ${sheetNames.length} sheet(s) in workbook\n`)

    // ── 4. Summary counters ───────────────────────────────────────────────────
    let totalInserted  = 0
    let totalSkippedSheets = 0
    let totalSkippedRows   = 0
    const sheetSummary = []

    // ── 5. Iterate all sheets ─────────────────────────────────────────────────
    for (const name of sheetNames) {
      const year     = getYear(name)
      const district = getDistrict(name)

      // Skip sheets that don't match expected format
      if (!year || !district) {
        console.log(`⏭  Skipping sheet: "${name}" (no valid year/district found)`)
        totalSkippedSheets++
        continue
      }

      console.log(`📄 Processing: "${name}" → ${district}, ${year}`)

      const sheet = workbook.Sheets[name]
      const rows  = XLSX.utils.sheet_to_json(sheet, {
        defval: null,   // use null for empty cells (not '')
        raw: true,      // keep raw values (numbers, dates as Excel serials)
      })

      if (rows.length === 0) {
        console.log(`   ⚠  No data rows found — skipping\n`)
        totalSkippedSheets++
        continue
      }

      // Map rows → records, filter out completely empty rows
      const records = rows
        .map(row => mapRow(row, district, year))
        .filter(rec => rec.lastName || rec.firstName || rec.registrationNo)
        // ↑ skip rows where all name/ID fields are empty (header repeats, totals, etc.)

      const skipped = rows.length - records.length
      if (skipped > 0) {
        console.log(`   ℹ  Skipped ${skipped} empty/invalid row(s)`)
        totalSkippedRows += skipped
      }

      if (DRY_RUN) {
        console.log(`   ✔ [DRY RUN] Would insert ${records.length} record(s)\n`)
        sheetSummary.push({ sheet: name, district, year, count: records.length, status: 'dry-run' })
        totalInserted += records.length
        continue
      }

      // Insert with ordered:false so one bad record doesn't block the rest
      try {
        const result = await Kasambahay.insertMany(records, { ordered: false })
        console.log(`   ✔ Inserted ${result.length} record(s)\n`)
        sheetSummary.push({ sheet: name, district, year, count: result.length, status: 'ok' })
        totalInserted += result.length
      } catch (err) {
        if (err.name === 'MongoBulkWriteError' || err.code === 11000) {
          const inserted = err.result?.insertedCount ?? 0
          const dupes    = records.length - inserted
          console.warn(`   ⚠  ${inserted} inserted, ${dupes} duplicate(s) skipped\n`)
          sheetSummary.push({ sheet: name, district, year, count: inserted, status: 'partial (dupes)' })
          totalInserted += inserted
        } else {
          // Unexpected error — log and continue with next sheet
          console.error(`   ✖ Insert failed for "${name}": ${err.message}\n`)
          sheetSummary.push({ sheet: name, district, year, count: 0, status: `error: ${err.message}` })
        }
      }
    }

    // ── 6. Final summary ──────────────────────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  SEEDING SUMMARY')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.table(sheetSummary)
    console.log(`\n  Sheets processed : ${sheetSummary.length}`)
    console.log(`  Sheets skipped   : ${totalSkippedSheets}`)
    console.log(`  Rows skipped     : ${totalSkippedRows}`)
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
