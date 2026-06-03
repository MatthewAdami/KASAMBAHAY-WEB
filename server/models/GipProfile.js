/**
 * GipProfile.js
 * -------------
 * Mongoose model for GIP (Government Internship Program) profiling records.
 * Mirrors the structure of the GIP Profiling Excel masterlist.
 */

const mongoose = require('mongoose')

const GipProfileSchema = new mongoose.Schema(
  {
    batch: {
      type: Number,
      required: true,
      index: true,
    },

    // ── Identity ──────────────────────────────────────────────────────────────
    name:  { type: String, trim: true, default: '' },
    age:   { type: Number, default: null },
    sex:   { type: String, trim: true, default: '' },

    // ── Contact ───────────────────────────────────────────────────────────────
    contact: { type: String, trim: true, default: '' },
    email:   { type: String, trim: true, lowercase: true, default: '' },

    // ── Location ──────────────────────────────────────────────────────────────
    district: { type: Number, default: null },
    barangay: { type: String, trim: true, default: '' },

    // ── Education ─────────────────────────────────────────────────────────────
    educationalAttainment: { type: String, trim: true, default: '' },
    courseProgram:         { type: String, trim: true, default: '' },

    // ── Skills (stored as array for easy querying) ────────────────────────────
    skills: [{ type: String, trim: true }],

    // ── Assignment / Recommendation ───────────────────────────────────────────
    assignedSpdOfficer: { type: String, trim: true, default: '' },
    recommendedBy:      { type: String, trim: true, default: '' },

    // ── Status ────────────────────────────────────────────────────────────────
    remarks:   { type: String,  trim: true, default: '' },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,           // adds createdAt / updatedAt
    collection: 'gip_profiles',
  }
)

// ── Indexes for common queries ────────────────────────────────────────────────
GipProfileSchema.index({ name: 'text', email: 'text' })
GipProfileSchema.index({ district: 1, batch: 1 })

module.exports = mongoose.model('GipProfile', GipProfileSchema)