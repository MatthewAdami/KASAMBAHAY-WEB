/**
 * spesProfileSeeder.js
 * --------------------
 * Migration tool: reads ALL sheets from the SPES Profiling Excel file,
 * auto-detects batch/source from each sheet name, and bulk-inserts
 * records into MongoDB.
 *
 * Handles sheet name formats:
 *   ✅ 'Batch 1'                        → batch=1, source='manual'
 *   ✅ ' FROM SPES LGU B2_Pre-Registrat'→ batch=2, source='lgu_form'
 *   ⛔ 'Copy of ...'                    → blocked (draft copies)
 *   ⏭ 'SUMMARY', 'MASTERLIST'          → skipped (no batch info)
 *
 * Usage:
 *   node spesProfileSeeder.js             → seeds all sheets
 *   node spesProfileSeeder.js --dry-run   → parses & logs without writing to DB
 *   node spesProfileSeeder.js --clear     → drops existing records before seeding
 */

const dns = require('dns')
dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '8.8.4.4'])

const mongoose = require('mongoose')
const path     = require('path')
const XLSX     = require('xlsx')
require('dotenv').config({ path: '../.env' })

const SpesProfile = require('../models/SpesProfile')

// ─── CLI FLAGS ────────────────────────────────────────────────────────────────
const args        = process.argv.slice(2)
const DRY_RUN     = args.includes('--dry-run')
const CLEAR_FIRST = args.includes('--clear')

// ─── EXCEL FILE PATH ──────────────────────────────────────────────────────────
const EXCEL_FILE = path.join(__dirname, '../Copy of SPES - PROFILING.xlsx')

// ─── BLOCKED SHEETS ───────────────────────────────────────────────────────────
const SKIP_SHEETS = new Set([
  'SUMMARY',
  'MASTERLIST',
  'Copy of Batch 1',
])

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const toBool = (val) => {
  if (val === null || val === undefined) return false
  if (typeof val === 'boolean') return val
  const s = String(val).trim().toLowerCase()
  return ['1', 'true', 'yes', 'y', 'x'].includes(s)
}

const toStr = (val) => {
  if (val === null || val === undefined) return ''
  const s = String(val).trim()
  return (s.toLowerCase() === 'n/a' || s.toLowerCase() === 'na') ? '' : s
}

const toNum = (val) => {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

const toDate = (val) => {
  if (val === null || val === undefined || val === '') return null
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val
  if (typeof val === 'number') {
    const excelEpoch = new Date(1899, 11, 30)
    const d = new Date(excelEpoch.getTime() + val * 86400000)
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Normalises multi-line / dash-prefixed / comma-separated skills into a clean array.
 * Handles:
 *   "- Leadership\n- Teaching\n- Writing"   (newline + dash)
 *   "-Communication Skills   -Adaptability" (space+dash)
 *   "Fast learner, Creativity"              (comma-separated)
 */
const toSkillsArray = (val) => {
  if (!val) return []
  return String(val)
    .split(/\n/)  // split on newlines only — commas belong inside skill descriptions
    .map(s => s.replace(/^[-•\s]+/, '').trim())
    .filter(s => s && s.toLowerCase() !== 'n/a')
}

/** Normalises gender strings: 'FEMALE (BABAE)' → 'Female', 'MALE (LALAKE)' → 'Male' */
const toGender = (val) => {
  if (!val) return ''
  const s = String(val).toUpperCase()
  if (s.includes('FEMALE')) return 'Female'
  if (s.includes('MALE'))   return 'Male'
  return toStr(val)
}

// ─── SHEET NAME PARSERS ───────────────────────────────────────────────────────

/** Extracts batch number from sheet name. Returns integer or null. */
const getBatch = (sheetName) => {
  // e.g. 'Batch 1', 'BATCH 2', ' FROM SPES LGU B2_Pre-Registrat'
  const named = sheetName.match(/BATCH\s*(\d+)/i)
  if (named) return parseInt(named[1], 10)
  // Matches 'B2', 'B2_', 'B 2' etc. (LGU form sheets)
  const lgu = sheetName.match(/\bB\s*(\d+)/i)
  if (lgu) return parseInt(lgu[1], 10)
  return null
}

/**
 * Detects the sheet source type:
 *   'manual'   → simple batch sheet (Batch 1 format)
 *   'lgu_form' → LGU pre-registration form (82-column Google Form export)
 */
const getSource = (sheetName) => {
  const clean = sheetName.trim().toUpperCase()
  if (clean.includes('LGU') || clean.includes('PRE-REGISTRAT') || clean.includes('PRE_REGISTRAT')) {
    return 'lgu_form'
  }
  return 'manual'
}

// ─── COLUMN KEY RESOLVER ─────────────────────────────────────────────────────

/** Finds the first matching column key (case-insensitive, trimmed). */
const pick = (row, ...keys) => {
  for (const k of keys) {
    const found = Object.keys(row).find(
      rk => rk.trim().toLowerCase().startsWith(k.trim().toLowerCase())
    )
    if (found !== undefined && row[found] !== null && row[found] !== undefined) {
      return row[found]
    }
  }
  return null
}

// ─── ROW MAPPERS ─────────────────────────────────────────────────────────────

/**
 * Maps a row from the simple manual batch sheet (Batch 1 format).
 * Columns: NAME, AGE, SEX, CONTACT, EMAIL, DISTRICT, BARANGAY,
 *          EDUCATIONAL ATTAINMENT, COURSE/PROGRAM, SKILLS,
 *          RECCOMENDED BY, Unnamed: 11 (desk officer)
 */
const mapManualRow = (row, batch) => {
  const rawRecommended = toStr(pick(row, 'RECCOMENDED BY', 'RECOMMENDED BY'))

  // e.g. "Raquel Acebron( Mother) - General Kasambahay"
  // Split into recommendedBy and kasambahayType
  const recParts    = rawRecommended.split(/\s*-\s*(?=[A-Z])/)
  const recommendedBy   = toStr(recParts[0])
  const kasambahayType  = toStr(recParts[1] || '')

  const rawDeskOfficer = toStr(row['Unnamed: 11'] ?? pick(row, 'Unnamed: 11'))
  // e.g. "DESK OFFICER - Dhel Reyes"
  const deskOfficer = rawDeskOfficer.replace(/^DESK OFFICER\s*[-–]\s*/i, '').trim()

  return {
    batch,
    source: 'manual',

    // ── Identity ──────────────────────────────────────────────────────────────
    lastName:   '',
    firstName:  '',
    middleName: '',
    fullName:   toStr(pick(row, 'NAME', 'NAME ')),
    age:        toNum(pick(row, 'AGE', 'AGE ')),
    sex:        toStr(pick(row, 'SEX', 'SEX ')),
    birthday:   null,
    birthPlace: '',
    civilStatus: '',

    // ── Contact ───────────────────────────────────────────────────────────────
    contact: toStr(pick(row, 'CONTACT', 'CONTACT ')),
    email:   toStr(pick(row, 'EMAIL', 'EMAIL ')),

    // ── Location ──────────────────────────────────────────────────────────────
    district:        toNum(pick(row, 'DISTRICT', 'DISTRICT ')),
    barangay:        toStr(pick(row, 'BARANGAY', 'BARANGAY ')),
    presentAddress:  '',
    permanentAddress:'',

    // ── Education ─────────────────────────────────────────────────────────────
    educationalAttainment: toStr(pick(row, 'EDUCATIONAL ATTAINMENT')),
    courseProgram:         toStr(pick(row, 'COURSE/PROGRAM', 'COURSE/PROGRAM ')),
    schoolTertiary:        '',

    // ── Skills ────────────────────────────────────────────────────────────────
    skills:         toSkillsArray(pick(row, 'SKILLS')),
    skillsAcquired: [],

    // ── Family ────────────────────────────────────────────────────────────────
    fathersName: '',
    mothersName: '',

    // ── Flags ─────────────────────────────────────────────────────────────────
    isDisabled:    false,
    isSoloParent:  false,
    isOfwDependent: false,
    is4PsMember:   false,

    // ── Assignment ────────────────────────────────────────────────────────────
    recommendedBy,
    kasambahayType,
    deskOfficer,

    // ── SPES History ──────────────────────────────────────────────────────────
    hasParticipatedInSpesBefore: false,
    spesIdNo: '',
    spesYearsOfAvailment: '',

    // ── Employment Preferences ────────────────────────────────────────────────
    preferredOccupation:     '',
    preferredEmploymentType: '',
  }
}

/**
 * Maps a row from the LGU pre-registration form sheet (82-column format).
 * Sourced from Google Form export with full applicant details.
 */
const mapLguRow = (row, batch) => ({
  batch,
  source: 'lgu_form',

  // ── Identity ────────────────────────────────────────────────────────────────
  lastName:   toStr(pick(row, 'LASTNAME')),
  firstName:  toStr(pick(row, 'FIRSTNAME')),
  middleName: toStr(pick(row, 'MIDDLE NAME')),
  fullName:   [toStr(pick(row, 'FIRSTNAME')), toStr(pick(row, 'MIDDLE NAME')), toStr(pick(row, 'LASTNAME'))].filter(Boolean).join(' '),
  age:        null,
  sex:        toGender(pick(row, 'GENDER')),
  birthday:   toDate(pick(row, 'BDAY')),
  birthPlace: toStr(pick(row, 'BIRTHPLACE')),
  civilStatus: toStr(pick(row, 'CIVIL STATUS')),

  // ── Contact ──────────────────────────────────────────────────────────────────
  contact: toStr(pick(row, "APPLICANT'S CONTACT NUMBER")),
  email:   toStr(pick(row, "APPLICANT'S EMAIL ADDRESS")),

  // ── Location ─────────────────────────────────────────────────────────────────
  district:         null,   // not present in LGU form; parseable from address if needed
  barangay:         '',
  presentAddress:   toStr(pick(row, 'PRESENT ADDRESS')),
  permanentAddress: toStr(pick(row, 'PERMANENT ADDRESS')),

  // ── Education ────────────────────────────────────────────────────────────────
  educationalAttainment: toStr(pick(row, 'HIGHEST EDUCATIONAL ATTAINMENT')),
  courseProgram:         toStr(pick(row, 'SCHOOL AND COURSE IN TERTIARY')),
  schoolTertiary:        toStr(pick(row, 'SCHOOL AND COURSE IN TERTIARY')),

  // ── Skills ───────────────────────────────────────────────────────────────────
  skills:         toSkillsArray(pick(row, 'KINDLY ENUMERATE OTHER SKILLS ACQUIRED WITHOUT CERTIFICATE')),
  skillsAcquired: toSkillsArray(pick(row, 'SKILLS ACQUIRED')),

  // ── Family ───────────────────────────────────────────────────────────────────
  fathersName: toStr(pick(row, "FATHER'S NAME")),
  mothersName: toStr(pick(row, "MOTHER'S NAME")),

  // ── Flags ────────────────────────────────────────────────────────────────────
  isDisabled:     Boolean(toStr(pick(row, 'DISABILITY')).replace(/none/i, '')),
  isSoloParent:   toBool(pick(row, 'Are you a Solo Parent')),
  isOfwDependent: toBool(pick(row, 'Are you an OFW Dependent')),
  is4PsMember:    toBool(pick(row, 'Are you a 4Ps Member')),

  // ── Assignment ───────────────────────────────────────────────────────────────
  recommendedBy:   '',
  kasambahayType:  '',
  deskOfficer:     '',

  // ── SPES History ─────────────────────────────────────────────────────────────
  hasParticipatedInSpesBefore: toBool(pick(row, 'HAVE YOU PARTICIPATED IN SPES BEFORE')),
  spesIdNo:             toStr(pick(row, 'SPES ID No')),
  spesYearsOfAvailment: toStr(pick(row, "YEAR/S OF AVAILMENT")),

  // ── Employment Preferences ───────────────────────────────────────────────────
  preferredOccupation:     toStr(pick(row, 'PREFERRED OCCUPATION')),
  preferredEmploymentType: toStr(pick(row, 'PREFERRED TYPE OF EMPLOYMENT')),
})

// ─── PROCESS ONE SHEET ────────────────────────────────────────────────────────

const processSheet = async (workbook, name, batch, source, sheetSummary) => {
  console.log(`📄 Processing: "${name}" → Batch ${batch} [${source}]`)

  const sheet = workbook.Sheets[name]
  const rows  = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true })

  if (rows.length === 0) {
    console.log(`   ⚠  No data rows found — skipping\n`)
    sheetSummary.push({ sheet: name, batch, source, count: 0, status: 'empty' })
    return 0
  }

  const mapRow = source === 'lgu_form' ? mapLguRow : mapManualRow

  const records = rows
    .map(row => mapRow(row, batch))
    .filter(rec =>
      rec.fullName?.trim() ||
      rec.lastName?.trim() ||
      rec.email?.trim() ||
      rec.contact?.trim()
    )

  const skipped = rows.length - records.length
  if (skipped > 0) console.log(`   ℹ  Skipped ${skipped} empty/invalid row(s)`)

  if (DRY_RUN) {
    console.log(`   ✔ [DRY RUN] Would insert ${records.length} record(s)`)
    if (records.length > 0) {
      console.log('   Sample record:')
      console.dir(records[0], { depth: null })
    }
    console.log()
    sheetSummary.push({ sheet: name, batch, source, count: records.length, status: 'dry-run' })
    return records.length
  }

  try {
    const result = await SpesProfile.insertMany(records, { ordered: false })
    console.log(`   ✔ Inserted ${result.length} record(s)\n`)
    sheetSummary.push({ sheet: name, batch, source, count: result.length, status: 'ok' })
    return result.length
  } catch (err) {
    if (err.name === 'MongoBulkWriteError' || err.code === 11000) {
      const inserted = err.result?.insertedCount ?? 0
      const dupes    = records.length - inserted
      console.warn(`   ⚠  ${inserted} inserted, ${dupes} duplicate(s) skipped\n`)
      sheetSummary.push({ sheet: name, batch, source, count: inserted, status: 'partial (dupes)' })
      return inserted
    } else {
      console.error(`   ✖ Insert failed for "${name}": ${err.message}\n`)
      sheetSummary.push({ sheet: name, batch, source, count: 0, status: `error: ${err.message}` })
      return 0
    }
  }
}

// ─── MAIN SEEDER ─────────────────────────────────────────────────────────────

const seed = async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  SPES Profile Seeder  (smart sheet detection)')
  if (DRY_RUN)     console.log('  MODE: DRY RUN — no DB writes')
  if (CLEAR_FIRST) console.log('  FLAG: --clear detected, will drop records first')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    // ── 1. Connect to MongoDB ─────────────────────────────────────────────────
    if (!DRY_RUN) {
      await mongoose.connect(process.env.MONGO_URI)
      console.log('\n✔ Connected to MongoDB\n')
    }

    // ── 2. Optionally clear existing records ──────────────────────────────────
    if (CLEAR_FIRST && !DRY_RUN) {
      const deleted = await SpesProfile.deleteMany({})
      console.log(`🗑  Cleared ${deleted.deletedCount} existing records\n`)
    }

    // ── 3. Load workbook ──────────────────────────────────────────────────────
    const workbook   = XLSX.readFile(EXCEL_FILE)
    const sheetNames = workbook.SheetNames
    console.log(`📂 Found ${sheetNames.length} sheet(s) in workbook\n`)

    // ── 4. Counters ───────────────────────────────────────────────────────────
    let totalInserted      = 0
    let totalSkippedSheets = 0
    const sheetSummary     = []

    // ── 5. Iterate all sheets ─────────────────────────────────────────────────
    for (const name of sheetNames) {

      // ── Blocklist check ────────────────────────────────────────────────────
      if (SKIP_SHEETS.has(name.trim())) {
        console.log(`⛔ Blocked sheet: "${name}" (duplicate/copy — skipping)`)
        totalSkippedSheets++
        continue
      }

      const batch  = getBatch(name)
      const source = getSource(name)

      // ── Valid batch sheet ──────────────────────────────────────────────────
      if (batch !== null) {
        totalInserted += await processSheet(workbook, name, batch, source, sheetSummary)
        continue
      }

      // ── Cannot determine batch — skip ──────────────────────────────────────
      console.log(`⏭  Skipping sheet: "${name}" (no batch number detected)`)
      totalSkippedSheets++
    }

    // ── 6. Final summary ──────────────────────────────────────────────────────
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