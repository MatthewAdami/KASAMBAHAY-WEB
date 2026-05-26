const mongoose = require('mongoose')

const KasambahaySchema = new mongoose.Schema({
  registrationNo: { type: Number },
  dateRegistered: { type: Date },
  lastName: { type: String, trim: true },
  firstName: { type: String, trim: true },
  middleName: { type: String, trim: true },
  barangay: { type: String, trim: true },
  birthPlace: { type: String, trim: true },
  birthday: { type: Date },
  age: { type: Number },
  civilStatus: { type: String, trim: true },
  mobileNumber: { type: String, trim: true },

  // ── NEW: Religion & Emergency Contact ──────────────────────────────
  religion: { type: String, trim: true },
  emergencyContactName: { type: String, trim: true },
  emergencyContactNumber: { type: String, trim: true },

  // ── Current Residence (detailed breakdown + combined) ──────────────
  currentResidence: { type: String, trim: true },
  currentResidenceBlock: { type: String, trim: true },
  currentResidenceStreet: { type: String, trim: true },
  currentResidenceBarangay: { type: String, trim: true },
  currentResidenceDistrict: { type: String, trim: true },
  currentResidenceCity: { type: String, trim: true, default: 'Quezon City' },
  currentResidenceZip: { type: String, trim: true },

  // ── NEW: Provincial Address ────────────────────────────────────────
  provincialAddress: { type: String, trim: true },
  provincialAddressBlock: { type: String, trim: true },
  provincialAddressStreet: { type: String, trim: true },
  provincialAddressBarangay: { type: String, trim: true },
  provincialAddressDistrict: { type: String, trim: true },
  provincialAddressCity: { type: String, trim: true },
  provincialAddressZip: { type: String, trim: true },

  // ── Government IDs ─────────────────────────────────────────────────
  sss: { type: String, trim: true },
  pagIbig: { type: String, trim: true },
  philhealth: { type: String, trim: true },
  qcid: { type: String, trim: true },

  // ── Education ──────────────────────────────────────────────────────
  educationalAttainment: { type: String, trim: true },
  isCurrentlyStudying: { type: mongoose.Schema.Types.Mixed },   // 'yes' | 'no' | true | false
  gradeLevel: { type: String, trim: true },
  schoolName: { type: String, trim: true },
  reasonForStoppingSchool: { type: String, trim: true },
  wantsToStudy: { type: mongoose.Schema.Types.Mixed },           // 'yes' | 'no' | true | false

  // ── Employment ─────────────────────────────────────────────────────
  employerName: { type: String, trim: true },
  workOfEmployer: { type: String, trim: true },
  employerContactNumber: { type: String, trim: true },
  employerEmailAddress: { type: String, trim: true },
  employerEmail: { type: String, trim: true },
  employerAddress: { type: String, trim: true },
  employerAddressBlock: { type: String, trim: true },
  employerAddressStreet: { type: String, trim: true },
  employerAddressBarangay: { type: String, trim: true },
  employerAddressDistrict: { type: String, trim: true },
  employerAddressCity: { type: String, trim: true },
  employerAddressZip: { type: String, trim: true },
  monthlySalary: { type: Number },
  lengthOfService: { type: String },

  // ── Work Arrangement & Type ────────────────────────────────────────
  isLiveIn: { type: Boolean, default: false },
  isLiveOut: { type: Boolean, default: false },
  isOnCall: { type: Boolean, default: false },
  isGeneralHousehelp: { type: Boolean, default: false },
  isCook: { type: Boolean, default: false },
  isLaundryPerson: { type: Boolean, default: false },
  isYaya: { type: Boolean, default: false },
  isGardener: { type: Boolean, default: false },
  isOthers: { type: Boolean, default: false },
  othersSpecify: { type: String, trim: true },

  // ── Classification ─────────────────────────────────────────────────
  isFemale: { type: Boolean, default: false },
  isMale: { type: Boolean, default: false },
  isExOfw: { type: Boolean, default: false },
  isSoloParent: { type: Boolean, default: false },
  isPersonWithDisability: { type: Boolean, default: false },
  isSeniorCitizen: { type: Boolean, default: false },

  // ── Voter / Org Info ───────────────────────────────────────────────
  isQcVoter: { type: String },
  noOfFamilyVoters: { type: String },
  noOfKasambahayInFamily: { type: String },
  isKapsaMember: { type: Boolean, default: false },
  isBcoopMember: { type: Boolean, default: false },

  // ── NEW: Family Information ────────────────────────────────────────
  fatherLastName: { type: String, trim: true },
  fatherFirstName: { type: String, trim: true },
  fatherMiddleName: { type: String, trim: true },
  fatherContactNumber: { type: String, trim: true },

  motherLastName: { type: String, trim: true },
  motherFirstName: { type: String, trim: true },
  motherMiddleName: { type: String, trim: true },
  motherContactNumber: { type: String, trim: true },

  familyAddress: { type: String, trim: true },
  familyAddressBlock: { type: String, trim: true },
  familyAddressStreet: { type: String, trim: true },
  familyAddressBarangay: { type: String, trim: true },
  familyAddressDistrict: { type: String, trim: true },
  familyAddressCity: { type: String, trim: true },
  familyAddressZip: { type: String, trim: true },

  spouseLastName: { type: String, trim: true },
  spouseFirstName: { type: String, trim: true },
  spouseMiddleName: { type: String, trim: true },
  spouseContactNumber: { type: String, trim: true },
  spouseAddress: { type: String, trim: true },
  spouseAddressBlock: { type: String, trim: true },
  spouseAddressStreet: { type: String, trim: true },
  spouseAddressBarangay: { type: String, trim: true },
  spouseAddressDistrict: { type: String, trim: true },
  spouseAddressCity: { type: String, trim: true },
  spouseAddressZip: { type: String, trim: true },
  numberOfChildren: { type: Number },

  // ── NEW: Previous Employers ────────────────────────────────────────
  prevEmployer0Name: { type: String, trim: true },
  prevEmployer0Address: { type: String, trim: true },
  prevEmployer1Name: { type: String, trim: true },
  prevEmployer1Address: { type: String, trim: true },
  prevEmployer2Name: { type: String, trim: true },
  prevEmployer2Address: { type: String, trim: true },
  prevEmployer3Name: { type: String, trim: true },
  prevEmployer3Address: { type: String, trim: true },
  previousEmployers: { type: mongoose.Schema.Types.Mixed },

  // ── NEW: Skills ────────────────────────────────────────────────────
  skill0: { type: String, trim: true },
  skill1: { type: String, trim: true },
  skill2: { type: String, trim: true },
  skill3: { type: String, trim: true },
  skill4: { type: String, trim: true },
  skill5: { type: String, trim: true },
  skills: { type: mongoose.Schema.Types.Mixed },

  // ── NEW: Free-form Training Entries ───────────────────────────────
  trainingTitle0: { type: String, trim: true },
  trainingDate0: { type: String },
  trainingTitle1: { type: String, trim: true },
  trainingDate1: { type: String },
  trainingTitle2: { type: String, trim: true },
  trainingDate2: { type: String },
  trainingTitle3: { type: String, trim: true },
  trainingDate3: { type: String },
  training: { type: mongoose.Schema.Types.Mixed },

  // ── Program Trainings & Activities ────────────────────────────────
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
  qcCareOrientation: { type: Boolean, default: false },
  dateOfQcCareOrientation: { type: String },

  // ── Meta ───────────────────────────────────────────────────────────
  district: { type: String, default: 'District 1' },
  year: { type: Number, default: 2024 },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
}, { timestamps: true })

module.exports = mongoose.model('Kasambahay', KasambahaySchema)