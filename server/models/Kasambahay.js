const mongoose = require('mongoose')

const KasambahaySchema = new mongoose.Schema({
  registrationNo: { type: Number },
  dateRegistered: { type: Date },
  lastName: { type: String, trim: true },
  firstName: { type: String, trim: true },
  middleName: { type: String, trim: true },
  barangay: { type: String, trim: true },
  employerAddress: { type: String, trim: true },
  birthPlace: { type: String, trim: true },
  currentResidence: { type: String, trim: true },
  birthday: { type: Date },
  age: { type: Number },
  educationalAttainment: { type: String, trim: true },
  civilStatus: { type: String, trim: true },
  mobileNumber: { type: String, trim: true },
  sss: { type: String, trim: true },
  pagIbig: { type: String, trim: true },
  philhealth: { type: String, trim: true },
  qcid: { type: String, trim: true },
  monthlySalary: { type: Number },
  isExOfw: { type: Boolean, default: false },
  isSoloParent: { type: Boolean, default: false },
  isPersonWithDisability: { type: Boolean, default: false },
  isSeniorCitizen: { type: Boolean, default: false },

  // Programs attended
  kasambahayOrientation: { type: Boolean, default: false },
  dateOfOrientation: { type: String },
  kasambahayOrganizing: { type: Boolean, default: false },
  dateOfOrganizing: { type: String },
  occupationalSafetyAndHealth: { type: Boolean, default: false },
  dateOfOshTraining: { type: String },
  genderSensitivityTraining: { type: Boolean, default: false },
  dateOfGenderSensitivity: { type: String },
  basicFirstAidTraining: { type: Boolean, default: false },
  dateOfBasicFirstAid: { type: String },
  homeSecurityAwareness: { type: Boolean, default: false },
  dateOfHomeSecurity: { type: String },
  kasambahayGeneralAssembly: { type: Boolean, default: false },
  dateOfGenAssembly: { type: String },
  kasambahayDay: { type: Boolean, default: false },
  dateOfKasambahayDay: { type: String },
  disasterPreparedness: { type: Boolean, default: false },
  dateOfDisasterPreparedness: { type: String },

  // Classification
  isFemale: { type: Boolean, default: false },
  isMale: { type: Boolean, default: false },
  isLiveIn: { type: Boolean, default: false },
  isLiveOut: { type: Boolean, default: false },
  isOnCall: { type: Boolean, default: false },

  // Type of work
  isGeneralHousehelp: { type: Boolean, default: false },
  isCook: { type: Boolean, default: false },
  isLaundryPerson: { type: Boolean, default: false },
  isYaya: { type: Boolean, default: false },
  isGardener: { type: Boolean, default: false },

  // Additional info
  lengthOfService: { type: String },
  isQcVoter: { type: String },
  noOfFamilyVoters: { type: String },
  noOfKasambahayInFamily: { type: String },
  workOfEmployer: { type: String, trim: true },
  isKapsaMember: { type: Boolean, default: false },
  isBcoopMember: { type: Boolean, default: false },

  // Meta
  district: { type: String, default: 'District 1' },
  year: { type: Number, default: 2024 },
}, { timestamps: true })

module.exports = mongoose.model('Kasambahay', KasambahaySchema)