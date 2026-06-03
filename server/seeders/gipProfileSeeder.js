/**
 * gipProfileSeeder.js
 * -------------------
 * Migration tool: reads ALL sheets from the GIP Profiling Excel file,
 * auto-detects batch number from each sheet name, and bulk-inserts
 * records into MongoDB.
 *
 * Handles sheet name formats:
 *   ✅ 'BATCH 1'  → batch=1
 *   ✅ 'BATCH 2'  → batch=2
 *   ⛔ 'Copy of ...'           → blocked (draft copies)
 *   ⏭ 'SUMMARY', 'MASTERLIST' → skipped (no batch info)
 *
 * Usage:
 *   node gipProfileSeeder.js             → seeds all sheets
 *   node gipProfileSeeder.js --dry-run   → parses & logs without writing to DB
 *   node gipProfileSeeder.js --clear     → drops existing records before seeding
 */

const dns = require('dns')
dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '8.8.4.4'])

const mongoose = require('mongoose')
const path     = require('path')
const XLSX     = require('xlsx')
require('dotenv').config({ path: '../.env' })

const GipProfile = require('../models/GipProfile')

// ─── CLI FLAGS ────────────────────────────────────────────────────────────────
const args        = process.argv.slice(2)
const DRY_RUN     = args.includes('--dry-run')
const CLEAR_FIRST = args.includes('--clear')

// ─── EXCEL FILE PATH ──────────────────────────────────────────────────────────
// File lives in server/ (same folder as index.js), one level up from seeders/
const EXCEL_FILE = path.join(__dirname, '../Copy of GIP - PROFILING.xlsx')

// ─── BLOCKED SHEETS ───────────────────────────────────────────────────────────
// Excluded to prevent duplicate or irrelevant records
const SKIP_SHEETS = new Set([
  'Copy of BATCH 1',
  'Copy of BATCH 2',
  'SUMMARY',
  'MASTERLIST',
])

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/** Converts truthy Excel values (1, 'yes', 'x', 'true') to JS boolean. */
const toBool = (val) => {
  if (val === null || val === undefined) return false
  if (typeof val === 'boolean') return val
  return ['1', 'true', 'yes', 'y', 'x'].includes(String(val).trim().toLowerCase())
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
 * Normalises multi-line / dash-prefixed skills text into a clean array.
 * e.g. "-Communication Skills\n-Attention to Details" → ['Communication Skills', 'Attention to Details']
 */
const toSkillsArray = (val) => {
  if (!val) return []
  // Split on: newlines, commas, or whitespace followed by a dash (e.g. "   -Skill")
  return String(val)
    .split(/\n|,|(?=\s{2,}-)|(?<=\s)-/)
    .map(s => s.replace(/^[-\u2022\s]+/, '').trim())
    .filter(Boolean)
}

// ─── SHEET NAME PARSERS ───────────────────────────────────────────────────────

/**
 * Extracts batch number from a sheet name.
 * Matches: 'BATCH 1', 'BATCH 2', 'Batch 3', etc.
 * Returns integer batch number or null if not found.
 */
const getBatch = (sheetName) => {
  const match = sheetName.match(/BATCH\s*(\d+)/i)
  return match ? parseInt(match[1], 10) : null
}

// ─── COLUMN KEY ALIASES ───────────────────────────────────────────────────────
// Excel headers differ slightly between sheets (trailing spaces, renamed cols).
// These helpers resolve the correct value regardless of sheet variant.

const pick = (row, ...keys) => {
  for (const k of keys) {
    const found = Object.keys(row).find(
      rk => rk.trim().toLowerCase() === k.trim().toLowerCase()
    )
    if (found !== undefined && row[found] !== null && row[found] !== undefined) {
      return row[found]
    }
  }
  return null
}

// ─── ROW MAPPER ───────────────────────────────────────────────────────────────

const mapRow = (row, batch) => ({
  batch,

  // ── Identity ────────────────────────────────────────────────────────────────
  name:    toStr(pick(row, 'NAME', 'NAME ')),
  age:     toNum(pick(row, 'AGE', 'AGE ')),
  sex:     toStr(pick(row, 'SEX', 'SEX ')),

  // ── Contact ─────────────────────────────────────────────────────────────────
  contact: toStr(pick(row, 'CONTACT')),
  email:   toStr(pick(row, 'EMAIL')),

  // ── Location ────────────────────────────────────────────────────────────────
  district: toNum(pick(row, 'DISTRICT', 'DISTRICT ')),
  barangay: toStr(pick(row, 'BARANGAY')),

  // ── Education ───────────────────────────────────────────────────────────────
  educationalAttainment: toStr(pick(row, 'EDUCATIONAL ATTAINMENT', 'EDUCATIONAL ATTAINMENT ')),
  courseProgram:         toStr(pick(row, 'COURSE/PROGRAM')),

  // ── Skills (stored as array) ─────────────────────────────────────────────
  skills: toSkillsArray(pick(row, 'SKILLS')),

  // ── Assignment / Recommendation ─────────────────────────────────────────────
  assignedSpdOfficer: toStr(pick(row, 'ASSIGNED SPD OFFICER/STAFF')),
  recommendedBy:      toStr(
    pick(row,
      'RECOMMENDED BY:',
      'RECOMMENDED BY',
      'NAME OF KASAMBAHAY RECOMMENDED ;',
      'NAME OF KASAMBAHAY RECOMMENDED',
    )
  ),

  // ── Status ──────────────────────────────────────────────────────────────────
  remarks: toStr(pick(row, 'Remarks', 'REMARKS', 'Unnamed: 12')),
})

// ─── PROCESS ONE SHEET ────────────────────────────────────────────────────────

const processSheet = async (workbook, name, batch, sheetSummary) => {
  console.log(`📄 Processing: "${name}" → Batch ${batch}`)

  const sheet = workbook.Sheets[name]
  const rows  = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true })

  if (rows.length === 0) {
    console.log(`   ⚠  No data rows found — skipping\n`)
    sheetSummary.push({ sheet: name, batch, count: 0, status: 'empty' })
    return 0
  }

  const records = rows
    .map(row => mapRow(row, batch))
    .filter(rec => rec.name || rec.contact || rec.email)

  const skipped = rows.length - records.length
  if (skipped > 0) console.log(`   ℹ  Skipped ${skipped} empty/invalid row(s)`)

  if (DRY_RUN) {
    console.log(`   ✔ [DRY RUN] Would insert ${records.length} record(s)`)
    if (records.length > 0) {
      console.log('   Sample record:')
      console.dir(records[0], { depth: null })
    }
    console.log()
    sheetSummary.push({ sheet: name, batch, count: records.length, status: 'dry-run' })
    return records.length
  }

  try {
    const result = await GipProfile.insertMany(records, { ordered: false })
    console.log(`   ✔ Inserted ${result.length} record(s)\n`)
    sheetSummary.push({ sheet: name, batch, count: result.length, status: 'ok' })
    return result.length
  } catch (err) {
    if (err.name === 'MongoBulkWriteError' || err.code === 11000) {
      const inserted = err.result?.insertedCount ?? 0
      const dupes    = records.length - inserted
      console.warn(`   ⚠  ${inserted} inserted, ${dupes} duplicate(s) skipped\n`)
      sheetSummary.push({ sheet: name, batch, count: inserted, status: 'partial (dupes)' })
      return inserted
    } else {
      console.error(`   ✖ Insert failed for "${name}": ${err.message}\n`)
      sheetSummary.push({ sheet: name, batch, count: 0, status: `error: ${err.message}` })
      return 0
    }
  }
}

// ─── MAIN SEEDER ─────────────────────────────────────────────────────────────

const seed = async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  GIP Profile Seeder  (smart sheet detection)')
  if (DRY_RUN)     console.log('  MODE: DRY RUN — no DB writes')
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
      const deleted = await GipProfile.deleteMany({})
      console.log(`🗑  Cleared ${deleted.deletedCount} existing records\n`)
    }

    // ── 3. Load workbook ─────────────────────────────────────────────────────
    const workbook   = XLSX.readFile(EXCEL_FILE)
    const sheetNames = workbook.SheetNames
    console.log(`📂 Found ${sheetNames.length} sheet(s) in workbook\n`)

    // ── 4. Counters ───────────────────────────────────────────────────────────
    let totalInserted      = 0
    let totalSkippedSheets = 0
    const sheetSummary     = []

    // ── 5. Iterate all sheets ─────────────────────────────────────────────────
    for (const name of sheetNames) {

      // ── Blocklist check ───────────────────────────────────────────────────
      if (SKIP_SHEETS.has(name)) {
        console.log(`⛔ Blocked sheet: "${name}" (duplicate/copy — skipping)`)
        totalSkippedSheets++
        continue
      }

      const batch = getBatch(name)

      // ── Case 1: Valid BATCH sheet ─────────────────────────────────────────
      if (batch !== null) {
        totalInserted += await processSheet(workbook, name, batch, sheetSummary)
        continue
       }

      // ── Case 2: Cannot determine batch — skip ────────────────────────────
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