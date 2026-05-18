/**
 * inspectSheets.js
 * ----------------
 * Peeks at the DISTRICT X sheets (no year in name) and checks
 * what year values or date patterns exist in the data rows.
 *
 * Usage:
 *   node inspectSheets.js
 */

const path = require('path')
const XLSX = require('xlsx')

const EXCEL_FILE = path.join(
  __dirname,
  '../Copy4 of  EDIT NEW KASAMBAHAY MASTERLIS  GIP.xlsx'
)

// The sheets we want to inspect
const TARGET_SHEETS = [
  'DISTRICT 1',
  'DISTRICT 2',
  'DISTRICT 3',
  'DISTRICT 4',
  'DISTRICT 5',
  'DISTRICT 6',
]

const workbook = XLSX.readFile(EXCEL_FILE)

for (const name of TARGET_SHEETS) {
  if (!workbook.SheetNames.includes(name)) {
    console.log(`⏭  Sheet "${name}" not found\n`)
    continue
  }

  const sheet = workbook.Sheets[name]
  const rows  = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true })

  console.log(`\n${'━'.repeat(60)}`)
  console.log(`  Sheet: "${name}"  —  ${rows.length} rows`)
  console.log('━'.repeat(60))

  // Print the column headers (keys of first row)
  if (rows.length > 0) {
    console.log('  Columns:', Object.keys(rows[0]).join(' | '))
  }

  // Print first 5 rows to see what's inside
  console.log('\n  First 5 rows:')
  rows.slice(0, 5).forEach((row, i) => {
    // Show only non-null values to keep output readable
    const clean = Object.fromEntries(
      Object.entries(row).filter(([, v]) => v !== null && v !== '')
    )
    console.log(`  [${i + 1}]`, JSON.stringify(clean, null, 0))
  })

  // Check if there's a year column or date registered column
  // that can tell us which year records belong to
  const yearCounts = {}
  for (const row of rows) {
    const dateVal = row['DATE REGISTERED'] || row['BIRTHDAY'] || null
    if (typeof dateVal === 'number') {
      // Excel serial → Date
      const d = new Date(new Date(1899, 11, 30).getTime() + dateVal * 86400000)
      const yr = d.getFullYear()
      if (yr >= 2000 && yr <= 2099) {
        yearCounts[yr] = (yearCounts[yr] || 0) + 1
      }
    } else if (typeof dateVal === 'string') {
      const d = new Date(dateVal)
      if (!isNaN(d)) {
        const yr = d.getFullYear()
        yearCounts[yr] = (yearCounts[yr] || 0) + 1
      }
    }
  }

  if (Object.keys(yearCounts).length > 0) {
    console.log('\n  Year distribution from DATE REGISTERED / BIRTHDAY:')
    Object.entries(yearCounts).sort().forEach(([yr, count]) => {
      console.log(`    ${yr}: ${count} rows`)
    })
  } else {
    console.log('\n  ⚠  Could not detect year from date columns')
  }

  console.log()
}