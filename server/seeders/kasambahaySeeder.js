const dns = require('dns')
dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '8.8.4.4'])

const mongoose = require('mongoose')
const path = require('path')
const XLSX = require('xlsx')
require('dotenv').config({ path: '../.env' })

const Kasambahay = require('../models/Kasambahay')

const toBool = (val) => {
  if (val === true || val === 1 || val === '1') return true
  return false
}

const toStr = (val) => {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

const toNum = (val) => {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

const toDate = (val) => {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d
}

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB')

const filePath = path.join(__dirname, '../Copy4 of  EDIT NEW KASAMBAHAY MASTERLIS  GIP.xlsx')    
const workbook = XLSX.readFile(filePath)
    const sheet = workbook.Sheets['2024 DISTRICT 1']
    const rows = XLSX.utils.sheet_to_json(sheet)

    await Kasambahay.deleteMany({ district: 'District 1', year: 2024 })
    console.log('🗑️  Cleared existing 2024 District 1 records')

    const records = rows.map(row => ({
      registrationNo: toNum(row['Unnamed: 0'] || row['__EMPTY']),
      dateRegistered: toDate(row['DATE REGISTERED']),
      lastName: toStr(row['LAST NAME']),
      firstName: toStr(row['FIRST NAME']),
      middleName: toStr(row['MIDDLE NAME']),
      barangay: toStr(row['BARANGAY']),
      employerAddress: toStr(row['EMPLOYER ADDRESS']),
      birthPlace: toStr(row['BIRTH PLACE']),
      currentResidence: toStr(row['CURRENT RESIDENCE']),
      birthday: toDate(row['BIRTHDAY']),
      age: toNum(row['AGE']),
      educationalAttainment: toStr(row['EDUCATIONAL INFORMATION']),
      civilStatus: toStr(row['CIVIL STATUS']),
      mobileNumber: toStr(row['MOBILE NUMBER']),
      sss: toStr(row['SSS']),
      pagIbig: toStr(row['PAG-IBIG FUND']),
      philhealth: toStr(row['PHILHEALTH']),
      qcid: toStr(row['QCID']),
      monthlySalary: toNum(row['MONTHLY SALARY']),
      isExOfw: toBool(row['EX  OFW']),
      isSoloParent: toBool(row['SOLO PARENT']),
      isPersonWithDisability: toBool(row['PERSON WITH DISABILITY']),
      isSeniorCitizen: toBool(row['SENIOR CITIZEN']),

      kasambahayOrientation: toBool(row['KASAMBAHAY ORIENTATION']),
      dateOfOrientation: toStr(row['DATE OF ORIENTATION']),
      kasambahayOrganizing: toBool(row['KASAMBAHAY ORGANIZING']),
      dateOfOrganizing: toStr(row['DATE OF ORGANIZING']),
      occupationalSafetyAndHealth: toBool(row['OCCUPATIONAL SAFETY AND HEALTH']),
      dateOfOshTraining: toStr(row['DATE OF OCCUPATIONAL SAFETY TRAINING']),
      genderSensitivityTraining: toBool(row['GENDER SENSITIVITY TRAINING']),
      dateOfGenderSensitivity: toStr(row['DATE OF GENDER SENSITIVITY']),
      basicFirstAidTraining: toBool(row['BASIC FIRST AID TRAINING']),
      dateOfBasicFirstAid: toStr(row['DATE OF BASIC FIRST AID']),
      homeSecurityAwareness: toBool(row['HOME SECURITY AWARENESS']),
      dateOfHomeSecurity: toStr(row['DATE OF HOME SECURITY AWARENESS']),
      kasambahayGeneralAssembly: toBool(row['KASAMBAHAY GENERAL ASSEMBLY']),
      dateOfGenAssembly: toStr(row['DATE OF K. GEN. ASSEMBLY']),
      kasambahayDay: toBool(row['KASAMBAHAY DAY']),
      dateOfKasambahayDay: toStr(row['DATE OF K. DAY']),
      disasterPreparedness: toBool(row['DESASTER PREPAREDNESS']),
      dateOfDisasterPreparedness: toStr(row['DATE OF D. PREPAREDNESS']),

      isFemale: toBool(row['FEMALE']),
      isMale: toBool(row['MALE']),
      isLiveIn: toBool(row['LIVE IN']),
      isLiveOut: toBool(row['LIVE OUT']),
      isOnCall: toBool(row['ON CALL']),

      isGeneralHousehelp: toBool(row['GENERAL HOUSEHELP']),
      isCook: toBool(row['cook']),
      isLaundryPerson: toBool(row['LAUNDRY PERSON']),
      isYaya: toBool(row['YAYA']),
      isGardener: toBool(row['GARDENER']),

      lengthOfService: toStr(row['KASAMBAHAY LENGTH OF SERVICE']),
      isQcVoter: toStr(row['QC VOTERS']),
      noOfFamilyVoters: toStr(row['NO. FAMILY VOTERS']),
      noOfKasambahayInFamily: toStr(row['NO. OF KASAMBAHAY IN YOUR FAMILY']),
      workOfEmployer: toStr(row["WORK OF EMPLOYER'S"]),
      isKapsaMember: toBool(row['KAPSA  Member']),
      isBcoopMember: toBool(row['BCOOP Member']),

      district: 'District 1',
      year: 2024,
    }))

    await Kasambahay.insertMany(records)
    console.log(`✅ Seeded ${records.length} records for 2024 District 1`)
    process.exit(0)
  } catch (err) {
    console.error('❌ Seeder error:', err.message)
    process.exit(1)
  }
}

seed()