import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '../utils/api'

const YEARS     = [2024, 2025]
const DISTRICTS = [1, 2, 3, 4, 5, 6]
const LIMIT     = 100

// ─── Column definitions ───────────────────────────────────────────────────────
const ALL_COLUMNS = [
  { key: '#',                       label: '#',                      render: (k, i, page) => ((page - 1) * LIMIT) + i + 1, width: 50 },
  { key: 'registrationNo',          label: 'Reg. No.',               render: k => k.registrationNo || '—', width: 80 },
  { key: 'dateRegistered',          label: 'Date Registered',        render: k => k.dateRegistered ? new Date(k.dateRegistered).toLocaleDateString() : '—', width: 120 },
  { key: 'lastName',                label: 'Last Name',              render: k => k.lastName || '—', width: 130, bold: true },
  { key: 'firstName',               label: 'First Name',             render: k => k.firstName || '—', width: 130 },
  { key: 'middleName',              label: 'Middle Name',            render: k => k.middleName || '—', width: 130 },
  { key: 'barangay',                label: 'Barangay',               render: k => k.barangay || '—', width: 140 },
  { key: 'birthday',                label: 'Birthday',               render: k => k.birthday ? new Date(k.birthday).toLocaleDateString() : '—', width: 110 },
  { key: 'age',                     label: 'Age',                    render: k => k.age || '—', width: 60 },
  { key: 'birthPlace',              label: 'Birth Place',            render: k => k.birthPlace || '—', width: 140 },
  { key: 'civilStatus',             label: 'Civil Status',           render: k => k.civilStatus || '—', width: 110 },
  { key: 'gender',                  label: 'Gender',                 render: k => k.isFemale ? 'Female' : k.isMale ? 'Male' : '—', width: 80, badge: k => k.isFemale ? 'blue' : k.isMale ? 'gray' : null },
  { key: 'educationalAttainment',   label: 'Education',              render: k => k.educationalAttainment || '—', width: 180 },
  { key: 'currentResidence',        label: 'Current Residence',      render: k => k.currentResidence || '—', width: 170 },
  { key: 'employerAddress',         label: 'Employer Address',       render: k => k.employerAddress || '—', width: 170 },
  { key: 'monthlySalary',           label: 'Monthly Salary',         render: k => k.monthlySalary ? `₱${k.monthlySalary.toLocaleString()}` : '—', width: 120 },
  { key: 'mobileNumber',            label: 'Mobile No.',             render: k => k.mobileNumber || '—', width: 120 },
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
  { key: 'isQcVoter',               label: 'QC Voter',               render: k => k.isQcVoter || '—', width: 90 },
  { key: 'noOfFamilyVoters',        label: 'Family Voters',          render: k => k.noOfFamilyVoters || '—', width: 110 },
  { key: 'noOfKasambahayInFamily',  label: 'Kasambahay in Family',   render: k => k.noOfKasambahayInFamily || '—', width: 150 },
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
  { key: 'qcCareOrientation', label: 'QC Care Orientation', render: k => k.qcCareOrientation ? '✓' : '—', width: 130, center: true },
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

// ─── Shared form styles ───────────────────────────────────────────────────────
const inputStyle = {
  width: '100%', height: 40, padding: '0 12px', fontSize: 14,
  border: '1px solid #e4e4e7', borderRadius: 6, outline: 'none', boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 500, color: '#555',
  marginBottom: 6,
}

const secTitle = {
  margin: '28px 0 14px 0',
  fontSize: 11,
  fontWeight: 600,
  color: '#999',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

const secTitleFirst = {
  ...secTitle,
  marginTop: 0,
}

// ─── Shared form fields used by both Add and Edit modals ─────────────────────
function KasambahayForm({ formData, handleChange, handleGender, handleArrangement, formId, onSubmit }) {
  return (
    <form id={formId} onSubmit={onSubmit}>
      <h4 style={secTitleFirst}>Registration Info</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div><label style={labelStyle}>Reg. No.</label><input type="number" name="registrationNo" value={formData.registrationNo} onChange={handleChange} style={inputStyle} /></div>
        <div><label style={labelStyle}>Date Registered</label><input type="date" name="dateRegistered" value={formData.dateRegistered} onChange={handleChange} style={inputStyle} /></div>
      </div>

      <h4 style={secTitle}>Personal Information</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div><label style={labelStyle}>First Name *</label><input required name="firstName" value={formData.firstName} onChange={handleChange} style={inputStyle} /></div>
        <div><label style={labelStyle}>Middle Name</label><input name="middleName" value={formData.middleName} onChange={handleChange} style={inputStyle} /></div>
        <div><label style={labelStyle}>Last Name *</label><input required name="lastName" value={formData.lastName} onChange={handleChange} style={inputStyle} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div><label style={labelStyle}>Birthday</label><input type="date" name="birthday" value={formData.birthday} onChange={handleChange} style={inputStyle} /></div>
        <div><label style={labelStyle}>Age</label><input type="number" name="age" value={formData.age} onChange={handleChange} style={inputStyle} /></div>
        <div><label style={labelStyle}>Mobile Number</label><input name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} style={inputStyle} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div><label style={labelStyle}>Birth Place</label><input name="birthPlace" value={formData.birthPlace} onChange={handleChange} style={inputStyle} /></div>
        <div><label style={labelStyle}>Current Residence</label><input name="currentResidence" value={formData.currentResidence} onChange={handleChange} style={inputStyle} /></div>
        <div><label style={labelStyle}>Education</label><input name="educationalAttainment" value={formData.educationalAttainment} onChange={handleChange} style={inputStyle} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div>
          <label style={labelStyle}>Gender</label>
          <div style={{ display: 'flex', gap: 20, height: 40, alignItems: 'center' }}>
            <label style={{ fontSize: 14 }}><input type="radio" checked={formData.isFemale} onChange={() => handleGender('female')} style={{ marginRight: 6 }} /> Female</label>
            <label style={{ fontSize: 14 }}><input type="radio" checked={formData.isMale} onChange={() => handleGender('male')} style={{ marginRight: 6 }} /> Male</label>
          </div>
        </div>
        <div><label style={labelStyle}>Civil Status</label><input name="civilStatus" value={formData.civilStatus} onChange={handleChange} style={inputStyle} /></div>
      </div>

      <h4 style={secTitle}>Location & Meta</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div><label style={labelStyle}>Year</label><input type="number" name="year" value={formData.year} onChange={handleChange} style={inputStyle} /></div>
        <div>
          <label style={labelStyle}>District</label>
          <select name="district" value={formData.district} onChange={handleChange} style={inputStyle}>
            {[1,2,3,4,5,6].map(d => <option key={d} value={d}>District {d}</option>)}
          </select>
        </div>
        <div><label style={labelStyle}>Barangay</label><input name="barangay" value={formData.barangay} onChange={handleChange} style={inputStyle} /></div>
      </div>

      <h4 style={secTitle}>Employment Info</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div><label style={labelStyle}>Monthly Salary (₱)</label><input type="number" name="monthlySalary" value={formData.monthlySalary} onChange={handleChange} style={inputStyle} /></div>
        <div><label style={labelStyle}>Employer Address</label><input name="employerAddress" value={formData.employerAddress} onChange={handleChange} style={inputStyle} /></div>
        <div><label style={labelStyle}>Length of Service</label><input name="lengthOfService" value={formData.lengthOfService} onChange={handleChange} style={inputStyle} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div>
          <label style={labelStyle}>Arrangement</label>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14, height: 40, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="radio" checked={formData.isLiveIn}  onChange={() => handleArrangement('liveIn')}  /> Live-in</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="radio" checked={formData.isLiveOut} onChange={() => handleArrangement('liveOut')} /> Live-out</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="radio" checked={formData.isOnCall}  onChange={() => handleArrangement('onCall')}  /> On-call</label>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Type of Work</label>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 14, minHeight: 40, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" name="isGeneralHousehelp" checked={formData.isGeneralHousehelp} onChange={handleChange} /> Househelp</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" name="isCook"             checked={formData.isCook}             onChange={handleChange} /> Cook</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" name="isLaundryPerson"    checked={formData.isLaundryPerson}    onChange={handleChange} /> Laundry</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" name="isYaya"             checked={formData.isYaya}             onChange={handleChange} /> Yaya</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" name="isGardener"         checked={formData.isGardener}         onChange={handleChange} /> Gardener</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" name="isOthers" checked={formData.isOthers} onChange={handleChange} /> Others</label>
            {formData.isOthers && (
              <input name="othersSpecify" value={formData.othersSpecify} onChange={handleChange} placeholder="Specify work..." style={{ ...inputStyle, width: 160, height: 32, fontSize: 13 }} />
            )}
          </div>
        </div>
      </div>

      <h4 style={secTitle}>Government IDs</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 20, marginBottom: 28 }}>
        {['sss', 'pagIbig', 'philhealth', 'qcid'].map(field => (
          <div key={field}>
            <label style={labelStyle}>{field === 'pagIbig' ? 'Pag-IBIG' : field.toUpperCase()}</label>
            <select name={field} value={formData[field]} onChange={handleChange} style={inputStyle}>
              <option value="">Select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        ))}
      </div>

      <h4 style={secTitle}>Classifications & Other Info</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div><label style={labelStyle}>QC Voter?</label><input name="isQcVoter" value={formData.isQcVoter} onChange={handleChange} style={inputStyle} /></div>
        <div><label style={labelStyle}>Family Voters</label><input type="number" name="noOfFamilyVoters" value={formData.noOfFamilyVoters} onChange={handleChange} style={inputStyle} /></div>
        <div><label style={labelStyle}>Kasambahays in Fam</label><input type="number" name="noOfKasambahayInFamily" value={formData.noOfKasambahayInFamily} onChange={handleChange} style={inputStyle} /></div>
        <div><label style={labelStyle}>Employer's Work</label><input name="workOfEmployer" value={formData.workOfEmployer} onChange={handleChange} style={inputStyle} /></div>
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14, marginBottom: 28, alignItems: 'center' }}>
        {[['isExOfw','Ex-OFW'],['isSoloParent','Solo Parent'],['isPersonWithDisability','PWD'],['isSeniorCitizen','Senior'],['isKapsaMember','KAPSA'],['isBcoopMember','BCOOP']].map(([name, label]) => (
          <label key={name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <input type="checkbox" name={name} checked={formData[name]} onChange={handleChange} /> {label}
          </label>
        ))}
      </div>

      <h4 style={secTitle}>Trainings & Seminars</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Orientation',   check: 'kasambahayOrientation',      date: 'dateOfOrientation' },
          { label: 'Organizing',    check: 'kasambahayOrganizing',        date: 'dateOfOrganizing' },
          { label: 'OSH',           check: 'occupationalSafetyAndHealth', date: 'dateOfOshTraining' },
          { label: 'GST',           check: 'genderSensitivityTraining',   date: 'dateOfGenderSensitivity' },
          { label: 'First Aid',     check: 'basicFirstAidTraining',       date: 'dateOfBasicFirstAid' },
          { label: 'Home Security', check: 'homeSecurityAwareness',       date: 'dateOfHomeSecurity' },
          { label: 'Gen. Assembly', check: 'kasambahayGeneralAssembly',   date: 'dateOfGenAssembly' },
          { label: 'K. Day',        check: 'kasambahayDay',               date: 'dateOfKasambahayDay' },
          { label: 'Disaster Prep', check: 'disasterPreparedness',        date: 'dateOfDisasterPreparedness' },
          { label: 'QC Care Orientation', check: 'qcCareOrientation', date: 'dateOfQcCareOrientation' },
        ].map(t => (
          <div key={t.check} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 150, fontSize: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <input type="checkbox" name={t.check} checked={formData[t.check]} onChange={handleChange} /> {t.label}
              </label>
            </div>
            <div style={{ flex: 1 }}>
              <input type="date" name={t.date} value={formData[t.date]} onChange={handleChange}
                disabled={!formData[t.check]}
                style={{ ...inputStyle, background: formData[t.check] ? '#fff' : '#f4f4f5' }} />
            </div>
          </div>
        ))}
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
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
            ⚠️
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#92400e' }}>Possible duplicate detected</h3>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#b45309' }}>
              {matches.length === 1 ? 'A record' : `${matches.length} records`} with the same name already exist{matches.length === 1 ? 's' : ''} in the system.
            </p>
          </div>
        </div>

        <div style={{ padding: '20px 28px', maxHeight: 300, overflowY: 'auto' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Existing record{matches.length > 1 ? 's' : ''} found:
          </p>
          {matches.map((m, i) => (
            <div key={m._id || i} style={{ border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', marginBottom: 10, background: '#fffdf0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#111' }}>
                    {m.lastName}, {m.firstName} {m.middleName || ''}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
                    {m.barangay || '—'} · {m.district} · {m.year}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
          <button
            onClick={onCancel}
            style={{ height: 40, padding: '0 20px', background: '#fff', border: '1px solid #e4e4e7', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#111' }}
          >
            ← Go back and fix
          </button>
          <button
            onClick={onSaveAnyway}
            disabled={isSaving}
            style={{ height: 40, padding: '0 20px', background: '#d97706', color: '#fff', border: 'none', borderRadius: 6, cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 500 }}
          >
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
const BLANK_FORM = {
  registrationNo: '', dateRegistered: '',
  firstName: '', middleName: '', lastName: '',
  year: new Date().getFullYear(), district: '1', barangay: '',
  birthday: '', age: '', civilStatus: '', mobileNumber: '',
  birthPlace: '', currentResidence: '', educationalAttainment: '',
  isMale: false, isFemale: false,
  monthlySalary: '', employerAddress: '', lengthOfService: '',
  isLiveIn: false, isLiveOut: false, isOnCall: false,
  isGeneralHousehelp: false, isCook: false, isLaundryPerson: false, isYaya: false, isGardener: false,
  sss: '', pagIbig: '', philhealth: '', qcid: '',
  isExOfw: false, isSoloParent: false, isPersonWithDisability: false, isSeniorCitizen: false,
  isQcVoter: '', noOfFamilyVoters: '', noOfKasambahayInFamily: '', workOfEmployer: '',
  isKapsaMember: false, isBcoopMember: false,
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
  isOthers: false, othersSpecify: '',
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
function AddKasambahayModal({ onClose, onSuccess }) {
  const [formData, setFormData]     = useState(BLANK_FORM)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [dupMatches, setDupMatches] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }
  const handleGender      = (g)   => setFormData(prev => ({ ...prev, isMale: g === 'male',    isFemale: g === 'female' }))
  const handleArrangement = (arr) => setFormData(prev => ({ ...prev, isLiveIn: arr === 'liveIn', isLiveOut: arr === 'liveOut', isOnCall: arr === 'onCall' }))

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await checkDuplicate({
        firstName:  formData.firstName,
        lastName:   formData.lastName,
        middleName: formData.middleName,
        birthday:   formData.birthday,
        district:   formData.district.replace('District ', ''),
        year:       formData.year,
      })
      if (result.hasDuplicate) {
        setDupMatches(result.matches)
      } else {
        await saveRecord()
      }
    } catch {
      setError('Duplicate check failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const saveRecord = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res   = await fetch(API_ENDPOINTS.KASAMBAHAY, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed to save record.')
      onSuccess(formData.year, formData.district)
    } catch (err) {
      setError(err.message)
      setDupMatches(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: 740, maxHeight: '92vh', borderRadius: 14, display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>

          <div style={{ padding: '20px 28px', borderBottom: '1px solid #e4e4e7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Add New Kasambahay</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1 }}>&times;</button>
          </div>

          <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
            {error && (
              <div style={{ background: '#fef2f2', color: '#ef4444', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14, border: '1px solid #fecaca' }}>
                {error}
              </div>
            )}
            <KasambahayForm
              formData={formData}
              handleChange={handleChange}
              handleGender={handleGender}
              handleArrangement={handleArrangement}
              formId="add-kasambahay-form"
              onSubmit={handleFormSubmit}
            />
          </div>

          <div style={{ padding: '18px 28px', borderTop: '1px solid #e4e4e7', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={{ height: 40, padding: '0 20px', background: '#f4f4f5', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Cancel</button>
            <button type="submit" form="add-kasambahay-form" disabled={loading}
              style={{ height: 40, padding: '0 24px', background: loading ? '#ccc' : '#111', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 500 }}>
              {loading ? 'Checking…' : 'Save Record'}
            </button>
          </div>
        </div>
      </div>

      {dupMatches && (
        <DuplicateWarningModal
          matches={dupMatches}
          onCancel={() => setDupMatches(null)}
          onSaveAnyway={saveRecord}
          isSaving={loading}
        />
      )}
    </>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditKasambahayModal({ item, onClose, onSuccess }) {
  const [formData, setFormData] = useState(() => {
    const data = { ...item }
    const dateFields = ['dateRegistered','birthday','dateOfOrientation','dateOfOrganizing','dateOfOshTraining','dateOfGenderSensitivity','dateOfBasicFirstAid','dateOfHomeSecurity','dateOfGenAssembly','dateOfKasambahayDay','dateOfDisasterPreparedness']
    dateFields.forEach(f => { data[f] = data[f] ? data[f].split('T')[0] : '' })
    for (const key in data) { if (data[key] === null) data[key] = '' }
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
  const handleGender      = (g)   => setFormData(prev => ({ ...prev, isMale: g === 'male',    isFemale: g === 'female' }))
  const handleArrangement = (arr) => setFormData(prev => ({ ...prev, isLiveIn: arr === 'liveIn', isLiveOut: arr === 'liveOut', isOnCall: arr === 'onCall' }))

  const handleReview = async (e) => {
    e.preventDefault()
    setError('')

    const dateFields = ['dateRegistered','birthday','dateOfOrientation','dateOfOrganizing','dateOfOshTraining','dateOfGenderSensitivity','dateOfBasicFirstAid','dateOfHomeSecurity','dateOfGenAssembly','dateOfKasambahayDay','dateOfDisasterPreparedness']
    const diff = []
    for (const key in formData) {
      if (['_id','__v','createdAt','updatedAt','createdBy'].includes(key)) continue
      let orig = item[key]
      if (dateFields.includes(key) && orig) orig = orig.split('T')[0]
      if (orig === null || orig === undefined) orig = ''
      if (String(formData[key]) !== String(orig)) {
        diff.push({ field: key, old: orig, new: formData[key] })
      }
    }
    if (diff.length === 0) { setError('No changes made.'); return }

    const nameChanged = diff.some(d => ['firstName','lastName'].includes(d.field))
    if (nameChanged) {
      setLoading(true)
      try {
        const result = await checkDuplicate({
          firstName:  formData.firstName,
          lastName:   formData.lastName,
          middleName: formData.middleName,
          birthday:   formData.birthday,
          district:   formData.district.replace('District ', ''),
          year:       formData.year,
          excludeId:  item._id,
        })
        if (result.hasDuplicate) {
          setDupMatches({ matches: result.matches, diff })
          return
        }
      } catch {
        setError('Duplicate check failed. Please try again.')
        return
      } finally {
        setLoading(false)
      }
    }

    setConfirmChanges(diff)
  }

  const proceedFromDupWarning = () => {
    setConfirmChanges(dupMatches.diff)
    setDupMatches(null)
  }

  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      const token = localStorage.getItem('token')
      const res   = await fetch(`${API_ENDPOINTS.KASAMBAHAY}/${item._id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(formData),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed to update record.')
      onSuccess(formData.year, formData.district)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Review changes screen ──────────────────────────────────────────────────
  if (confirmChanges) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: 520, borderRadius: 14, display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #e4e4e7' }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Review Changes</h3>
            <p style={{ margin: '5px 0 0', fontSize: 14, color: '#888' }}>{confirmChanges.length} field{confirmChanges.length > 1 ? 's' : ''} changed</p>
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
          <div style={{ padding: '18px 28px', borderTop: '1px solid #e4e4e7', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={() => setConfirmChanges(null)} style={{ height: 40, padding: '0 20px', background: '#f4f4f5', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Back to Edit</button>
            <button onClick={handleSubmit} disabled={loading} style={{ height: 40, padding: '0 24px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
              {loading ? 'Saving…' : 'Confirm & Save'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: 740, maxHeight: '92vh', borderRadius: 14, display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>

          <div style={{ padding: '20px 28px', borderBottom: '1px solid #e4e4e7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Edit Kasambahay</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1 }}>&times;</button>
          </div>

          <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
            {error && (
              <div style={{ background: '#fef2f2', color: '#ef4444', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14, border: '1px solid #fecaca' }}>
                {error}
              </div>
            )}
            <KasambahayForm
              formData={formData}
              handleChange={handleChange}
              handleGender={handleGender}
              handleArrangement={handleArrangement}
              formId="edit-kasambahay-form"
              onSubmit={handleReview}
            />
          </div>

          <div style={{ padding: '18px 28px', borderTop: '1px solid #e4e4e7', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={{ height: 40, padding: '0 20px', background: '#f4f4f5', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Cancel</button>
            <button type="submit" form="edit-kasambahay-form" disabled={loading}
              style={{ height: 40, padding: '0 24px', background: loading ? '#ccc' : '#111', color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 500 }}>
              {loading ? 'Checking…' : 'Review Changes'}
            </button>
          </div>
        </div>
      </div>

      {dupMatches && (
        <DuplicateWarningModal
          matches={dupMatches.matches}
          onCancel={() => setDupMatches(null)}
          onSaveAnyway={proceedFromDupWarning}
          isSaving={loading}
        />
      )}
    </>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteConfirmModal({ item, isPermanent, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleDelete = async () => {
    setLoading(true); setError('')
    try {
      const token = localStorage.getItem('token')
      const url   = `${API_ENDPOINTS.KASAMBAHAY}/${item._id}${isPermanent ? '/permanent' : ''}`
      const res   = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      const json  = await res.json()
      if (!res.ok) throw new Error(json.message || 'Failed to delete record.')
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 420, borderRadius: 14, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #e4e4e7' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: isPermanent ? '#ef4444' : '#111' }}>
            {isPermanent ? 'Permanently Delete' : 'Delete'} Record
          </h3>
        </div>
        <div style={{ padding: '24px 28px' }}>
          {error && <div style={{ marginBottom: 16, color: '#ef4444', fontSize: 14 }}>{error}</div>}
          <p style={{ margin: '0 0 10px', fontSize: 15, color: '#333' }}>
            Are you sure you want to {isPermanent ? 'permanently delete' : 'delete'} <strong>{item.firstName} {item.lastName}</strong>?
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
            {isPermanent
              ? 'This action cannot be undone and will remove the data permanently.'
              : 'This moves the record to deleted. Admins can restore it later.'}
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
  const [checkedItems, setCheckedItems]               = useState([])
  const [viewDeleted, setViewDeleted]                 = useState(false)
  const [deleteItem, setDeleteItem]                   = useState(null)
  const [permanentDeleteItem, setPermanentDeleteItem] = useState(null)
  const [sortKey, setSortKey]   = useState(null)
  const [sortDir, setSortDir]   = useState('asc')
  const navigate = useNavigate()

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
        page: pageNum, limit: LIMIT,
        isDeleted: targetDeleted,
        ...(targetYear     ? { year: targetYear }         : {}),
        ...(targetDistrict ? { district: targetDistrict } : {}),
        ...(searchVal      ? { search: searchVal }        : {}),
      })
      const res  = await fetch(`${API_ENDPOINTS.KASAMBAHAY}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) { setError(json.message); return }
      setData(json.data)
      setPagination(json.pagination)
      setCheckedItems([])
      setSearched(true)
      setPage(pageNum)
    } catch {
      setError('Failed to fetch data.')
    } finally {
      setLoading(false)
    }
  }, [year, district, viewDeleted])

  useEffect(() => {
    fetchData(1, '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    let newDir = 'asc'
    if (sortKey === key) {
      newDir = sortDir === 'asc' ? 'desc' : 'asc'
    }
    setSortKey(key)
    setSortDir(newDir)
  }

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortKey) return 0
    let valA = a[sortKey]
    let valB = b[sortKey]
    if (sortKey === 'gender') { valA = a.isFemale ? 'Female' : a.isMale ? 'Male' : ''; valB = b.isFemale ? 'Female' : b.isMale ? 'Male' : '' }
    else if (sortKey === 'type') { valA = a.isGeneralHousehelp ? 'Househelp' : a.isCook ? 'Cook' : a.isLaundryPerson ? 'Laundry' : a.isYaya ? 'Yaya' : a.isGardener ? 'Gardener' : ''; valB = b.isGeneralHousehelp ? 'Househelp' : b.isCook ? 'Cook' : b.isLaundryPerson ? 'Laundry' : b.isYaya ? 'Yaya' : b.isGardener ? 'Gardener' : '' }
    else if (sortKey === 'arrangement') { valA = a.isLiveIn ? 'Live-in' : a.isLiveOut ? 'Live-out' : a.isOnCall ? 'On-call' : ''; valB = b.isLiveIn ? 'Live-in' : b.isLiveOut ? 'Live-out' : b.isOnCall ? 'On-call' : '' }

    if (typeof valA === 'string') valA = valA.toLowerCase()
    if (typeof valB === 'string') valB = valB.toLowerCase()
    if (valA === valB) return 0
    if (valA === undefined || valA === null || valA === '') return sortDir === 'asc' ? 1 : -1
    if (valB === undefined || valB === null || valB === '') return sortDir === 'asc' ? -1 : 1
    if (valA < valB) return sortDir === 'asc' ? -1 : 1
    if (valA > valB) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const sel = {
    height: 42, padding: '0 14px', fontSize: 14, borderRadius: 8,
    border: '1px solid #e4e4e7', background: '#fafafa', color: '#111',
    outline: 'none', cursor: 'pointer', minWidth: 160, boxSizing: 'border-box',
  }

  const pageBtn = (active) => ({
    height: 32, minWidth: 32, padding: '0 10px', borderRadius: 6,
    border: '1px solid #e4e4e7',
    background: active ? '#534AB7' : '#fff',
    color:      active ? '#fff'    : '#111',
    fontSize: 13, cursor: 'pointer', fontWeight: active ? 600 : 400,
  })

  return (
    <div style={{ padding: '28px 28px', minHeight: '100vh', background: '#f9f9f9' }}>

      {/* Modals */}
      {showAddModal && (
        <AddKasambahayModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(newYear, newDistrict) => {
            setShowAddModal(false)
            setYear(newYear); setDistrict(newDistrict)
            fetchData(1, '', newYear, newDistrict)
          }}
        />
      )}
      {editItem && (
        <EditKasambahayModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSuccess={(newYear, newDistrict) => {
            setEditItem(null)
            setYear(newYear); setDistrict(newDistrict)
            fetchData(1, search, newYear, newDistrict)
          }}
        />
      )}
      {(deleteItem || permanentDeleteItem) && (
        <DeleteConfirmModal
          item={deleteItem || permanentDeleteItem}
          isPermanent={!!permanentDeleteItem}
          onClose={() => { setDeleteItem(null); setPermanentDeleteItem(null) }}
          onSuccess={() => { setDeleteItem(null); setPermanentDeleteItem(null); fetchData(page, search) }}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate('/admin')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#888', padding: 0, lineHeight: 1 }}>←</button>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111', margin: 0 }}>
              Kasambahay Data {viewDeleted ? '(Deleted)' : ''}
            </h2>
            <p style={{ fontSize: 14, color: '#888', margin: '3px 0 0' }}>Select year and district to view records</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isAdmin && (
            <button
              onClick={() => { const m = !viewDeleted; setViewDeleted(m); fetchData(1, search, null, null, m) }}
              style={{ height: 40, padding: '0 18px', background: viewDeleted ? '#ef4444' : '#f4f4f5', color: viewDeleted ? '#fff' : '#111', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
            >
              {viewDeleted ? 'View Active Records' : 'View Deleted Records'}
            </button>
          )}
          {!viewDeleted && (
            <button onClick={() => setShowAddModal(true)}
              style={{ height: 40, padding: '0 18px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              + Add Kasambahay
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12, padding: '18px 20px', marginBottom: 20, display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Search</label>
          <input type="text" placeholder="Search name or barangay..." value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={handleSearchKey}
            style={{ ...sel, width: '100%', cursor: 'text' }} />
        </div>
        <div style={{ width: 148, flexShrink: 0 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Year</label>
          <select value={year} onChange={e => setYear(e.target.value)} style={{ ...sel, width: '100%' }}>
            <option value="">All Years</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ width: 148, flexShrink: 0 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>District</label>
          <select value={district} onChange={e => setDistrict(e.target.value)} style={{ ...sel, width: '100%' }}>
            <option value="">All Districts</option>
            {DISTRICTS.map(d => <option key={d} value={d}>District {d}</option>)}
          </select>
        </div>
        <div style={{ width: 148, flexShrink: 0 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Type of Work</label>
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
          style={{ height: 42, padding: '0 22px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
          {loading ? 'Searching...' : 'Apply Filters'}
        </button>
        {(year || district || search || searchInput || category) && (
          <button onClick={() => { setYear(''); setDistrict(''); setSearch(''); setSearchInput(''); setCategory(''); fetchData(1, '', '', '') }}
            style={{ height: 42, padding: '0 18px', background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>
            Clear
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#ef4444', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Results table */}
      {searched && (
        <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12, overflow: 'hidden' }}>

          {/* Toolbar */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{year ? year : 'All Years'} — {district ? `District ${district}` : 'All Districts'}</span>
              {pagination && <Badge color="green">{pagination.total.toLocaleString()} total records</Badge>}
              {category && <Badge color="amber">Filtered by {category}</Badge>}
              {pagination?.totalPages > 1 && <Badge color="purple">Page {pagination.page} of {pagination.totalPages}</Badge>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {!viewDeleted ? (
                <>
                  <button
                    onClick={() => { const item = sortedData.find(d => d._id === checkedItems[0]); if (item) setEditItem(item) }}
                    disabled={checkedItems.length !== 1}
                    style={{ height: 36, padding: '0 16px', background: checkedItems.length === 1 ? '#534AB7' : '#e4e4e7', color: checkedItems.length === 1 ? '#fff' : '#888', border: 'none', borderRadius: 8, fontSize: 13, cursor: checkedItems.length === 1 ? 'pointer' : 'not-allowed' }}
                  >Edit</button>
                  <button
                    onClick={() => { const item = sortedData.find(d => d._id === checkedItems[0]); if (item) setDeleteItem(item) }}
                    disabled={checkedItems.length !== 1}
                    style={{ height: 36, padding: '0 16px', background: checkedItems.length === 1 ? '#ef4444' : '#e4e4e7', color: checkedItems.length === 1 ? '#fff' : '#888', border: 'none', borderRadius: 8, fontSize: 13, cursor: checkedItems.length === 1 ? 'pointer' : 'not-allowed' }}
                  >Delete</button>
                </>
              ) : (
                <>
                  <button
                    onClick={async () => {
                      const item = sortedData.find(d => d._id === checkedItems[0])
                      if (!item || !window.confirm(`Restore record for ${item.firstName} ${item.lastName}?`)) return
                      const token = localStorage.getItem('token')
                      await fetch(`${API_ENDPOINTS.KASAMBAHAY}/${item._id}/restore`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } })
                      fetchData(page, search)
                    }}
                    disabled={checkedItems.length !== 1}
                    style={{ height: 36, padding: '0 16px', background: checkedItems.length === 1 ? '#10b981' : '#e4e4e7', color: checkedItems.length === 1 ? '#fff' : '#888', border: 'none', borderRadius: 8, fontSize: 13, cursor: checkedItems.length === 1 ? 'pointer' : 'not-allowed' }}
                  >Restore</button>
                  <button
                    onClick={() => { const item = sortedData.find(d => d._id === checkedItems[0]); if (item) setPermanentDeleteItem(item) }}
                    disabled={checkedItems.length !== 1}
                    style={{ height: 36, padding: '0 16px', background: checkedItems.length === 1 ? '#ef4444' : '#e4e4e7', color: checkedItems.length === 1 ? '#fff' : '#888', border: 'none', borderRadius: 8, fontSize: 13, cursor: checkedItems.length === 1 ? 'pointer' : 'not-allowed' }}
                  >Perm. Delete</button>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 340px)' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ padding: '11px 14px', textAlign: 'center', borderBottom: '2px solid #e4e4e7', borderRight: '1px solid #f0f0f0', position: 'sticky', top: 0, background: '#fafafa', zIndex: 1, width: 40 }}>
                    <input type="checkbox"
                      checked={sortedData.length > 0 && checkedItems.length === sortedData.length}
                      onChange={e => setCheckedItems(e.target.checked ? sortedData.map(d => d._id) : [])} />
                  </th>
                  {ALL_COLUMNS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => col.key !== '#' && handleSort(col.key)}
                      style={{ padding: '11px 14px', textAlign: col.center ? 'center' : 'left', fontSize: 12, fontWeight: 600, color: '#555', borderBottom: '2px solid #e4e4e7', borderRight: '1px solid #f0f0f0', minWidth: col.width, maxWidth: col.width, position: 'sticky', top: 0, background: '#fafafa', zIndex: 1, cursor: col.key !== '#' ? 'pointer' : 'default', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: col.center ? 'center' : 'flex-start', gap: 4 }}>
                        {col.label}
                        {sortKey === col.key && (
                          <span style={{ fontSize: 10, color: '#534AB7' }}>
                            {sortDir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
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
                  <tr key={k._id} style={{ borderBottom: '1px solid #f0f0f0' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafff8'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '11px 14px', textAlign: 'center', borderRight: '1px solid #f5f5f5' }}>
                      <input type="checkbox"
                        checked={checkedItems.includes(k._id)}
                        onChange={() => setCheckedItems(prev => prev.includes(k._id) ? prev.filter(id => id !== k._id) : [...prev, k._id])} />
                    </td>
                    {ALL_COLUMNS.map(col => {
                      const value      = col.render(k, i, page)
                      const badgeColor = col.badge ? col.badge(k) : null
                      return (
                        <td key={col.key} style={{ padding: '11px 14px', color: col.bold ? '#111' : '#444', fontWeight: col.bold ? 500 : 400, textAlign: col.center ? 'center' : 'left', borderRight: '1px solid #f5f5f5', minWidth: col.width, maxWidth: col.width, overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
            <div style={{ padding: '14px 18px', borderTop: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, background: '#fff' }}>
              <span style={{ fontSize: 13, color: '#888' }}>
                Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, pagination.total)} of {pagination.total.toLocaleString()} records
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => fetchData(page - 1, search)} disabled={page === 1 || loading} style={{ ...pageBtn(false), opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 2)
                  .reduce((acc, p, idx, arr) => { if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...'); acc.push(p); return acc }, [])
                  .map((p, idx) =>
                    p === '...'
                      ? <span key={`e-${idx}`} style={{ padding: '0 4px', fontSize: 13, color: '#aaa', lineHeight: '32px' }}>…</span>
                      : <button key={p} onClick={() => fetchData(p, search)} disabled={loading} style={pageBtn(p === page)}>{p}</button>
                  )}
                <button onClick={() => fetchData(page + 1, search)} disabled={page === pagination.totalPages || loading} style={{ ...pageBtn(false), opacity: page === pagination.totalPages ? 0.4 : 1 }}>Next →</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default KasambahayData