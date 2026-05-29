import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '../utils/api'
import * as XLSX from 'xlsx'

const YEARS     = [2024, 2025, 2026]
const DISTRICTS = [1, 2, 3, 4, 5, 6]
const LIMIT     = 100

// ─── Date fields that need .split('T')[0] normalization ──────────────────────
const DATE_FIELDS = [
  'dateRegistered','birthday',
  'dateOfOrientation','dateOfOrganizing','dateOfOshTraining','dateOfGenderSensitivity',
  'dateOfBasicFirstAid','dateOfHomeSecurity','dateOfGenAssembly','dateOfKasambahayDay',
  'dateOfDisasterPreparedness','dateOfQcCareOrientation',
  'trainingDate0','trainingDate1','trainingDate2','trainingDate3',
]

// ─── Column definitions ───────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: '#',                       label: '#',                      render: (k, i, page) => ((page - 1) * LIMIT) + i + 1, width: 50 },
  { key: 'registrationNo',          label: 'Reg. No.',               render: k => k.registrationNo || '—', width: 80 },
  { key: 'dateRegistered',          label: 'Date Registered',        render: k => k.dateRegistered ? new Date(k.dateRegistered).toLocaleDateString() : '—', width: 120 },
  { key: 'lastName',                label: 'Last Name',              render: k => k.lastName || '—', width: 130, bold: true },
  { key: 'firstName',               label: 'First Name',             render: k => k.firstName || '—', width: 130 },
  { key: 'middleName',              label: 'Middle Name',            render: k => k.middleName || '—', width: 130 },
  { key: 'barangay',                label: 'Barangay',               render: k => k.barangay || '—', width: 140 },
  { key: 'district',                label: 'District',               render: k => k.district || '—', width: 100, badge: () => 'purple' },
  { key: 'birthday',                label: 'Birthday',               render: k => k.birthday ? new Date(k.birthday).toLocaleDateString() : '—', width: 110 },
  { key: 'age',                     label: 'Age',                    render: k => k.age || '—', width: 60 },
  { key: 'birthPlace',              label: 'Birth Place',            render: k => k.birthPlace || '—', width: 140 },
  { key: 'civilStatus',             label: 'Civil Status',           render: k => k.civilStatus || '—', width: 110 },
  { key: 'gender',                  label: 'Gender',                 render: k => k.isFemale ? 'Female' : k.isMale ? 'Male' : '—', width: 80, badge: k => k.isFemale ? 'blue' : k.isMale ? 'gray' : null },
  { key: 'religion',                label: 'Religion',               render: k => k.religion || '—', width: 120 },
  { key: 'educationalAttainment',   label: 'Education',              render: k => k.educationalAttainment || '—', width: 180 },
  { key: 'currentResidence',        label: 'Current Residence',      render: k => k.currentResidence || '—', width: 170 },
  { key: 'provincialAddress',       label: 'Provincial Address',     render: k => k.provincialAddress || '—', width: 170 },
  { key: 'employerName',            label: 'Employer Name',          render: k => k.employerName || '—', width: 150 },
  { key: 'employerAddress',         label: 'Employer Address',       render: k => k.employerAddress || '—', width: 170 },
  { key: 'employerContactNumber',   label: 'Employer Contact',       render: k => k.employerContactNumber || '—', width: 140 },
  { key: 'employerEmailAddress',    label: 'Employer Email',         render: k => k.employerEmailAddress || '—', width: 160 },
  { key: 'monthlySalary',           label: 'Monthly Salary',         render: k => k.monthlySalary ? `₱${k.monthlySalary.toLocaleString()}` : '—', width: 120 },
  { key: 'mobileNumber',            label: 'Mobile No.',             render: k => k.mobileNumber || '—', width: 120 },
  { key: 'emergencyContactName',    label: 'Emergency Contact',      render: k => k.emergencyContactName || '—', width: 150 },
  { key: 'emergencyContactNumber',  label: 'Emergency No.',          render: k => k.emergencyContactNumber || '—', width: 130 },
  { key: 'type',                    label: 'Type',                   render: k => k.isGeneralHousehelp ? 'Househelp' : k.isCook ? 'Cook' : k.isLaundryPerson ? 'Laundry' : k.isYaya ? 'Yaya' : k.isGardener ? 'Gardener' : k.isOthers ? `Others${k.othersSpecify ? ` (${k.othersSpecify})` : ''}` : '—', width: 110 },
  { key: 'arrangement',             label: 'Arrangement',            render: k => k.isLiveIn ? 'Live-in' : k.isLiveOut ? 'Live-out' : k.isOnCall ? 'On-call' : '—', width: 110 },
  { key: 'lengthOfService',         label: 'Length of Service',      render: k => k.lengthOfService || '—', width: 140 },
  { key: 'sss',                     label: 'SSS',                    render: k => k.sss || '—', width: 120 },
  { key: 'pagIbig',                 label: 'Pag-IBIG',               render: k => k.pagIbig || '—', width: 120 },
  { key: 'philhealth',              label: 'PhilHealth',             render: k => k.philhealth || '—', width: 120 },
  { key: 'qcid',                    label: 'QCID',                   render: k => k.qcid || '—', width: 120 },
  { key: 'isExOfw',                 label: 'Ex-OFW',                 render: k => k.isExOfw ? '✓' : '—', width: 70,  center: true },
  { key: 'isSoloParent',            label: 'Solo Parent',            render: k => k.isSoloParent ? '✓' : '—', width: 90,  center: true },
  { key: 'isPersonWithDisability',  label: 'PWD',                    render: k => k.isPersonWithDisability ? '✓' : '—', width: 60,  center: true },
  { key: 'isSeniorCitizen',         label: 'Senior',                 render: k => k.isSeniorCitizen ? '✓' : '—', width: 70,  center: true },
  { key: 'workOfEmployer',          label: "Employer's Work",        render: k => k.workOfEmployer || '—', width: 140 },
  { key: 'isKapsaMember',           label: 'KAPSA',                  render: k => k.isKapsaMember ? '✓' : '—', width: 70,  center: true },
  { key: 'isBcoopMember',           label: 'BCOOP',                  render: k => k.isBcoopMember ? '✓' : '—', width: 70,  center: true },
  { key: 'kasambahayOrientation',   label: 'Orientation',            render: k => k.kasambahayOrientation ? '✓' : '—', width: 90,  center: true },
  { key: 'dateOfOrientation',       label: 'Orientation Date',       render: k => k.dateOfOrientation || '—', width: 120 },
  { key: 'kasambahayOrganizing',    label: 'Organizing',             render: k => k.kasambahayOrganizing ? '✓' : '—', width: 90,  center: true },
  { key: 'dateOfOrganizing',        label: 'Organizing Date',        render: k => k.dateOfOrganizing || '—', width: 120 },
  { key: 'occupationalSafetyAndHealth', label: 'OSH',                render: k => k.occupationalSafetyAndHealth ? '✓' : '—', width: 60,  center: true },
  { key: 'dateOfOshTraining',       label: 'OSH Date',               render: k => k.dateOfOshTraining || '—', width: 120 },
  { key: 'genderSensitivityTraining', label: 'GST',                  render: k => k.genderSensitivityTraining ? '✓' : '—', width: 60,  center: true },
  { key: 'dateOfGenderSensitivity', label: 'GST Date',               render: k => k.dateOfGenderSensitivity || '—', width: 120 },
  { key: 'basicFirstAidTraining',   label: 'First Aid',              render: k => k.basicFirstAidTraining ? '✓' : '—', width: 80,  center: true },
  { key: 'dateOfBasicFirstAid',     label: 'First Aid Date',         render: k => k.dateOfBasicFirstAid || '—', width: 120 },
  { key: 'homeSecurityAwareness',   label: 'Home Security',          render: k => k.homeSecurityAwareness ? '✓' : '—', width: 110, center: true },
  { key: 'dateOfHomeSecurity',      label: 'Home Security Date',     render: k => k.dateOfHomeSecurity || '—', width: 140 },
  { key: 'kasambahayGeneralAssembly', label: 'Gen. Assembly',        render: k => k.kasambahayGeneralAssembly ? '✓' : '—', width: 110, center: true },
  { key: 'dateOfGenAssembly',       label: 'Gen. Assembly Date',     render: k => k.dateOfGenAssembly || '—', width: 140 },
  { key: 'kasambahayDay',           label: 'K. Day',                 render: k => k.kasambahayDay ? '✓' : '—', width: 70,  center: true },
  { key: 'dateOfKasambahayDay',     label: 'K. Day Date',            render: k => k.dateOfKasambahayDay || '—', width: 120 },
  { key: 'disasterPreparedness',    label: 'Disaster Prep',          render: k => k.disasterPreparedness ? '✓' : '—', width: 100, center: true },
  { key: 'dateOfDisasterPreparedness', label: 'Disaster Prep Date',  render: k => k.dateOfDisasterPreparedness || '—', width: 140 },
  { key: 'qcCareOrientation',       label: 'QC Care Orientation',    render: k => k.qcCareOrientation ? '✓' : '—', width: 130, center: true },
  { key: 'dateOfQcCareOrientation', label: 'QC Care Orientation Date', render: k => k.dateOfQcCareOrientation || '—', width: 160 },
]

const BADGE_COLORS = {
  blue:   ['#dbeafe', '#1d4ed8'],
  gray:   ['#f0f0f0', '#555'],
  green:  ['#EAF3DE', '#3B6D11'],
  purple: ['#EEEDFE', '#534AB7'],
  amber:  ['#faeeda', '#854f0b'],
}

function Badge({ color, children }) {
  const [bg, fg] = BADGE_COLORS[color] || BADGE_COLORS.gray
  return (
    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: bg, color: fg, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

// ─── Official Form Design Styles ──────────────────────────────────────────────
const formStyles = {
  formWrapper: {
    fontFamily: "'Arial Narrow', Arial, sans-serif",
    background: '#fff',
    color: '#000',
    fontSize: 13,
  },
  officialHeader: {
    background: '#1a3a6b',
    color: '#fff',
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    borderBottom: '4px solid #c8a84b',
  },
  officialHeaderText: { flex: 1 },
  officialHeaderTitle: {
    fontSize: 16,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    margin: 0,
    lineHeight: 1.3,
  },
  officialHeaderSub: {
    fontSize: 13,
    fontWeight: 400,
    margin: '2px 0 0',
    opacity: 0.85,
  },
  sectionHeader: {
    background: '#2d5293',
    color: '#fff',
    padding: '7px 16px',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    margin: '0 0 0 0',
    borderTop: '1px solid #1a3a6b',
    borderBottom: '1px solid #1a3a6b',
  },
  sectionBody: {
    padding: '14px 16px',
    borderBottom: '1px solid #c8c8c8',
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#333',
    letterSpacing: '0.03em',
    display: 'block',
    marginBottom: 4,
  },
  fieldInput: {
    width: '100%',
    height: 34,
    padding: '0 8px',
    fontSize: 13,
    border: '1px solid #b0b0b0',
    borderRadius: 2,
    background: '#fafafa',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Arial Narrow', Arial, sans-serif",
  },
  fieldSelect: {
    width: '100%',
    height: 34,
    padding: '0 8px',
    fontSize: 13,
    border: '1px solid #b0b0b0',
    borderRadius: 2,
    background: '#fafafa',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'pointer',
    fontFamily: "'Arial Narrow', Arial, sans-serif",
  },
  fieldTextarea: {
    width: '100%',
    padding: '6px 8px',
    fontSize: 13,
    border: '1px solid #b0b0b0',
    borderRadius: 2,
    background: '#fafafa',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: "'Arial Narrow', Arial, sans-serif",
    minHeight: 60,
  },
  subLabel: {
    fontSize: 11,
    color: '#555',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #ddd',
    paddingBottom: 4,
    marginBottom: 10,
    marginTop: 14,
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    cursor: 'pointer',
    userSelect: 'none',
  },
  checkboxInput: {
    width: 14,
    height: 14,
    cursor: 'pointer',
    accentColor: '#1a3a6b',
  },
}

function FormField({ label, children, style }) {
  return (
    <div style={style}>
      <label style={formStyles.rowLabel}>{label}</label>
      {children}
    </div>
  )
}

// ─── Shared form fields ───────────────────────────────────────────────────────
function KasambahayForm({ formData, handleChange, handleGender, handleArrangement, formId, onSubmit }) {
  const barangayList = JSON.parse(localStorage.getItem('kasambahay_barangay_list')) || {}
  const districtKey = typeof formData.district === 'string' && formData.district.startsWith('District') ? formData.district : `District ${formData.district}`
  const districtBarangays = barangayList[districtKey] || []

  return (
    <form id={formId} onSubmit={onSubmit} style={formStyles.formWrapper}>

      {/* ── OFFICIAL HEADER ── */}
      <div style={formStyles.officialHeader}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#c8a84b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#1a3a6b' }}>K</div>
        </div>
        <div style={formStyles.officialHeaderText}>
          <p style={formStyles.officialHeaderTitle}>Quezon City Public Employment Service Office</p>
          <p style={formStyles.officialHeaderSub}>Kasambahay Registration Form</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#c8a84b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Reg. No.</div>
          <input type="number" name="registrationNo" value={formData.registrationNo} onChange={handleChange}
            style={{ ...formStyles.fieldInput, width: 110, background: '#fff', borderColor: '#c8a84b', textAlign: 'center', fontWeight: 700 }} />
        </div>
      </div>

      {/* Registration date strip */}
      <div style={{ background: '#eef2fa', borderBottom: '1px solid #c8c8c8', padding: '8px 16px', display: 'flex', gap: 24, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ ...formStyles.rowLabel, marginBottom: 0, minWidth: 100 }}>Date Registered:</label>
          <input type="date" name="dateRegistered" value={formData.dateRegistered} onChange={handleChange}
            style={{ ...formStyles.fieldInput, width: 160 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ ...formStyles.rowLabel, marginBottom: 0, minWidth: 40 }}>Year:</label>
          <input type="number" name="year" value={formData.year} onChange={handleChange}
            style={{ ...formStyles.fieldInput, width: 90 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ ...formStyles.rowLabel, marginBottom: 0, minWidth: 55 }}>District:</label>
          <select name="district" value={formData.district} onChange={handleChange} style={{ ...formStyles.fieldSelect, width: 130 }}>
            <option value="">Select</option>
            {[1,2,3,4,5,6].map(d => <option key={d} value={`District ${d}`}>District {d}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ ...formStyles.rowLabel, marginBottom: 0, minWidth: 60 }}>Barangay:</label>
          {districtBarangays.length > 0 ? (
            <select name="barangay" value={formData.barangay} onChange={handleChange} style={{ ...formStyles.fieldSelect, width: 180 }}>
              <option value="">Select Barangay</option>
              {districtBarangays.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          ) : (
            <input name="barangay" value={formData.barangay} onChange={handleChange} style={{ ...formStyles.fieldInput, width: 180 }} />
          )}
        </div>
      </div>

      {/* ══ SECTION 1 — PERSONAL ══ */}
      <div style={formStyles.sectionHeader}>Personal na Impormasyon ng Kasambahay</div>
      <div style={formStyles.sectionBody}>

        <div style={formStyles.subLabel}>Pangalan (Name)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 16px', marginBottom: 14 }}>
          <FormField label="Apelyido (Last Name) *">
            <input required name="lastName" value={formData.lastName} onChange={handleChange} style={formStyles.fieldInput} />
          </FormField>
          <FormField label="Pangalan (First Name) *">
            <input required name="firstName" value={formData.firstName} onChange={handleChange} style={formStyles.fieldInput} />
          </FormField>
          <FormField label="Gitnang Pangalan (Middle Name)">
            <input name="middleName" value={formData.middleName} onChange={handleChange} style={formStyles.fieldInput} />
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.6fr 1fr 1fr', gap: '10px 16px', marginBottom: 14, alignItems: 'end' }}>
          <FormField label="Petsa ng Kapanganakan (Birthday) (MM/DD/YYYY)">
            <input type="date" name="birthday" value={formData.birthday} onChange={handleChange} style={formStyles.fieldInput} />
          </FormField>
          <div>
            <label style={formStyles.rowLabel}>Kasarian (Gender)</label>
            <div style={{ display: 'flex', gap: 16, height: 34, alignItems: 'center', border: '1px solid #b0b0b0', borderRadius: 2, padding: '0 10px', background: '#fafafa' }}>
              <label style={formStyles.checkRow}><input type="radio" style={formStyles.checkboxInput} checked={!!formData.isMale} onChange={() => handleGender('male')} /> Lalake</label>
              <label style={formStyles.checkRow}><input type="radio" style={formStyles.checkboxInput} checked={!!formData.isFemale} onChange={() => handleGender('female')} /> Babae</label>
            </div>
          </div>
          <FormField label="Edad (Age)">
            <input type="number" name="age" value={formData.age} onChange={handleChange} style={formStyles.fieldInput} />
          </FormField>
          <FormField label="Katayuang Sibil (Civil Status)">
            <select name="civilStatus" value={formData.civilStatus} onChange={handleChange} style={formStyles.fieldSelect}>
              <option value="">Select</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Separated">Separated</option>
              <option value="Widowed">Widowed</option>
            </select>
          </FormField>
          <FormField label="Relihiyon (Religion)">
            <input name="religion" value={formData.religion} onChange={handleChange} style={formStyles.fieldInput} />
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 16px', marginBottom: 14 }}>
          <FormField label="Lugar ng Kapanganakan (Birth Place)">
            <input name="birthPlace" value={formData.birthPlace} onChange={handleChange} style={formStyles.fieldInput} />
          </FormField>
          <FormField label="Mobile Number">
            <input name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} style={formStyles.fieldInput} placeholder="09XX-XXX-XXXX" />
          </FormField>
          <div>
            <label style={formStyles.rowLabel}>In Case of Emergency: Contact</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} style={formStyles.fieldInput} placeholder="Name" />
              <input name="emergencyContactNumber" value={formData.emergencyContactNumber} onChange={handleChange} style={formStyles.fieldInput} placeholder="Number" />
            </div>
          </div>
        </div>

        <div style={formStyles.subLabel}>Kasalukuyang Tirahan (Current Residence)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '10px 16px', marginBottom: 8 }}>
          <FormField label="Block/Lot"><input name="currentResidenceBlock" value={formData.currentResidenceBlock} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Street"><input name="currentResidenceStreet" value={formData.currentResidenceStreet} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Barangay"><input name="currentResidenceBarangay" value={formData.currentResidenceBarangay} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 0.8fr', gap: '10px 16px', marginBottom: 14 }}>
          <FormField label="District">
            <select name="currentResidenceDistrict" value={formData.currentResidenceDistrict} onChange={handleChange} style={formStyles.fieldSelect}>
              <option value="">Select</option>
              <option value="N/A">N/A</option>
              {[1,2,3,4,5,6].map(d => <option key={d} value={`District ${d}`}>District {d}</option>)}
            </select>
          </FormField>
          <FormField label="City"><input name="currentResidenceCity" value={formData.currentResidenceCity || 'Quezon City'} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="ZIP Code"><input name="currentResidenceZip" value={formData.currentResidenceZip} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
        </div>
        <div style={{ marginBottom: 14 }}>
          <FormField label="Current Residence (Full Address)">
            <input name="currentResidence" value={formData.currentResidence} onChange={handleChange} style={formStyles.fieldInput} placeholder="Full address" />
          </FormField>
        </div>

        <div style={formStyles.subLabel}>Provincial Address</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '10px 16px', marginBottom: 8 }}>
          <FormField label="Block/Lot"><input name="provincialAddressBlock" value={formData.provincialAddressBlock} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Street"><input name="provincialAddressStreet" value={formData.provincialAddressStreet} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Barangay"><input name="provincialAddressBarangay" value={formData.provincialAddressBarangay} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 0.8fr', gap: '10px 16px', marginBottom: 14 }}>
          <FormField label="District">
            <select name="provincialAddressDistrict" value={formData.provincialAddressDistrict} onChange={handleChange} style={formStyles.fieldSelect}>
              <option value="">Select</option>
              <option value="N/A">N/A</option>
              {[1,2,3,4,5,6].map(d => <option key={d} value={`District ${d}`}>District {d}</option>)}
            </select>
          </FormField>
          <FormField label="City"><input name="provincialAddressCity" value={formData.provincialAddressCity} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="ZIP Code"><input name="provincialAddressZip" value={formData.provincialAddressZip} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
        </div>
        <div style={{ marginBottom: 14 }}>
          <FormField label="Provincial Address (Full)">
            <input name="provincialAddress" value={formData.provincialAddress} onChange={handleChange} style={formStyles.fieldInput} placeholder="Full provincial address" />
          </FormField>
        </div>

        <div style={formStyles.subLabel}>Government IDs</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px 16px', marginBottom: 14 }}>
          {[['sss','SSS No.'],['pagIbig','Pag-IBIG No.'],['philhealth','PhilHealth No.'],['qcid','QC ID No.']].map(([field, lbl]) => (
            <FormField key={field} label={lbl}>
              <input name={field} value={formData[field]} onChange={handleChange} style={formStyles.fieldInput} placeholder={lbl} />
            </FormField>
          ))}
        </div>

        <div style={{ background: '#eef2fa', border: '1px solid #b8c8e8', borderRadius: 4, padding: '10px 14px', marginBottom: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#1a3a6b', marginBottom: 10, letterSpacing: '0.05em' }}>
            Lagyan ng Check kung Ikaw ay Nabibilang sa mga Sektor
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[['isExOfw','Ex-OFW'],['isSoloParent','Solo Parent'],['isPersonWithDisability','Person with Disability'],['isSeniorCitizen','Senior Citizen']].map(([name, lbl]) => (
              <label key={name} style={formStyles.checkRow}>
                <input type="checkbox" style={formStyles.checkboxInput} name={name} checked={!!formData[name]} onChange={handleChange} />
                {lbl}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ══ SECTION 2 — TRABAHO ══ */}
      <div style={formStyles.sectionHeader}>Impormasyon Tungkol sa Trabaho ng Kasambahay</div>
      <div style={formStyles.sectionBody}>

        <div style={{ background: '#eef2fa', border: '1px solid #b8c8e8', borderRadius: 4, padding: '10px 14px', marginBottom: 14 }}>
          <label style={{ ...formStyles.rowLabel, color: '#1a3a6b', marginBottom: 8 }}>Trabaho (Type of Work)</label>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[['isGeneralHousehelp','General Housekeeper'],['isCook','Cook'],['isYaya','Yaya'],['isLaundryPerson','Laundry Person'],['isGardener','Gardener'],['isOthers','Others']].map(([name, lbl]) => (
              <label key={name} style={formStyles.checkRow}>
                <input type="checkbox" style={formStyles.checkboxInput} name={name} checked={!!formData[name]} onChange={handleChange} />
                {lbl}
              </label>
            ))}
            {formData.isOthers && (
              <input name="othersSpecify" value={formData.othersSpecify} onChange={handleChange} placeholder="Specify..." style={{ ...formStyles.fieldInput, width: 160, height: 28, fontSize: 12 }} />
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px 16px', marginBottom: 14 }}>
          <FormField label="Pangalan ng Pinaglilingkuran (Employer's Name)">
            <input name="employerName" value={formData.employerName} onChange={handleChange} style={formStyles.fieldInput} />
          </FormField>
          <FormField label="Hanapbuhay ng Pinaglilingkuran (Employer's Work)">
            <input name="workOfEmployer" value={formData.workOfEmployer} onChange={handleChange} style={formStyles.fieldInput} />
          </FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', marginBottom: 14 }}>
          <FormField label="Contact Number ng Employer">
            <input name="employerContactNumber" value={formData.employerContactNumber} onChange={handleChange} style={formStyles.fieldInput} />
          </FormField>
          <FormField label="Email Address ng Employer">
            <input type="email" name="employerEmailAddress" value={formData.employerEmailAddress} onChange={handleChange} style={formStyles.fieldInput} />
          </FormField>
        </div>

        <div style={formStyles.subLabel}>Tirahan ng Pinaglilingkuran (Employer's Address)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '10px 16px', marginBottom: 8 }}>
          <FormField label="Block/Lot"><input name="employerAddressBlock" value={formData.employerAddressBlock} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Street"><input name="employerAddressStreet" value={formData.employerAddressStreet} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Barangay"><input name="employerAddressBarangay" value={formData.employerAddressBarangay} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 0.8fr', gap: '10px 16px', marginBottom: 8 }}>
          <FormField label="District">
            <select name="employerAddressDistrict" value={formData.employerAddressDistrict} onChange={handleChange} style={formStyles.fieldSelect}>
              <option value="">Select</option>
              <option value="N/A">N/A</option>
              {[1,2,3,4,5,6].map(d => <option key={d} value={`District ${d}`}>District {d}</option>)}
            </select>
          </FormField>
          <FormField label="City"><input name="employerAddressCity" value={formData.employerAddressCity} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="ZIP Code"><input name="employerAddressZip" value={formData.employerAddressZip} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
        </div>
        <div style={{ marginBottom: 14 }}>
          <FormField label="Employer Address (Full)">
            <input name="employerAddress" value={formData.employerAddress} onChange={handleChange} style={formStyles.fieldInput} placeholder="Full address" />
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 16px', marginBottom: 14 }}>
          <FormField label="Bilang ng Taon sa Kasalukuyang Pinaglilingkuran (Length of Service)">
            <input name="lengthOfService" value={formData.lengthOfService} onChange={handleChange} style={formStyles.fieldInput} />
          </FormField>
          <FormField label="Sahod / Monthly Salary (PHP)">
            <input type="number" name="monthlySalary" value={formData.monthlySalary} onChange={handleChange} style={formStyles.fieldInput} />
          </FormField>
          <div>
            <label style={formStyles.rowLabel}>Work Arrangement</label>
            <div style={{ display: 'flex', gap: 14, height: 34, alignItems: 'center', border: '1px solid #b0b0b0', borderRadius: 2, padding: '0 10px', background: '#fafafa' }}>
              <label style={formStyles.checkRow}><input type="radio" style={formStyles.checkboxInput} checked={!!formData.isLiveOut} onChange={() => handleArrangement('liveOut')} /> Live-Out</label>
              <label style={formStyles.checkRow}><input type="radio" style={formStyles.checkboxInput} checked={!!formData.isLiveIn} onChange={() => handleArrangement('liveIn')} /> Live-In</label>
              <label style={formStyles.checkRow}><input type="radio" style={formStyles.checkboxInput} checked={!!formData.isOnCall} onChange={() => handleArrangement('onCall')} /> On-Call</label>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 0 }}>
          {[['isKapsaMember','KAPSA Member'],['isBcoopMember','BCOOP Member']].map(([name, lbl]) => (
            <label key={name} style={formStyles.checkRow}>
              <input type="checkbox" style={formStyles.checkboxInput} name={name} checked={!!formData[name]} onChange={handleChange} />
              {lbl}
            </label>
          ))}
        </div>
      </div>

      {/* ══ SECTION 3 — EDUKASYON ══ */}
      <div style={formStyles.sectionHeader}>Impormasyon Tungkol sa Edukasyon ng Kasambahay</div>
      <div style={formStyles.sectionBody}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px 16px', marginBottom: 14, alignItems: 'end' }}>
          <div>
            <label style={formStyles.rowLabel}>Kasalukuyan ka bang Nag-aaral Ngayon? (Currently Studying?)</label>
            <div style={{ display: 'flex', gap: 20, height: 34, alignItems: 'center', border: '1px solid #b0b0b0', borderRadius: 2, padding: '0 10px', background: '#fafafa' }}>
              <label style={formStyles.checkRow}><input type="radio" style={formStyles.checkboxInput} checked={formData.isCurrentlyStudying === true || formData.isCurrentlyStudying === 'yes'} onChange={() => handleChange({ target: { name: 'isCurrentlyStudying', value: true } })} /> Oo (Yes)</label>
              <label style={formStyles.checkRow}><input type="radio" style={formStyles.checkboxInput} checked={formData.isCurrentlyStudying === false || formData.isCurrentlyStudying === 'no'} onChange={() => handleChange({ target: { name: 'isCurrentlyStudying', value: false } })} /> Hindi (No)</label>
            </div>
          </div>
          <FormField label="Kung Hindi, Ano ang Iyong Dahilan sa Paghinto ng Pag-aaral?">
            <input name="reasonForStoppingSchool" value={formData.reasonForStoppingSchool} onChange={handleChange} style={formStyles.fieldInput} disabled={formData.isCurrentlyStudying === true || formData.isCurrentlyStudying === 'yes'} />
          </FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 16px', marginBottom: 14 }}>
          <FormField label="Baitang (Grade Level)">
            <input name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} style={formStyles.fieldInput} disabled={formData.isCurrentlyStudying === false || formData.isCurrentlyStudying === 'no'} />
          </FormField>
          <FormField label="Paaralan (School Name)">
            <input name="schoolName" value={formData.schoolName} onChange={handleChange} style={formStyles.fieldInput} disabled={formData.isCurrentlyStudying === false || formData.isCurrentlyStudying === 'no'} />
          </FormField>
          <FormField label="Antas ng Edukasyong Natapos (Educational Attainment)">
            <input name="educationalAttainment" value={formData.educationalAttainment} onChange={handleChange} style={formStyles.fieldInput} />
          </FormField>
        </div>
        <div>
          <label style={formStyles.rowLabel}>Kung Bibigyan ka ng Pagkakataon, Nais mo bang Magpatuloy sa Iyong Pag-aaral?</label>
          <div style={{ display: 'flex', gap: 20, height: 34, alignItems: 'center', border: '1px solid #b0b0b0', borderRadius: 2, padding: '0 10px', background: '#fafafa', width: 'fit-content' }}>
            <label style={formStyles.checkRow}><input type="radio" style={formStyles.checkboxInput} checked={formData.wantsToStudy === true || formData.wantsToStudy === 'yes'} onChange={() => handleChange({ target: { name: 'wantsToStudy', value: true } })} /> Oo (Yes)</label>
            <label style={formStyles.checkRow}><input type="radio" style={formStyles.checkboxInput} checked={formData.wantsToStudy === false || formData.wantsToStudy === 'no'} onChange={() => handleChange({ target: { name: 'wantsToStudy', value: false } })} /> Hindi (No)</label>
          </div>
        </div>
      </div>

      {/* ══ SECTION 4 — PAMILYA ══ */}
      <div style={formStyles.sectionHeader}>Impormasyon Tungkol sa Pamilya ng Kasambahay</div>
      <div style={formStyles.sectionBody}>

        <div style={formStyles.subLabel}>Pangalan ng Ama (Father's Name)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px 16px', marginBottom: 14 }}>
          <FormField label="Apelyido"><input name="fatherLastName" value={formData.fatherLastName} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Pangalan"><input name="fatherFirstName" value={formData.fatherFirstName} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Gitnang Pangalan"><input name="fatherMiddleName" value={formData.fatherMiddleName} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Contact Number"><input name="fatherContactNumber" value={formData.fatherContactNumber} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
        </div>

        <div style={formStyles.subLabel}>Pangalan ng Ina (Mother's Name)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px 16px', marginBottom: 14 }}>
          <FormField label="Apelyido"><input name="motherLastName" value={formData.motherLastName} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Pangalan"><input name="motherFirstName" value={formData.motherFirstName} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Gitnang Pangalan"><input name="motherMiddleName" value={formData.motherMiddleName} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Contact Number"><input name="motherContactNumber" value={formData.motherContactNumber} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
        </div>

        <div style={formStyles.subLabel}>Tirahan (Family Address)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '10px 16px', marginBottom: 8 }}>
          <FormField label="Block/Lot"><input name="familyAddressBlock" value={formData.familyAddressBlock} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Street"><input name="familyAddressStreet" value={formData.familyAddressStreet} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Barangay"><input name="familyAddressBarangay" value={formData.familyAddressBarangay} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 0.8fr', gap: '10px 16px', marginBottom: 14 }}>
          <FormField label="District">
            <select name="familyAddressDistrict" value={formData.familyAddressDistrict} onChange={handleChange} style={formStyles.fieldSelect}>
              <option value="">Select</option>
              <option value="N/A">N/A</option>
              {[1,2,3,4,5,6].map(d => <option key={d} value={`District ${d}`}>District {d}</option>)}
            </select>
          </FormField>
          <FormField label="City"><input name="familyAddressCity" value={formData.familyAddressCity} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="ZIP Code"><input name="familyAddressZip" value={formData.familyAddressZip} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
        </div>

        <div style={formStyles.subLabel}>Pangalan ng Asawa (Spouse's Name)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px 16px', marginBottom: 14 }}>
          <FormField label="Apelyido"><input name="spouseLastName" value={formData.spouseLastName} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Pangalan"><input name="spouseFirstName" value={formData.spouseFirstName} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Gitnang Pangalan"><input name="spouseMiddleName" value={formData.spouseMiddleName} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Contact Number"><input name="spouseContactNumber" value={formData.spouseContactNumber} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
        </div>

        <div style={formStyles.subLabel}>Tirahan ng Asawa (Spouse's Address)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '10px 16px', marginBottom: 8 }}>
          <FormField label="Block/Lot"><input name="spouseAddressBlock" value={formData.spouseAddressBlock} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Street"><input name="spouseAddressStreet" value={formData.spouseAddressStreet} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Barangay"><input name="spouseAddressBarangay" value={formData.spouseAddressBarangay} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 0.8fr 0.8fr', gap: '10px 16px', marginBottom: 0 }}>
          <FormField label="District">
            <select name="spouseAddressDistrict" value={formData.spouseAddressDistrict} onChange={handleChange} style={formStyles.fieldSelect}>
              <option value="">Select</option>
              <option value="N/A">N/A</option>
              {[1,2,3,4,5,6].map(d => <option key={d} value={`District ${d}`}>District {d}</option>)}
            </select>
          </FormField>
          <FormField label="City"><input name="spouseAddressCity" value={formData.spouseAddressCity} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="ZIP Code"><input name="spouseAddressZip" value={formData.spouseAddressZip} onChange={handleChange} style={formStyles.fieldInput} /></FormField>
          <FormField label="Bilang ng Anak (No. of Children)">
            <input type="number" name="numberOfChildren" value={formData.numberOfChildren} onChange={handleChange} style={formStyles.fieldInput} />
          </FormField>
        </div>
      </div>

      {/* ══ SECTION 5 — PREVIOUS EMPLOYERS ══ */}
      <div style={formStyles.sectionHeader}>Dating Pinaglilingkuran ng Kasambahay (Previous Employers)</div>
      <div style={formStyles.sectionBody}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 0', marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', paddingBottom: 4, borderBottom: '2px solid #1a3a6b' }}>Pangalan (Name)</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', paddingBottom: 4, borderBottom: '2px solid #1a3a6b', paddingLeft: 10 }}>Address / Contact</div>
        </div>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 0', borderBottom: '1px solid #e0e0e0' }}>
            <input name={`prevEmployer${i}Name`} value={formData[`prevEmployer${i}Name`] || ''} onChange={handleChange}
              style={{ ...formStyles.fieldInput, borderRadius: 0, borderLeft: 'none', borderRight: '1px solid #e0e0e0', borderTop: 'none', borderBottom: 'none', background: 'transparent' }} placeholder={`${i+1}.`} />
            <input name={`prevEmployer${i}Address`} value={formData[`prevEmployer${i}Address`] || ''} onChange={handleChange}
              style={{ ...formStyles.fieldInput, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none', borderBottom: 'none', background: 'transparent' }} />
          </div>
        ))}
      </div>

      {/* ══ SECTION 6 — SKILLS ══ */}
      <div style={formStyles.sectionHeader}>Impormasyon Tungkol sa Nakasanayan (Skills) ng Kasambahay</div>
      <div style={formStyles.sectionBody}>
        <p style={{ fontSize: 12, color: '#555', marginBottom: 10, marginTop: 0 }}>Ilista sa ibaba kung ano ang iyong kasanayan (hal. pananahi, pagluluto, etc)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          {[0,1,2,3,4,5].map(i => (
            <input key={i} name={`skill${i}`} value={formData[`skill${i}`] || ''} onChange={handleChange}
              style={{ ...formStyles.fieldInput, borderRadius: 0, borderBottom: i < 4 ? '1px solid #ddd' : '1px solid #b0b0b0', borderTop: i === 0 ? '1px solid #b0b0b0' : 'none', borderLeft: '1px solid #b0b0b0', borderRight: i % 2 === 0 ? '1px solid #ddd' : '1px solid #b0b0b0' }}
              placeholder={`${i+1}.`} />
          ))}
        </div>
      </div>

      {/* ══ SECTION 7 — TRAININGS ══ */}
      <div style={formStyles.sectionHeader}>Impormasyon Tungkol sa Pagsasanay (Training) ng Kasambahay</div>
      <div style={formStyles.sectionBody}>
        <p style={{ fontSize: 12, color: '#555', marginBottom: 10, marginTop: 0 }}>Ilista sa ibaba kung anu-ano ang mga pagsasanay na iyong dinaluhan</p>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 0, marginBottom: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', paddingBottom: 4, borderBottom: '2px solid #1a3a6b' }}>Titulo o Uri ng Pagsasanay (Title / Type of Training)</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.04em', paddingBottom: 4, borderBottom: '2px solid #1a3a6b', paddingLeft: 10 }}>Petsa ng Pagsasanay (Date)</div>
          </div>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 200px', borderBottom: '1px solid #e0e0e0' }}>
              <input name={`trainingTitle${i}`} value={formData[`trainingTitle${i}`] || ''} onChange={handleChange}
                style={{ ...formStyles.fieldInput, borderRadius: 0, border: 'none', background: 'transparent', borderRight: '1px solid #e0e0e0' }} placeholder={`${i+1}.`} />
              <input type="date" name={`trainingDate${i}`} value={formData[`trainingDate${i}`] || ''} onChange={handleChange}
                style={{ ...formStyles.fieldInput, borderRadius: 0, border: 'none', background: 'transparent' }} />
            </div>
          ))}
        </div>

        <div style={formStyles.subLabel}>Program Trainings & Activities</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {[
            { label: 'Kasambahay Orientation',   check: 'kasambahayOrientation',      date: 'dateOfOrientation' },
            { label: 'Kasambahay Organizing',     check: 'kasambahayOrganizing',        date: 'dateOfOrganizing' },
            { label: 'Occupational Safety & Health (OSH)', check: 'occupationalSafetyAndHealth', date: 'dateOfOshTraining' },
            { label: 'Gender Sensitivity Training (GST)',  check: 'genderSensitivityTraining',   date: 'dateOfGenderSensitivity' },
            { label: 'Basic First Aid Training',  check: 'basicFirstAidTraining',       date: 'dateOfBasicFirstAid' },
            { label: 'Home Security Awareness',   check: 'homeSecurityAwareness',       date: 'dateOfHomeSecurity' },
            { label: 'General Assembly',          check: 'kasambahayGeneralAssembly',   date: 'dateOfGenAssembly' },
            { label: 'Kasambahay Day (K. Day)',   check: 'kasambahayDay',               date: 'dateOfKasambahayDay' },
            { label: 'Disaster Preparedness',     check: 'disasterPreparedness',        date: 'dateOfDisasterPreparedness' },
            { label: 'QC Care Orientation',       check: 'qcCareOrientation',           date: 'dateOfQcCareOrientation' },
          ].map(t => (
            <div key={t.check} style={{ display: 'flex', alignItems: 'center', gap: 12, background: formData[t.check] ? '#eef8f0' : '#fafafa', border: `1px solid ${formData[t.check] ? '#b6e5c4' : '#e0e0e0'}`, borderRadius: 4, padding: '8px 12px' }}>
              <label style={{ ...formStyles.checkRow, flex: 1, minWidth: 0 }}>
                <input type="checkbox" style={formStyles.checkboxInput} name={t.check} checked={!!formData[t.check]} onChange={handleChange} />
                <span style={{ fontSize: 12, fontWeight: formData[t.check] ? 600 : 400 }}>{t.label}</span>
              </label>
              <input type="date" name={t.date} value={formData[t.date] || ''} onChange={handleChange}
                disabled={!formData[t.check]}
                style={{ ...formStyles.fieldInput, width: 140, fontSize: 12, background: formData[t.check] ? '#fff' : '#f0f0f0', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ padding: '14px 16px', background: '#f5f7fb', borderTop: '2px solid #1a3a6b', fontSize: 12, color: '#333', fontStyle: 'italic', lineHeight: 1.6 }}>
        Ako ay nagpapatunay na ang mga nakasaad na impormasyon sa dokumentong ito ay pawang katotohanan, tama at kumpleto sa abot ng aking kaalaman.
        Pinapatunayan ko na ang aking pirma ay tunay at orihinal at pahihintulutan ko ang paggamit, pagproseso at pagbabahagi ng aking personal na datos para sa anumang legal na layunin.
      </div>
    </form>
  )
}

// ─── Duplicate Warning Modal ──────────────────────────────────────────────────
function DuplicateWarningModal({ matches, onCancel, onSaveAnyway, isSaving }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 580, borderRadius: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>⚠️</div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#92400e' }}>Possible duplicate detected</h3>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#b45309' }}>
              {matches.length === 1 ? 'A record' : `${matches.length} records`} with the same name already exist{matches.length === 1 ? 's' : ''}.
            </p>
          </div>
        </div>
        <div style={{ padding: '20px 28px', maxHeight: 300, overflowY: 'auto' }}>
          {matches.map((m, i) => (
            <div key={m._id || i} style={{ border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', marginBottom: 10, background: '#fffdf0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111' }}>{m.lastName}, {m.firstName} {m.middleName || ''}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>{m.barangay || '—'} · {m.district} · {m.year}</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {m.district && <Badge color="purple">{m.district}</Badge>}
                  {m.year     && <Badge color="gray">{m.year}</Badge>}
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 16px', fontSize: 13, color: '#555' }}>
                <span>🎂 Birthday: <strong>{m.birthday ? new Date(m.birthday).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</strong></span>
                <span>🔢 Age: <strong>{m.age || '—'}</strong></span>
                <span>📱 Mobile: <strong>{m.mobileNumber || '—'}</strong></span>
                <span>💍 Civil Status: <strong>{m.civilStatus || '—'}</strong></span>
                <span>📋 Reg. No.: <strong>{m.registrationNo || '—'}</strong></span>
                <span>🏠 Barangay: <strong>{m.barangay || '—'}</strong></span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: '16px 28px', borderTop: '1px solid #f3f4f6', background: '#fafafa', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onCancel} style={{ height: 40, padding: '0 20px', background: '#fff', border: '1px solid #e4e4e7', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>← Go back and fix</button>
          <button onClick={onSaveAnyway} disabled={isSaving} style={{ height: 40, padding: '0 20px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 6, cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 500 }}>
            {isSaving ? 'Saving…' : 'Save anyway'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Shared duplicate check helper ───────────────────────────────────────────
async function checkDuplicate({ firstName, lastName, district, year, excludeId }) {
  const token = localStorage.getItem('token')
  const res = await fetch(`${API_ENDPOINTS.KASAMBAHAY}/check-duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ firstName, lastName, district, year, excludeId }),
  })
  return res.json()
}

// ─── Blank form defaults ──────────────────────────────────────────────────────
// NOTE: BLANK_FORM is a factory function, not a static object.
// This ensures localStorage is read fresh each time a modal opens,
// and prevents stale year/district values from persisting.
function makeBlankForm() {
  return {
    registrationNo: '', dateRegistered: '',
    firstName: '', middleName: '', lastName: '',
    year: parseInt(localStorage.getItem('kasambahay_active_year')) || new Date().getFullYear(),
    district: 'District 1', barangay: '',
    birthday: '', age: '', civilStatus: '', mobileNumber: '',
    birthPlace: '', religion: '',
    emergencyContactName: '', emergencyContactNumber: '',
    currentResidence: '', currentResidenceBlock: '', currentResidenceStreet: '',
    currentResidenceBarangay: '', currentResidenceDistrict: '', currentResidenceCity: 'Quezon City', currentResidenceZip: '',
    provincialAddress: '', provincialAddressBlock: '', provincialAddressStreet: '',
    provincialAddressBarangay: '', provincialAddressDistrict: '', provincialAddressCity: '', provincialAddressZip: '',
    educationalAttainment: '',
    isMale: false, isFemale: false,
    isCurrentlyStudying: '', gradeLevel: '', schoolName: '', reasonForStoppingSchool: '', wantsToStudy: '',
    employerName: '', workOfEmployer: '', employerContactNumber: '', employerEmailAddress: '',
    employerAddress: '', employerAddressBlock: '', employerAddressStreet: '', employerAddressBarangay: '',
    employerAddressDistrict: '', employerAddressCity: '', employerAddressZip: '',
    monthlySalary: '', lengthOfService: '',
    isLiveIn: false, isLiveOut: false, isOnCall: false,
    isGeneralHousehelp: false, isCook: false, isLaundryPerson: false, isYaya: false, isGardener: false,
    isOthers: false, othersSpecify: '',
    sss: '', pagIbig: '', philhealth: '', qcid: '',
    isExOfw: false, isSoloParent: false, isPersonWithDisability: false, isSeniorCitizen: false,
    isKapsaMember: false, isBcoopMember: false,
    fatherLastName: '', fatherFirstName: '', fatherMiddleName: '', fatherContactNumber: '',
    motherLastName: '', motherFirstName: '', motherMiddleName: '', motherContactNumber: '',
    familyAddressBlock: '', familyAddressStreet: '', familyAddressBarangay: '',
    familyAddressDistrict: '', familyAddressCity: '', familyAddressZip: '',
    spouseLastName: '', spouseFirstName: '', spouseMiddleName: '', spouseContactNumber: '',
    spouseAddressBlock: '', spouseAddressStreet: '', spouseAddressBarangay: '',
    spouseAddressDistrict: '', spouseAddressCity: '', spouseAddressZip: '',
    numberOfChildren: '',
    prevEmployer0Name: '', prevEmployer0Address: '',
    prevEmployer1Name: '', prevEmployer1Address: '',
    prevEmployer2Name: '', prevEmployer2Address: '',
    prevEmployer3Name: '', prevEmployer3Address: '',
    skill0: '', skill1: '', skill2: '', skill3: '', skill4: '', skill5: '',
    trainingTitle0: '', trainingDate0: '',
    trainingTitle1: '', trainingDate1: '',
    trainingTitle2: '', trainingDate2: '',
    trainingTitle3: '', trainingDate3: '',
    kasambahayOrientation: false, dateOfOrientation: '',
    kasambahayOrganizing: false, dateOfOrganizing: '',
    occupationalSafetyAndHealth: false, dateOfOshTraining: '',
    genderSensitivityTraining: false, dateOfGenderSensitivity: '',
    basicFirstAidTraining: false, dateOfBasicFirstAid: '',
    homeSecurityAwareness: false, dateOfHomeSecurity: '',
    kasambahayGeneralAssembly: false, dateOfGenAssembly: '',
    kasambahayDay: false, dateOfKasambahayDay: '',
    disasterPreparedness: false, dateOfDisasterPreparedness: '',
    qcCareOrientation: false, dateOfQcCareOrientation: '',
  }
}

// ─── Helper: build combined address from parts ────────────────────────────────
function buildAddr(payload, prefix) {
  return [
    payload[`${prefix}Block`],
    payload[`${prefix}Street`],
    payload[`${prefix}Barangay`],
    payload[`${prefix}District`],
    payload[`${prefix}City`],
    payload[`${prefix}Zip`],
  ].filter(Boolean).join(', ')
}

// ─── Helper: compile full addresses into payload ──────────────────────────────
function compileAddresses(payload) {
  if (!payload.currentResidence)  payload.currentResidence  = buildAddr(payload, 'currentResidence')
  if (!payload.provincialAddress) payload.provincialAddress = buildAddr(payload, 'provincialAddress')
  if (!payload.employerAddress)   payload.employerAddress   = buildAddr(payload, 'employerAddress')
  if (!payload.familyAddress)     payload.familyAddress     = buildAddr(payload, 'familyAddress')
  if (!payload.spouseAddress)     payload.spouseAddress     = buildAddr(payload, 'spouseAddress')
  return payload
}

// ─── Helper: Create test data for 2026 ────────────────────────────────────────
function create2026TestData() {
  return {
    ...makeBlankForm(),
    year: 2026,
    registrationNo: '2026-001',
    dateRegistered: '2026-01-15',
    lastName: 'Dela Cruz',
    firstName: 'Juana',
    middleName: 'Santos',
    district: 'District 1',
    barangay: 'Alicia',
    birthday: '1990-05-20',
    age: 36,
    civilStatus: 'Married',
    isFemale: true,
    religion: 'Roman Catholic',
    educationalAttainment: 'High School Graduate',
    currentResidence: '123 Sample St, Brgy. Alicia, District 1, Quezon City',
    mobileNumber: '09171234567',
    employerName: 'Maria Reyes',
    monthlySalary: 6000,
    isLiveIn: true,
    isGeneralHousehelp: true,
  }
}
// ─── Helper: Apply N/A to blank fields ────────────────────────────────────────
function applyNA(payload) {
  const numberFields = ['registrationNo', 'year', 'age', 'monthlySalary', 'numberOfChildren']
  for (const key in payload) {
    if (typeof payload[key] === 'string' && payload[key].trim() === '') {
      if (!DATE_FIELDS.includes(key) && !numberFields.includes(key)) {
        payload[key] = 'N/A'
      }
    }
  }
  return payload
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddKasambahayModal({ onClose, onSuccess }) {
  const [formData, setFormData]     = useState(() => makeBlankForm())
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [dupMatches, setDupMatches] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }
  const handleGender      = (g)   => setFormData(prev => ({ ...prev, isMale: g === 'male', isFemale: g === 'female' }))
  const handleArrangement = (arr) => setFormData(prev => ({ ...prev, isLiveIn: arr === 'liveIn', isLiveOut: arr === 'liveOut', isOnCall: arr === 'onCall' }))

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await checkDuplicate({
        firstName: formData.firstName,
        lastName: formData.lastName,
        district: String(formData.district),
        year: formData.year,
      })
      if (result.hasDuplicate) { setDupMatches(result.matches) } else { await saveRecord() }
    } catch { setError('Duplicate check failed. Please try again.') }
    finally { setLoading(false) }
  }

  const saveRecord = async () => {
    setLoading(true); setError('')
    try {
      const payload = compileAddresses({
        ...formData,
        district: String(formData.district),
      })
      applyNA(payload)

      const token = localStorage.getItem('token')
      const res   = await fetch(API_ENDPOINTS.KASAMBAHAY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed to save record.')
      onSuccess(formData.year, String(formData.district).replace('District ', ''))
    } catch (err) { setError(err.message); setDupMatches(null) }
    finally { setLoading(false) }
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: 900, borderRadius: 4, display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.3)', border: '2px solid #1a3a6b', marginTop: 10, marginBottom: 10 }}>
          <div style={{ padding: '14px 20px', background: '#1a3a6b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Add New Kasambahay</h3>
              <button type="button" onClick={() => setFormData(create2026TestData())}
                style={{ height: 28, padding: '0 12px', background: '#c8a84b', color: '#1a3a6b', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                Auto-fill (2026 Test Data)
              </button>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#fff', lineHeight: 1 }}>&times;</button>
          </div>
          {error && (
            <div style={{ background: '#fef2f2', color: '#ef4444', padding: '10px 16px', fontSize: 13, borderBottom: '1px solid #fecaca' }}>{error}</div>
          )}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: 'calc(100vh - 160px)' }}>
            <KasambahayForm formData={formData} handleChange={handleChange} handleGender={handleGender} handleArrangement={handleArrangement} formId="add-kasambahay-form" onSubmit={handleFormSubmit} />
          </div>
          <div style={{ padding: '14px 20px', borderTop: '2px solid #1a3a6b', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#eef2fa' }}>
            <button onClick={onClose} style={{ height: 38, padding: '0 20px', background: '#fff', border: '1px solid #b0b0b0', borderRadius: 3, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Cancel</button>
            <button type="submit" form="add-kasambahay-form" disabled={loading}
              style={{ height: 38, padding: '0 28px', background: loading ? '#ccc' : '#1a3a6b', color: '#fff', border: 'none', borderRadius: 3, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {loading ? 'Checking…' : 'Save Record'}
            </button>
          </div>
        </div>
      </div>
      {dupMatches && <DuplicateWarningModal matches={dupMatches} onCancel={() => setDupMatches(null)} onSaveAnyway={saveRecord} isSaving={loading} />}
    </>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditKasambahayModal({ item, onClose, onSuccess }) {
  // ✅ FIX: Initialize formData from item only (no BLANK_FORM merge that could
  // overwrite real DB values with empty strings). We use makeBlankForm() only
  // to get the full list of keys, then overwrite with item's actual values.
  const [formData, setFormData] = useState(() => {
    const blank = makeBlankForm()
    const data  = { ...blank }

    // Copy every field from item into data, normalizing nulls → ''
    for (const key in blank) {
      const val = item[key]
      if (val === null || val === undefined) {
        data[key] = blank[key] // keep blank default ('' / false)
      } else {
        data[key] = val
      }
    }

    // Normalize date fields to YYYY-MM-DD for <input type="date">
    DATE_FIELDS.forEach(f => {
      if (data[f]) data[f] = String(data[f]).split('T')[0]
    })

    // Normalize district to include "District " prefix for the select
    if (data.district && !String(data.district).startsWith('District')) {
      data.district = `District ${data.district}`
    }

    return data
  })

  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [confirmChanges, setConfirmChanges] = useState(null)
  const [dupMatches, setDupMatches]     = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }
  const handleGender      = (g)   => setFormData(prev => ({ ...prev, isMale: g === 'male', isFemale: g === 'female' }))
  const handleArrangement = (arr) => setFormData(prev => ({ ...prev, isLiveIn: arr === 'liveIn', isLiveOut: arr === 'liveOut', isOnCall: arr === 'onCall' }))

  // ✅ FIX: Diff against original item values (normalized the same way)
  // so we only detect actual user changes, not format differences.
  function getOriginalValue(key) {
    const val = item[key]
    if (val === null || val === undefined) return ''
    if (DATE_FIELDS.includes(key) && val) return String(val).split('T')[0]
    return val
  }

  const handleReview = async (e) => {
    e.preventDefault(); setError('')

    // Compile addresses before diffing
    const payload = compileAddresses({
      ...formData,
      district: String(formData.district),
    })
    applyNA(payload)

    // Compute diff against the original item
    const skip = ['_id', '__v', 'createdAt', 'updatedAt']
    const diff = []
    for (const key of Object.keys(payload)) {
      if (skip.includes(key)) continue
      const origVal = getOriginalValue(key)
      const newVal  = payload[key] === null || payload[key] === undefined ? '' : payload[key]
      if (String(newVal) !== String(origVal)) {
        diff.push({ field: key, old: origVal, new: newVal })
      }
    }

    if (diff.length === 0) { setError('No changes detected.'); return }

    // Sync compiled addresses back into state, but keep district with prefix for the form
    setFormData({ ...payload, district: formData.district })

    // Check duplicate if name changed
    const nameChanged = diff.some(d => ['firstName', 'lastName'].includes(d.field))
    if (nameChanged) {
      setLoading(true)
      try {
        const result = await checkDuplicate({
          firstName: payload.firstName,
          lastName: payload.lastName,
          district: String(payload.district),
          year: payload.year,
          excludeId: item._id,
        })
        if (result.hasDuplicate) { setDupMatches({ matches: result.matches, diff }); return }
      } catch { setError('Duplicate check failed.'); return }
      finally { setLoading(false) }
    }

    setConfirmChanges(diff)
  }

  const proceedFromDupWarning = () => { setConfirmChanges(dupMatches.diff); setDupMatches(null) }

  // ✅ FIX: Only send the fields that actually changed (diff keys) to avoid
  // overwriting untouched fields with empty strings on the backend.
  // The backend uses $set, so this is doubly safe.
  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      // Send the full formData so no fields get dropped.
      // Backend uses $set so only provided fields are updated.
      const payload = compileAddresses({
        ...formData,
        district: String(formData.district),
      })
      applyNA(payload)

      const token = localStorage.getItem('token')
      const res   = await fetch(`${API_ENDPOINTS.KASAMBAHAY}/${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed to update record.')
      onSuccess(formData.year, String(formData.district).replace('District ', ''))
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  if (confirmChanges) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: 520, borderRadius: 14, display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #e4e4e7', background: '#1a3a6b' }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#fff' }}>Review Changes</h3>
            <p style={{ margin: '5px 0 0', fontSize: 14, color: '#c8d8f0' }}>{confirmChanges.length} field{confirmChanges.length > 1 ? 's' : ''} changed</p>
          </div>
          <div style={{ padding: '20px 28px', maxHeight: '60vh', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingBottom: 10, borderBottom: '1px solid #eee', color: '#888', fontWeight: 500 }}>Field</th>
                  <th style={{ textAlign: 'left', paddingBottom: 10, borderBottom: '1px solid #eee', color: '#888', fontWeight: 500 }}>Previous</th>
                  <th style={{ textAlign: 'left', paddingBottom: 10, borderBottom: '1px solid #eee', color: '#888', fontWeight: 500 }}>New</th>
                </tr>
              </thead>
              <tbody>
                {confirmChanges.map(c => (
                  <tr key={c.field}>
                    <td style={{ padding: '9px 0', borderBottom: '1px solid #f9f9f9', fontWeight: 500, color: '#333' }}>{c.field}</td>
                    <td style={{ padding: '9px 0', borderBottom: '1px solid #f9f9f9', color: '#aaa', textDecoration: 'line-through', wordBreak: 'break-all' }}>{String(c.old) || '—'}</td>
                    <td style={{ padding: '9px 0', borderBottom: '1px solid #f9f9f9', color: '#16a34a', fontWeight: 500, wordBreak: 'break-all' }}>{String(c.new) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {error && <div style={{ marginTop: 16, color: '#ef4444', fontSize: 14 }}>{error}</div>}
          </div>
          <div style={{ padding: '18px 28px', borderTop: '1px solid #e4e4e7', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#eef2fa' }}>
            <button onClick={() => setConfirmChanges(null)} style={{ height: 38, padding: '0 20px', background: '#fff', border: '1px solid #b0b0b0', borderRadius: 3, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Back to Edit</button>
            <button onClick={handleSubmit} disabled={loading} style={{ height: 38, padding: '0 24px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase' }}>
              {loading ? 'Saving…' : 'Confirm & Save'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: 900, borderRadius: 4, display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.3)', border: '2px solid #1a3a6b', marginTop: 10, marginBottom: 10 }}>
          <div style={{ padding: '14px 20px', background: '#1a3a6b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Edit Kasambahay</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#fff', lineHeight: 1 }}>&times;</button>
          </div>
          {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '10px 16px', fontSize: 13, borderBottom: '1px solid #fecaca' }}>{error}</div>}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: 'calc(100vh - 160px)' }}>
            <KasambahayForm formData={formData} handleChange={handleChange} handleGender={handleGender} handleArrangement={handleArrangement} formId="edit-kasambahay-form" onSubmit={handleReview} />
          </div>
          <div style={{ padding: '14px 20px', borderTop: '2px solid #1a3a6b', display: 'flex', justifyContent: 'flex-end', gap: 10, background: '#eef2fa' }}>
            <button onClick={onClose} style={{ height: 38, padding: '0 20px', background: '#fff', border: '1px solid #b0b0b0', borderRadius: 3, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Cancel</button>
            <button type="submit" form="edit-kasambahay-form" disabled={loading}
              style={{ height: 38, padding: '0 28px', background: loading ? '#ccc' : '#1a3a6b', color: '#fff', border: 'none', borderRadius: 3, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {loading ? 'Checking…' : 'Review Changes'}
            </button>
          </div>
        </div>
      </div>
      {dupMatches && <DuplicateWarningModal matches={dupMatches.matches} onCancel={() => setDupMatches(null)} onSaveAnyway={proceedFromDupWarning} isSaving={loading} />}
    </>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({ items, isPermanent, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleDelete = async () => {
    setLoading(true); setError('')
    try {
      const token = localStorage.getItem('token')
      const promises = items.map(item => {
        const url   = `${API_ENDPOINTS.KASAMBAHAY}/${item._id}${isPermanent ? '/permanent' : ''}`
        return fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      })
      const results = await Promise.all(promises)
      const failed = results.filter(r => !r.ok)
      if (failed.length > 0) throw new Error(`Failed to delete ${failed.length} record(s).`)
      onSuccess()
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 420, borderRadius: 14, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #e4e4e7' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: isPermanent ? '#ef4444' : '#111', textTransform: 'capitalize' }}>
            {isPermanent ? 'Permanently Delete' : 'Delete'} {items.length === 1 ? 'Record' : 'Records'}
          </h3>
        </div>
        <div style={{ padding: '24px 28px' }}>
          {error && <div style={{ marginBottom: 16, color: '#ef4444', fontSize: 14 }}>{error}</div>}
          <p style={{ margin: '0 0 10px', fontSize: 15, color: '#333' }}>
            Are you sure you want to {isPermanent ? 'permanently delete' : 'delete'}{' '}
            {items.length === 1 ? <strong style={{ wordBreak: 'break-word' }}>{items[0].firstName} {items[0].lastName}</strong> : <strong>{items.length} records</strong>}?
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
            {isPermanent ? 'This action cannot be undone.' : 'This moves the records to deleted. Admins can restore them later.'}
          </p>
        </div>
        <div style={{ padding: '18px 28px', borderTop: '1px solid #e4e4e7', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ height: 40, padding: '0 20px', background: '#f4f4f5', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleDelete} disabled={loading} style={{ height: 40, padding: '0 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
            {loading ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── View Modal ───────────────────────────────────────────────────────────────
function ViewKasambahayModal({ item, onClose }) {
  const sh = { background: '#2d5293', color: '#fff', padding: '7px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', borderTop: '1px solid #1a3a6b', borderBottom: '1px solid #1a3a6b' }
  const field = (label, value) => (
    <div style={{ background: '#fafafa', padding: '10px 14px', borderRadius: 4, border: '1px solid #e0e0e0' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 14, color: '#111', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  )
  const check = (label, val) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
      <span style={{ fontSize: 16 }}>{val ? '✅' : '⬜'}</span> {label}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px 16px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 900, borderRadius: 4, display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,0,0,0.3)', border: '2px solid #1a3a6b', marginTop: 10, marginBottom: 10 }}>
        <div style={{ padding: '14px 20px', background: '#1a3a6b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {item.lastName}, {item.firstName} {item.middleName || ''}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#fff', lineHeight: 1 }}>&times;</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, maxHeight: 'calc(100vh - 160px)' }}>

          {/* ── Basic Info ── */}
          <div style={sh}>Personal na Impormasyon</div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {field('Reg. No.', item.registrationNo)}
              {field('Date Registered', item.dateRegistered ? new Date(item.dateRegistered).toLocaleDateString('en-PH') : '')}
              {field('Year', item.year)}
              {field('District', item.district)}
              {field('Barangay', item.barangay)}
              {field('Last Name', item.lastName)}
              {field('First Name', item.firstName)}
              {field('Middle Name', item.middleName)}
              {field('Birthday', item.birthday ? new Date(item.birthday).toLocaleDateString('en-PH') : '')}
              {field('Age', item.age)}
              {field('Gender', item.isFemale ? 'Female' : item.isMale ? 'Male' : '')}
              {field('Civil Status', item.civilStatus)}
              {field('Religion', item.religion)}
              {field('Birth Place', item.birthPlace)}
              {field('Mobile No.', item.mobileNumber)}
              {field('Emergency Contact', item.emergencyContactName)}
              {field('Emergency No.', item.emergencyContactNumber)}
            </div>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {field('Current Residence', item.currentResidence)}
              {field('Provincial Address', item.provincialAddress)}
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {check('Ex-OFW', item.isExOfw)}
              {check('Solo Parent', item.isSoloParent)}
              {check('PWD', item.isPersonWithDisability)}
              {check('Senior Citizen', item.isSeniorCitizen)}
            </div>
          </div>

          {/* ── Gov IDs ── */}
          <div style={sh}>Government IDs</div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {field('SSS No.', item.sss)}
              {field('Pag-IBIG No.', item.pagIbig)}
              {field('PhilHealth No.', item.philhealth)}
              {field('QC ID No.', item.qcid)}
            </div>
          </div>

          {/* ── Employment ── */}
          <div style={sh}>Impormasyon Tungkol sa Trabaho</div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
              {field('Employer Name', item.employerName)}
              {field("Employer's Work", item.workOfEmployer)}
              {field('Employer Contact', item.employerContactNumber)}
              {field('Employer Email', item.employerEmailAddress)}
              {field('Employer Address', item.employerAddress)}
              {field('Monthly Salary', item.monthlySalary ? `₱${Number(item.monthlySalary).toLocaleString()}` : '')}
              {field('Length of Service', item.lengthOfService)}
              {field('Arrangement', item.isLiveIn ? 'Live-in' : item.isLiveOut ? 'Live-out' : item.isOnCall ? 'On-call' : '')}
              {field('Type of Work', item.isGeneralHousehelp ? 'Househelp' : item.isCook ? 'Cook' : item.isLaundryPerson ? 'Laundry' : item.isYaya ? 'Yaya' : item.isGardener ? 'Gardener' : item.isOthers ? `Others${item.othersSpecify ? ` (${item.othersSpecify})` : ''}` : '')}
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {check('KAPSA Member', item.isKapsaMember)}
              {check('BCOOP Member', item.isBcoopMember)}
            </div>
          </div>

          {/* ── Education ── */}
          <div style={sh}>Impormasyon Tungkol sa Edukasyon</div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {field('Educational Attainment', item.educationalAttainment)}
              {field('Currently Studying?', item.isCurrentlyStudying === true || item.isCurrentlyStudying === 'yes' ? 'Yes' : item.isCurrentlyStudying === false || item.isCurrentlyStudying === 'no' ? 'No' : '')}
              {field('Grade Level', item.gradeLevel)}
              {field('School Name', item.schoolName)}
              {field('Reason for Stopping', item.reasonForStoppingSchool)}
              {field('Wants to Study?', item.wantsToStudy === true || item.wantsToStudy === 'yes' ? 'Yes' : item.wantsToStudy === false || item.wantsToStudy === 'no' ? 'No' : '')}
            </div>
          </div>

          {/* ── Family ── */}
          <div style={sh}>Impormasyon Tungkol sa Pamilya</div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e0e0e0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {field("Father's Name", [item.fatherFirstName, item.fatherMiddleName, item.fatherLastName].filter(Boolean).join(' '))}
              {field("Father's Contact", item.fatherContactNumber)}
              {field("Mother's Name", [item.motherFirstName, item.motherMiddleName, item.motherLastName].filter(Boolean).join(' '))}
              {field("Mother's Contact", item.motherContactNumber)}
              {field('Family Address', item.familyAddress || [item.familyAddressBlock, item.familyAddressStreet, item.familyAddressBarangay, item.familyAddressCity].filter(Boolean).join(', '))}
              {field("Spouse's Name", [item.spouseFirstName, item.spouseMiddleName, item.spouseLastName].filter(Boolean).join(' '))}
              {field("Spouse's Contact", item.spouseContactNumber)}
              {field('No. of Children', item.numberOfChildren)}
            </div>
          </div>

          {/* ── Previous Employers ── */}
          <div style={sh}>Dating Pinaglilingkuran (Previous Employers)</div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e0e0e0' }}>
            {[0,1,2,3].some(i => item[`prevEmployer${i}Name`] || item[`prevEmployer${i}Address`]) ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#eef2fa' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', borderBottom: '2px solid #1a3a6b' }}>#</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', borderBottom: '2px solid #1a3a6b' }}>Name</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', borderBottom: '2px solid #1a3a6b' }}>Address / Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {[0,1,2,3].map(i => (item[`prevEmployer${i}Name`] || item[`prevEmployer${i}Address`]) && (
                    <tr key={i} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={{ padding: '8px 12px', color: '#888' }}>{i+1}</td>
                      <td style={{ padding: '8px 12px' }}>{item[`prevEmployer${i}Name`] || '—'}</td>
                      <td style={{ padding: '8px 12px' }}>{item[`prevEmployer${i}Address`] || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p style={{ margin: 0, fontSize: 13, color: '#aaa' }}>No previous employers recorded.</p>}
          </div>

          {/* ── Skills ── */}
          <div style={sh}>Nakasanayan (Skills)</div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e0e0e0' }}>
            {[0,1,2,3,4,5].some(i => item[`skill${i}`]) ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {[0,1,2,3,4,5].filter(i => item[`skill${i}`]).map(i => (
                  <span key={i} style={{ background: '#eef2fa', border: '1px solid #b8c8e8', borderRadius: 20, padding: '4px 14px', fontSize: 13, color: '#1a3a6b', fontWeight: 500 }}>
                    {item[`skill${i}`]}
                  </span>
                ))}
              </div>
            ) : <p style={{ margin: 0, fontSize: 13, color: '#aaa' }}>No skills recorded.</p>}
          </div>

          {/* ── Trainings ── */}
          <div style={sh}>Pagsasanay (Training)</div>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e0e0e0' }}>
            {[0,1,2,3].some(i => item[`trainingTitle${i}`]) && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>Free-form Trainings</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#eef2fa' }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', borderBottom: '2px solid #1a3a6b' }}>Title / Type</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', borderBottom: '2px solid #1a3a6b', width: 160 }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[0,1,2,3].filter(i => item[`trainingTitle${i}`]).map(i => (
                      <tr key={i} style={{ borderBottom: '1px solid #e0e0e0' }}>
                        <td style={{ padding: '8px 12px' }}>{item[`trainingTitle${i}`]}</td>
                        <td style={{ padding: '8px 12px', color: '#666' }}>{item[`trainingDate${i}`] || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>Program Trainings & Activities</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {[
                { label: 'Kasambahay Orientation',   check: 'kasambahayOrientation',      date: 'dateOfOrientation' },
                { label: 'Kasambahay Organizing',     check: 'kasambahayOrganizing',        date: 'dateOfOrganizing' },
                { label: 'OSH Training',              check: 'occupationalSafetyAndHealth', date: 'dateOfOshTraining' },
                { label: 'Gender Sensitivity (GST)',  check: 'genderSensitivityTraining',   date: 'dateOfGenderSensitivity' },
                { label: 'Basic First Aid',           check: 'basicFirstAidTraining',       date: 'dateOfBasicFirstAid' },
                { label: 'Home Security Awareness',   check: 'homeSecurityAwareness',       date: 'dateOfHomeSecurity' },
                { label: 'General Assembly',          check: 'kasambahayGeneralAssembly',   date: 'dateOfGenAssembly' },
                { label: 'Kasambahay Day',            check: 'kasambahayDay',               date: 'dateOfKasambahayDay' },
                { label: 'Disaster Preparedness',     check: 'disasterPreparedness',        date: 'dateOfDisasterPreparedness' },
                { label: 'QC Care Orientation',       check: 'qcCareOrientation',           date: 'dateOfQcCareOrientation' },
              ].map(t => (
                <div key={t.check} style={{ display: 'flex', alignItems: 'center', gap: 10, background: item[t.check] ? '#eef8f0' : '#fafafa', border: `1px solid ${item[t.check] ? '#b6e5c4' : '#e0e0e0'}`, borderRadius: 4, padding: '8px 12px' }}>
                  <span style={{ fontSize: 16 }}>{item[t.check] ? '✅' : '⬜'}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: item[t.check] ? 600 : 400, color: item[t.check] ? '#1a6b3a' : '#555' }}>{t.label}</div>
                    {item[t.check] && item[t.date] && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{item[t.date]}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
        <div style={{ padding: '14px 20px', borderTop: '2px solid #1a3a6b', display: 'flex', justifyContent: 'flex-end', background: '#eef2fa' }}>
          <button onClick={onClose} style={{ height: 38, padding: '0 24px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'uppercase' }}>Close</button>
        </div>
      </div>
    </div>
  )
}

// ─── Import Confirmation & Progress Modal ──────────────────────────────────────
function ImportModal({ records, onClose, onSuccess }) {
  const [status, setStatus] = useState('confirm') // confirm, importing, done, error
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState({ successful: 0, failed: 0 })
  const [errorMsg, setErrorMsg] = useState('')

  const startImport = async () => {
    setStatus('importing')
    const token = localStorage.getItem('token')
    const CHUNK_SIZE = 50 // Reduced to 50 to stay well under the default 100kb server payload limit
    let successCount = 0
    let failCount = 0

    try {
      for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE)
        const res = await fetch(`${API_ENDPOINTS.KASAMBAHAY}/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ records: chunk }),
        })
        const json = await res.json()
        
        if (res.ok) {
          successCount += json.insertedCount || chunk.length
        } else if (res.status === 207) {
          successCount += json.insertedCount || 0
          failCount += (chunk.length - (json.insertedCount || 0))
        } else {
          throw new Error(json.message || 'Bulk import failed on the server.')
        }
        
        setProgress(Math.min(i + CHUNK_SIZE, records.length))
        setResults({ successful: successCount, failed: failCount })
      }
      setStatus('done')
    } catch (err) {
      setErrorMsg(err.message)
      setStatus('error')
    }
  }

  const pct = Math.round((progress / records.length) * 100)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 500, borderRadius: 8, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '16px 20px', background: '#1a3a6b', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bulk Import Data</h3>
          {status !== 'importing' && <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>&times;</button>}
        </div>
        
        <div style={{ padding: 24 }}>
          {status === 'confirm' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
                <h4 style={{ margin: '0 0 8px', fontSize: 18, color: '#111' }}>Ready to Import</h4>
                <p style={{ margin: 0, fontSize: 14, color: '#555' }}>Found <strong>{records.length.toLocaleString()}</strong> valid records in the Excel file.</p>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={onClose} style={{ height: 40, padding: '0 24px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#333' }}>Cancel</button>
                <button onClick={startImport} style={{ height: 40, padding: '0 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>Start Import</button>
              </div>
            </>
          )}
          {status === 'importing' && (
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 16px', fontSize: 16, color: '#111' }}>Importing Records...</h4>
              <div style={{ background: '#e4e4e7', height: 16, borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}><div style={{ background: '#1a3a6b', height: '100%', width: `${pct}%`, transition: 'width 0.3s' }} /></div>
              <p style={{ margin: 0, fontSize: 14, color: '#555' }}>Processing {progress.toLocaleString()} of {records.length.toLocaleString()} ({pct}%)</p>
            </div>
          )}
          {status === 'done' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
              <h4 style={{ margin: '0 0 12px', fontSize: 18, color: '#111' }}>Import Complete!</h4>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 16px', borderRadius: 8 }}><div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>{results.successful.toLocaleString()}</div><div style={{ fontSize: 12, color: '#15803d', textTransform: 'uppercase' }}>Inserted</div></div>
                {results.failed > 0 && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 16px', borderRadius: 8 }}><div style={{ fontSize: 20, fontWeight: 700, color: '#dc2626' }}>{results.failed.toLocaleString()}</div><div style={{ fontSize: 12, color: '#b91c1c', textTransform: 'uppercase' }}>Skipped (Dupes)</div></div>}
              </div>
              <button onClick={() => { onClose(); onSuccess() }} style={{ height: 40, padding: '0 24px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>Finish & Refresh</button>
            </div>
          )}
          {status === 'error' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>❌</div>
              <h4 style={{ margin: '0 0 12px', fontSize: 18, color: '#dc2626' }}>Import Failed</h4>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: '#555', background: '#fef2f2', padding: 10, borderRadius: 6, border: '1px solid #fecaca' }}>{errorMsg}</p>
              <button onClick={onClose} style={{ height: 40, padding: '0 24px', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#333' }}>Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
function KasambahayData() {
  const [year, setYear]               = useState('')
  const [district, setDistrict]       = useState('')
  const [category, setCategory]       = useState('')
  const [data, setData]               = useState([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [searched, setSearched]       = useState(true)
  const [search, setSearch]           = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [pagination, setPagination]   = useState(null)
  const [page, setPage]               = useState(1)
  const [showAddModal, setShowAddModal]               = useState(false)
  const [editItem, setEditItem]                       = useState(null)
  const [viewItem, setViewItem]                       = useState(null)
  const [checkedItems, setCheckedItems]               = useState([])
  const [viewDeleted, setViewDeleted]                 = useState(false)
  const [deleteItems, setDeleteItems]                 = useState(null)
  const [permanentDeleteItems, setPermanentDeleteItems] = useState(null)
  const [sortKey, setSortKey]   = useState(null)
  const [sortDir, setSortDir]   = useState('asc')
  const [importRecords, setImportRecords]             = useState(null)
  const navigate = useNavigate()
  const importInputRef = useRef(null)

  const user    = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdmin = user.role === 'Admin'

  const fetchData = useCallback(async (pageNum = 1, searchVal = '', overrideYear = null, overrideDistrict = null, overrideDeleted = null) => {
    const targetYear     = overrideYear     !== null ? overrideYear     : year
    const targetDistrict = overrideDistrict !== null ? overrideDistrict : district
    const targetDeleted  = overrideDeleted  !== null ? overrideDeleted  : viewDeleted
    try {
      setLoading(true); setError('')
      const token  = localStorage.getItem('token')
      const params = new URLSearchParams({
        page: pageNum, limit: LIMIT, isDeleted: targetDeleted,
        ...(targetYear     ? { year: targetYear }         : {}),
        ...(targetDistrict ? { district: targetDistrict } : {}),
        ...(searchVal      ? { search: searchVal }        : {}),
      })
      const res  = await fetch(`${API_ENDPOINTS.KASAMBAHAY}?${params}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) { setError(json.message); return }
      setData(json.data); setPagination(json.pagination); setCheckedItems([]); setSearched(true); setPage(pageNum)
    } catch { setError('Failed to fetch data.') }
    finally { setLoading(false) }
  }, [year, district, viewDeleted])

  useEffect(() => { fetchData(1, '') }, [])

  const handleImportClick = () => {
    if (importInputRef.current) {
      importInputRef.current.click()
    }
  }

  const handleFileImport = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setLoading(true)
    setError('')

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)

      let recordsToImport = []
      let contextYear = null

      // Seeder regex helpers
      const getYear = (name) => { const m = name.match(/\b(20\d{2})\b/); return m ? parseInt(m[1], 10) : null }
      const getDistrict = (name) => { const m = name.match(/DIST(?:RICT)?\.?\s*([1-6])/i); return m ? `District ${m[1]}` : null }
      const isYearOnlySheet = (name) => /^\s*(20\d{2})\s*$/.test(name)

      for (const sheetName of workbook.SheetNames) {
        if (sheetName.startsWith('Copy of') || sheetName === 'MASTERLIST') continue

        const sheetYear = getYear(sheetName)
        const sheetDistrict = getDistrict(sheetName)
        let currentYear = null
        let currentDistrict = null

        if (sheetYear && sheetDistrict) {
          contextYear = sheetYear; currentYear = sheetYear; currentDistrict = sheetDistrict
        } else if (isYearOnlySheet(sheetName)) {
          contextYear = getYear(sheetName); continue
        } else if (!sheetYear && sheetDistrict && contextYear) {
          currentYear = contextYear; currentDistrict = sheetDistrict
        }

        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null, raw: false })
        if (rows.length === 0) continue

        const sheetRecords = rows.map(row => {
          // Normalize keys to uppercase and trim spaces to avoid mismatch errors
          const normRow = {}
        for (const key in row) {
          normRow[key.trim().toUpperCase()] = row[key]
        }

        const getVal = (...keys) => {
          for (const k of keys) {
            if (normRow[k] !== undefined && normRow[k] !== null && normRow[k] !== '') return normRow[k]
          }
          return ''
        }

        const isTruthy = (val) => {
          if (typeof val === 'boolean') return val
          return ['1', 'true', 'yes', 'y', 'x'].includes(String(val).trim().toLowerCase())
        }

        const toDateStr = (val) => {
          if (val === null || val === undefined || val === '') return ''
          if (typeof val === 'number') {
            const excelEpoch = new Date(1899, 11, 30)
            const date = new Date(excelEpoch.getTime() + val * 86400000)
            return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0]
          }
          const d = new Date(val)
          return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]
        }

        const nature = String(getVal('NATURE OF WORK')).toLowerCase()
        const arr    = String(getVal('EMPLOYMENT ARRANGEMENT')).toLowerCase()
        const sex    = String(getVal('SEX', 'GENDER')).toLowerCase()

        const record = {
          year: currentYear || getVal('YEAR') || 2026,
          registrationNo: getVal('REGISTRATION NO', 'UNNAMED: 0', '__EMPTY'),
          dateRegistered: toDateStr(getVal('DATE REGISTERED')),
          lastName: getVal('LAST NAME'),
          firstName: getVal('FIRST NAME'),
          middleName: getVal('MIDDLE NAME'),
          district: (() => {
            let d = currentDistrict || getVal('DISTRICT');
            if (d && !String(d).toLowerCase().startsWith('district')) return `District ${String(d).trim()}`;
            return d || 'District 1';
          })(),
          barangay: getVal('BARANGAY'),
          birthday: toDateStr(getVal('BIRTHDAY')),
          age: getVal('AGE'),
          civilStatus: getVal('CIVIL STATUS'),
          educationalAttainment: getVal('EDUCATIONAL INFORMATION', 'EDUCATIONAL ATTAINMENT'),
          currentResidence: getVal('HOME ADDRESS', 'CURRENT RESIDENCE'),
          birthPlace: getVal('BIRTH PLACE'),
          mobileNumber: getVal('MOBILE NUMBER'),
          employerAddress: getVal('EMPLOYER ADDRESS'),
          isGeneralHousehelp: nature.includes('general') || isTruthy(getVal('GENERAL HOUSEHELP')),
          isCook: nature.includes('cook') || isTruthy(getVal('COOK')),
          isLaundryPerson: nature.includes('laundry') || isTruthy(getVal('LAUNDRY PERSON', 'LAUNDRY')),
          isYaya: nature.includes('yaya') || isTruthy(getVal('YAYA')),
          isGardener: nature.includes('gardener') || isTruthy(getVal('GARDENER')),
          isLiveIn: arr.includes('live-in') || arr.includes('live in') || isTruthy(getVal('LIVE IN')),
          isLiveOut: arr.includes('live-out') || arr.includes('live out') || isTruthy(getVal('LIVE OUT')),
          isOnCall: arr.includes('on-call') || arr.includes('on call') || isTruthy(getVal('ON CALL')),
          monthlySalary: getVal('MONTHLY SALARY'),
          remarks: getVal('REMARKS'),
          isFemale: sex.startsWith('f') || isTruthy(getVal('FEMALE')),
          isMale: sex.startsWith('m') || isTruthy(getVal('MALE')),
          kasambahayOrientation: isTruthy(getVal('KASAMBAHAY ORIENTATION')),
          kasambahayOrganizing: isTruthy(getVal('KASAMBAHAY ORGANIZING')),
          occupationalSafetyAndHealth: isTruthy(getVal('OCCUPATIONAL SAFETY AND HEALTH')),
          genderSensitivityTraining: isTruthy(getVal('GENDER SENSITIVITY TRAINING')),
          basicFirstAidTraining: isTruthy(getVal('BASIC FIRST AID TRAINING')),
          homeSecurityAwareness: isTruthy(getVal('HOME SECURITY AWARENESS')),
          kasambahayGeneralAssembly: isTruthy(getVal('KASAMBAHAY GENERAL ASSEMBLY')),
          kasambahayDay: isTruthy(getVal('KASAMBAHAY DAY')),
          disasterPreparedness: isTruthy(getVal('DESASTER PREPAREDNESS', 'DISASTER PREPAREDNESS')),
          sss: getVal('SSS'),
          pagIbig: getVal('PAG-IBIG FUND', 'PAG-IBIG', 'PAG IBIG'),
          philhealth: getVal('PHILHEALTH'),
          qcid: getVal('QCID', 'QC ID'),
          isExOfw: isTruthy(getVal('EX OFW', 'EX  OFW')),
          isSoloParent: isTruthy(getVal('SOLO PARENT')),
          isPersonWithDisability: isTruthy(getVal('PERSON WITH DISABILITY', 'PWD')),
          isSeniorCitizen: isTruthy(getVal('SENIOR CITIZEN')),
          lengthOfService: getVal('KASAMBAHAY LENGTH OF SERVICE', 'LENGTH OF SERVICE'),
          workOfEmployer: getVal("WORK OF EMPLOYER'S", "WORK OF EMPLOYER"),
          isKapsaMember: isTruthy(getVal('KAPSA MEMBER', 'KAPSA  MEMBER')),
          isBcoopMember: isTruthy(getVal('BCOOP MEMBER')),
        }
        return record
      }).filter(r => r.lastName && r.firstName)
      
      recordsToImport = recordsToImport.concat(sheetRecords)
    }

      if (recordsToImport.length === 0) throw new Error('No valid records with First and Last names were found in the file.')

      setImportRecords(recordsToImport)
    } catch (err) {
      setError(`Import Error: ${err.message}`)
      alert(`Import Error: ${err.message}`)
    } finally {
      setLoading(false)
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  const handleSearch    = () => { setSearch(searchInput); fetchData(1, searchInput) }
  const handleSearchKey = (e) => { if (e.key === 'Enter') handleSearch() }

  const filteredData = data.filter(k => {
    if (!category) return true
    if (category === 'Househelp') return k.isGeneralHousehelp
    if (category === 'Cook')      return k.isCook
    if (category === 'Laundry')   return k.isLaundryPerson
    if (category === 'Yaya')      return k.isYaya
    if (category === 'Gardener')  return k.isGardener
    if (category === 'Others')    return k.isOthers
    return true
  })

  const handleSort = (key) => {
    if (key === '#') return
    setSortKey(key)
    setSortDir(prev => sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc')
  }

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortKey) return 0
    let valA = a[sortKey], valB = b[sortKey]
    if (sortKey === 'gender')       { valA = a.isFemale ? 'Female' : a.isMale ? 'Male' : ''; valB = b.isFemale ? 'Female' : b.isMale ? 'Male' : '' }
    else if (sortKey === 'type')    { valA = a.isGeneralHousehelp ? 'Househelp' : a.isCook ? 'Cook' : a.isLaundryPerson ? 'Laundry' : a.isYaya ? 'Yaya' : a.isGardener ? 'Gardener' : ''; valB = b.isGeneralHousehelp ? 'Househelp' : b.isCook ? 'Cook' : b.isLaundryPerson ? 'Laundry' : b.isYaya ? 'Yaya' : b.isGardener ? 'Gardener' : '' }
    else if (sortKey === 'arrangement') { valA = a.isLiveIn ? 'Live-in' : a.isLiveOut ? 'Live-out' : a.isOnCall ? 'On-call' : ''; valB = b.isLiveIn ? 'Live-in' : b.isLiveOut ? 'Live-out' : b.isOnCall ? 'On-call' : '' }
    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()
    if (valA === valB) return 0
    if (!valA) return sortDir === 'asc' ? 1 : -1
    if (!valB) return sortDir === 'asc' ? -1 : 1
    return valA < valB ? (sortDir === 'asc' ? -1 : 1) : (sortDir === 'asc' ? 1 : -1)
  })

  const sel     = { height: 42, padding: '0 14px', fontSize: 14, borderRadius: 8, border: '1px solid #e4e4e7', background: '#fafafa', color: '#111', outline: 'none', cursor: 'pointer', minWidth: 160, boxSizing: 'border-box' }
  const pageBtn = (active) => ({ height: 32, minWidth: 32, padding: '0 10px', borderRadius: 6, border: '1px solid #e4e4e7', background: active ? '#1a3a6b' : '#fff', color: active ? '#fff' : '#111', fontSize: 13, cursor: 'pointer', fontWeight: active ? 600 : 400 })

  return (
    <div style={{ padding: '20px', minHeight: '100vh', background: '#f0f2f7' }}>

      {showAddModal && <AddKasambahayModal onClose={() => setShowAddModal(false)} onSuccess={(y, d) => { setShowAddModal(false); setYear(y); setDistrict(d); fetchData(1, '', y, d) }} />}
      {editItem    && <EditKasambahayModal item={editItem} onClose={() => setEditItem(null)} onSuccess={(y, d) => { setEditItem(null); setYear(y); setDistrict(d); fetchData(1, search, y, d) }} />}
      {viewItem    && <ViewKasambahayModal item={viewItem} onClose={() => setViewItem(null)} />}
      {(deleteItems || permanentDeleteItems) && (
        <DeleteConfirmModal items={deleteItems || permanentDeleteItems} isPermanent={!!permanentDeleteItems}
          onClose={() => { setDeleteItems(null); setPermanentDeleteItems(null) }}
          onSuccess={() => { setDeleteItems(null); setPermanentDeleteItems(null); setCheckedItems([]); fetchData(page, search) }} />
      )}
      {importRecords && (
        <ImportModal
          records={importRecords}
          onClose={() => setImportRecords(null)}
          onSuccess={() => {
            const yearVal = importRecords[0]?.year || year || 2026;
            setYear(yearVal);
            fetchData(1, search, yearVal, district);
          }}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#888', padding: 0 }}>←</button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: '#1a3a6b', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 900, color: '#c8a84b' }}>K</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a6b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Kasambahay Data {viewDeleted ? '(Deleted)' : ''}
              </h2>
            </div>
            <p style={{ fontSize: 13, color: '#888', margin: '3px 0 0 46px' }}>Quezon City Public Employment Service Office</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isAdmin && (
            <button onClick={() => { const m = !viewDeleted; setViewDeleted(m); fetchData(1, search, null, null, m) }}
              style={{ height: 40, padding: '0 18px', background: viewDeleted ? '#ef4444' : '#f4f4f5', color: viewDeleted ? '#fff' : '#111', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {viewDeleted ? 'View Active' : 'View Deleted'}
            </button>
          )}
          {!viewDeleted && (
            <>
              <input type="file" ref={importInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".xlsx, .xls" />
              <button onClick={handleImportClick} disabled={loading}
                style={{ height: 40, padding: '0 18px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {loading ? '...' : 'Import Data'}
              </button>
              <button onClick={() => setShowAddModal(true)}
                style={{ height: 40, padding: '0 18px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                + Add Kasambahay
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #dde3f0', borderRadius: 10, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', borderTop: '3px solid #1a3a6b' }}>
        <div style={{ flex: '1 1 220px' }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#1a3a6b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Search</label>
          <input type="text" placeholder="Search name or barangay..." value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={handleSearchKey}
            style={{ ...sel, width: '100%', cursor: 'text' }} />
        </div>
        <div style={{ width: 140, flexShrink: 0 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#1a3a6b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Year</label>
          <select value={year} onChange={e => setYear(e.target.value)} style={{ ...sel, width: '100%' }}>
            <option value="">All Years</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ width: 148, flexShrink: 0 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#1a3a6b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>District</label>
          <select value={district} onChange={e => setDistrict(e.target.value)} style={{ ...sel, width: '100%' }}>
            <option value="">All Districts</option>
            {DISTRICTS.map(d => <option key={d} value={d}>District {d}</option>)}
          </select>
        </div>
        <div style={{ width: 148, flexShrink: 0 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#1a3a6b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Type of Work</label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...sel, width: '100%' }}>
            <option value="">All Types</option>
            <option value="Househelp">Househelp</option>
            <option value="Cook">Cook</option>
            <option value="Laundry">Laundry</option>
            <option value="Yaya">Yaya</option>
            <option value="Gardener">Gardener</option>
            <option value="Others">Others</option>
          </select>
        </div>
        <button onClick={handleSearch} disabled={loading}
          style={{ height: 42, padding: '0 22px', background: '#1a3a6b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {loading ? 'Loading...' : 'Apply Filters'}
        </button>
        {(year || district || search || searchInput || category) && (
          <button onClick={() => { setYear(''); setDistrict(''); setSearch(''); setSearchInput(''); setCategory(''); fetchData(1, '', '', '') }}
            style={{ height: 42, padding: '0 16px', background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
            Clear
          </button>
        )}
      </div>

      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#ef4444', marginBottom: 16 }}>{error}</div>}

      {/* Results table */}
      {searched && (
        <div style={{ background: '#fff', border: '1px solid #dde3f0', borderRadius: 10, overflow: 'hidden', borderTop: '3px solid #1a3a6b' }}>

          {/* Toolbar */}
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, background: '#f5f7fb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {year ? year : 'All Years'} — {district ? `District ${district}` : 'All Districts'}
              </span>
              {pagination && <Badge color="green">{pagination.total.toLocaleString()} total</Badge>}
              {category    && <Badge color="amber">Filtered: {category}</Badge>}
              {pagination?.totalPages > 1 && <Badge color="purple">Pg {pagination.page}/{pagination.totalPages}</Badge>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { const item = sortedData.find(d => d._id === checkedItems[0]); if (item) setViewItem(item) }}
                disabled={checkedItems.length !== 1}
                style={{ height: 34, padding: '0 16px', background: checkedItems.length === 1 ? '#0ea5e9' : '#e4e4e7', color: checkedItems.length === 1 ? '#fff' : '#888', border: 'none', borderRadius: 6, fontSize: 13, cursor: checkedItems.length === 1 ? 'pointer' : 'not-allowed', fontWeight: 600 }}>View</button>
              {!viewDeleted ? (
                <>
                  <button onClick={() => { const item = sortedData.find(d => d._id === checkedItems[0]); if (item) setEditItem(item) }}
                    disabled={checkedItems.length !== 1}
                    style={{ height: 34, padding: '0 16px', background: checkedItems.length === 1 ? '#1a3a6b' : '#e4e4e7', color: checkedItems.length === 1 ? '#fff' : '#888', border: 'none', borderRadius: 6, fontSize: 13, cursor: checkedItems.length === 1 ? 'pointer' : 'not-allowed', fontWeight: 600 }}>Edit</button>
                  <button onClick={() => { const items = sortedData.filter(d => checkedItems.includes(d._id)); if (items.length) setDeleteItems(items) }}
                    disabled={checkedItems.length === 0}
                    style={{ height: 34, padding: '0 16px', background: checkedItems.length > 0 ? '#ef4444' : '#e4e4e7', color: checkedItems.length > 0 ? '#fff' : '#888', border: 'none', borderRadius: 6, fontSize: 13, cursor: checkedItems.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 600 }}>Delete</button>
                </>
              ) : (
                <>
                  <button onClick={async () => {
                    const items = sortedData.filter(d => checkedItems.includes(d._id))
                    if (!items.length || !window.confirm(`Restore ${items.length} record(s)?`)) return
                    const token = localStorage.getItem('token')
                    await Promise.all(items.map(item => fetch(`${API_ENDPOINTS.KASAMBAHAY}/${item._id}/restore`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } })))
                    setCheckedItems([])
                    fetchData(page, search)
                  }} disabled={checkedItems.length === 0}
                    style={{ height: 34, padding: '0 16px', background: checkedItems.length > 0 ? '#10b981' : '#e4e4e7', color: checkedItems.length > 0 ? '#fff' : '#888', border: 'none', borderRadius: 6, fontSize: 13, cursor: checkedItems.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 600 }}>Restore</button>
                  <button onClick={() => { const items = sortedData.filter(d => checkedItems.includes(d._id)); if (items.length) setPermanentDeleteItems(items) }}
                    disabled={checkedItems.length === 0}
                    style={{ height: 34, padding: '0 16px', background: checkedItems.length > 0 ? '#ef4444' : '#e4e4e7', color: checkedItems.length > 0 ? '#fff' : '#888', border: 'none', borderRadius: 6, fontSize: 13, cursor: checkedItems.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 600 }}>Perm. Delete</button>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 340px)' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ background: '#eef2fa' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '2px solid #1a3a6b', borderRight: '1px solid #dde3f0', position: 'sticky', top: 0, left: 0, background: '#eef2fa', zIndex: 3, width: 40 }}>
                    <input type="checkbox" checked={sortedData.length > 0 && checkedItems.length === sortedData.length} onChange={e => setCheckedItems(e.target.checked ? sortedData.map(d => d._id) : [])} />
                  </th>
                  {ALL_COLUMNS.map(col => (
                    <th key={col.key} onClick={() => col.key !== '#' && handleSort(col.key)}
                      style={{ padding: '10px 14px', textAlign: col.center ? 'center' : 'left', fontSize: 11, fontWeight: 700, color: '#1a3a6b', borderBottom: '2px solid #1a3a6b', borderRight: '1px solid #dde3f0', minWidth: col.width, maxWidth: col.width, position: 'sticky', top: 0, background: '#eef2fa', zIndex: 1, cursor: col.key !== '#' ? 'pointer' : 'default', userSelect: 'none', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: col.center ? 'center' : 'flex-start', gap: 4 }}>
                        {col.label}
                        {sortKey === col.key && <span style={{ fontSize: 10, color: '#c8a84b' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={ALL_COLUMNS.length + 1} style={{ padding: 48, textAlign: 'center', color: '#aaa', fontSize: 14 }}>Loading...</td></tr>
                ) : sortedData.length === 0 ? (
                  <tr><td colSpan={ALL_COLUMNS.length + 1} style={{ padding: 48, textAlign: 'center', color: '#aaa', fontSize: 14 }}>No records found.</td></tr>
                ) : sortedData.map((k, i) => (
                  <tr key={k._id} style={{ borderBottom: '1px solid #eef2fa' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f7fb'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td className='sticky-cb' style={{ padding: '10px 14px', textAlign: 'center', borderRight: '1px solid #dde3f0', position: 'sticky', left: 0, zIndex: 1, boxShadow: '2px 0 4px rgba(0,0,0,0.06)' }}>
                      <input type="checkbox" checked={checkedItems.includes(k._id)} onChange={() => setCheckedItems(prev => prev.includes(k._id) ? prev.filter(id => id !== k._id) : [...prev, k._id])} />
                    </td>
                    {ALL_COLUMNS.map(col => {
                      const value      = col.render(k, i, page)
                      const badgeColor = col.badge ? col.badge(k) : null
                      return (
                        <td key={col.key} style={{ padding: '10px 14px', color: col.bold ? '#1a3a6b' : '#444', fontWeight: col.bold ? 600 : 400, textAlign: col.center ? 'center' : 'left', borderRight: '1px solid #f0f0f0', minWidth: col.width, maxWidth: col.width, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {badgeColor ? <Badge color={badgeColor}>{value}</Badge> : value}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination?.totalPages > 1 && (
            <div style={{ padding: '12px 18px', borderTop: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, background: '#f5f7fb' }}>
              <span style={{ fontSize: 13, color: '#888' }}>
                Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, pagination.total)} of {pagination.total.toLocaleString()} records
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => fetchData(page - 1, search)} disabled={page === 1 || loading} style={{ ...pageBtn(false), opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 2)
                  .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...'); acc.push(p); return acc }, [])
                  .map((p, idx) =>
                    p === '...' ? <span key={`e-${idx}`} style={{ padding: '0 4px', fontSize: 13, color: '#aaa', lineHeight: '32px' }}>…</span>
                      : <button key={p} onClick={() => fetchData(p, search)} disabled={loading} style={pageBtn(p === page)}>{p}</button>
                  )}
                <button onClick={() => fetchData(page + 1, search)} disabled={page === pagination.totalPages || loading} style={{ ...pageBtn(false), opacity: page === pagination.totalPages ? 0.4 : 1 }}>Next →</button>
              </div>
            </div>
          )}
        </div>
      )}
    <style>{`
        tr:hover td.sticky-cb { background: #f5f7fb !important; }
        tr td.sticky-cb { background: #fff; }
      `}</style>
    </div>
  )
}

export default KasambahayData