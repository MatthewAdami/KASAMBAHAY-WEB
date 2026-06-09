/**
 * kasambahayDeleteSeeder.js
 * --------------------------
 * Safely deletes ALL Kasambahay records from MongoDB.
 *
 * ALWAYS run with --dry-run first to confirm count before deleting!
 *
 * Usage:
 *   node kasambahayDeleteSeeder.js              → dry-run by default (safe mode)
 *   node kasambahayDeleteSeeder.js --dry-run    → explicit dry-run, shows count only
 *   node kasambahayDeleteSeeder.js --confirm    → actually deletes all records
 */

const dns = require('dns')
dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '8.8.4.4'])

const mongoose = require('mongoose')
require('dotenv').config({ path: '../.env' })

const Kasambahay = require('../models/Kasambahay')

// ─── CLI FLAGS ────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2)
const CONFIRM = args.includes('--confirm')
const DRY_RUN = !CONFIRM  // default is always dry-run unless --confirm is passed

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const deleteAll = async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Kasambahay Delete Seeder')
  console.log(DRY_RUN
    ? '  MODE: DRY RUN ✅ — no records will be deleted'
    : '  MODE: LIVE DELETE ⚠️  — ALL records will be PERMANENTLY deleted'
  )
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    // ── 1. Connect ────────────────────────────────────────────────────────────
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✔ Connected to MongoDB\n')

    // ── 2. Count existing records ─────────────────────────────────────────────
    const totalCount = await Kasambahay.countDocuments({})
    console.log(`📊 Total Kasambahay records in database: ${totalCount.toLocaleString()}`)

    if (totalCount === 0) {
      console.log('\n⚠️  No records found — nothing to delete.\n')
      process.exit(0)
    }

    // ── 3. Breakdown by district & year (always shown, helpful for both modes) ─
    const breakdown = await Kasambahay.aggregate([
      {
        $group: {
          _id: { year: '$year', district: '$district' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.district': 1 } },
    ])

    console.log('\n📋 Breakdown by Year & District:')
    console.table(
      breakdown.map(b => ({
        Year:     b._id.year     ?? '(none)',
        District: b._id.district ?? '(none)',
        Count:    b.count,
      }))
    )

    // ── 4. Dry-run: stop here ─────────────────────────────────────────────────
    if (DRY_RUN) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`  DRY RUN COMPLETE`)
      console.log(`  ${totalCount.toLocaleString()} records would be deleted.`)
      console.log('')
      console.log('  To permanently delete, run:')
      console.log('  node kasambahayDeleteSeeder.js --confirm')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      process.exit(0)
    }

    // ── 5. Live delete ────────────────────────────────────────────────────────
    console.log('\n🗑  Deleting all records...')
    const result = await Kasambahay.deleteMany({})

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  DELETE COMPLETE ✅')
    console.log(`  Records deleted : ${result.deletedCount.toLocaleString()}`)
    console.log('  Database is now clean and ready for new data.')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    process.exit(0)
  } catch (err) {
    console.error('\n✖ Fatal error:', err.message)
    console.error(err.stack)
    process.exit(1)
  }
}

deleteAll()