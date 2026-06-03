/**
 * SpesProfile.js
 * --------------
 * Mongoose model for SPES (Special Program for Employment of Students)
 * profiling records.
 *
 * Covers two source sheet types:
 *   'manual'   → Simple batch sheet (Batch 1): name, age, sex, contact, district, etc.
 *   'lgu_form' → LGU Google Form export (Batch 2): full applicant profile with 82 fields.
 */

const mongoose = require('mongoose')

const SpesProfileSchema = new mongoose.Schema(
  {
    batch:  { type: Number, required: true, index: true },
    source: { type: String, enum: ['manual', 'lgu_form'], required: true },

    // ── Identity ──────────────────────────────────────────────────────────────
    fullName:   { type: String, trim: true, default: '' },
    lastName:   { type: String, trim: true, default: '' },
    firstName:  { type: String, trim: true, default: '' },
    middleName: { type: String, trim: true, default: '' },
    age:        { type: Number, default: null },
    sex:        { type: String, trim: true, default: '' },  // 'Male' | 'Female'
    birthday:   { type: Date,   default: null },
    birthPlace: { type: String, trim: true, default: '' },
    civilStatus:{ type: String, trim: true, default: '' },

    // ── Contact ───────────────────────────────────────────────────────────────
    contact: { type: String, trim: true, default: '' },
    email:   { type: String, trim: true, lowercase: true, default: '' },

    // ── Location ──────────────────────────────────────────────────────────────
    district:         { type: Number, default: null },
    barangay:         { type: String, trim: true, default: '' },
    presentAddress:   { type: String, trim: true, default: '' },
    permanentAddress: { type: String, trim: true, default: '' },

    // ── Education ─────────────────────────────────────────────────────────────
    educationalAttainment: { type: String, trim: true, default: '' },
    courseProgram:         { type: String, trim: true, default: '' },
    schoolTertiary:        { type: String, trim: true, default: '' },

    // ── Skills ────────────────────────────────────────────────────────────────
    skills:         [{ type: String, trim: true }],  // self-reported / uncertified
    skillsAcquired: [{ type: String, trim: true }],  // with training certificate

    // ── Family ────────────────────────────────────────────────────────────────
    fathersName: { type: String, trim: true, default: '' },
    mothersName: { type: String, trim: true, default: '' },

    // ── Special Flags ─────────────────────────────────────────────────────────
    isDisabled:     { type: Boolean, default: false },
    isSoloParent:   { type: Boolean, default: false },
    isOfwDependent: { type: Boolean, default: false },
    is4PsMember:    { type: Boolean, default: false },

    // ── Assignment / Recommendation (manual batch only) ───────────────────────
    recommendedBy:  { type: String, trim: true, default: '' },
    kasambahayType: { type: String, trim: true, default: '' },
    deskOfficer:    { type: String, trim: true, default: '' },

    // ── SPES History ──────────────────────────────────────────────────────────
    hasParticipatedInSpesBefore: { type: Boolean, default: false },
    spesIdNo:             { type: String, trim: true, default: '' },
    spesYearsOfAvailment: { type: String, trim: true, default: '' },

    // ── Employment Preferences (LGU form only) ────────────────────────────────
    preferredOccupation:     { type: String, trim: true, default: '' },
    preferredEmploymentType: { type: String, trim: true, default: '' },

    // ── Soft Delete ───────────────────────────────────────────────────────────
    isDeleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    collection: 'spes_profiles',
  }
)

// ── Indexes ───────────────────────────────────────────────────────────────────
SpesProfileSchema.index({ fullName: 'text', email: 'text' })
SpesProfileSchema.index({ batch: 1, source: 1 })
SpesProfileSchema.index({ district: 1, batch: 1 })

module.exports = mongoose.model('SpesProfile', SpesProfileSchema)