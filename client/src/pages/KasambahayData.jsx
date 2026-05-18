import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '../utils/api';
const YEARS = [2024, 2025]
const DISTRICTS = [1, 2, 3, 4, 5, 6]
const LIMIT = 100

const ALL_COLUMNS = [
  { key: '#',                    label: '#',                       render: (k, i, page) => ((page - 1) * LIMIT) + i + 1, width: 50 },
  { key: 'registrationNo',       label: 'Reg. No.',                render: k => k.registrationNo || '—', width: 80 },
  { key: 'dateRegistered',       label: 'Date Registered',         render: k => k.dateRegistered ? new Date(k.dateRegistered).toLocaleDateString() : '—', width: 120 },
  { key: 'lastName',             label: 'Last Name',               render: k => k.lastName || '—', width: 130, bold: true },
  { key: 'firstName',            label: 'First Name',              render: k => k.firstName || '—', width: 130 },
  { key: 'middleName',           label: 'Middle Name',             render: k => k.middleName || '—', width: 130 },
  { key: 'barangay',             label: 'Barangay',                render: k => k.barangay || '—', width: 140 },
  { key: 'birthday',             label: 'Birthday',                render: k => k.birthday ? new Date(k.birthday).toLocaleDateString() : '—', width: 110 },
  { key: 'age',                  label: 'Age',                     render: k => k.age || '—', width: 60 },
  { key: 'birthPlace',           label: 'Birth Place',             render: k => k.birthPlace || '—', width: 140 },
  { key: 'civilStatus',          label: 'Civil Status',            render: k => k.civilStatus || '—', width: 110 },
  { key: 'gender',               label: 'Gender',                  render: k => k.isFemale ? 'Female' : k.isMale ? 'Male' : '—', width: 80, badge: k => k.isFemale ? 'blue' : k.isMale ? 'gray' : null },
  { key: 'educationalAttainment',label: 'Education',               render: k => k.educationalAttainment || '—', width: 180 },
  { key: 'currentResidence',     label: 'Current Residence',       render: k => k.currentResidence || '—', width: 170 },
  { key: 'employerAddress',      label: 'Employer Address',        render: k => k.employerAddress || '—', width: 170 },
  { key: 'monthlySalary',        label: 'Monthly Salary',          render: k => k.monthlySalary ? `₱${k.monthlySalary.toLocaleString()}` : '—', width: 120 },
  { key: 'mobileNumber',         label: 'Mobile No.',              render: k => k.mobileNumber || '—', width: 120 },
  { key: 'type',                 label: 'Type',                    render: k => k.isGeneralHousehelp ? 'Househelp' : k.isCook ? 'Cook' : k.isLaundryPerson ? 'Laundry' : k.isYaya ? 'Yaya' : k.isGardener ? 'Gardener' : '—', width: 110 },
  { key: 'arrangement',          label: 'Arrangement',             render: k => k.isLiveIn ? 'Live-in' : k.isLiveOut ? 'Live-out' : k.isOnCall ? 'On-call' : '—', width: 110 },
  { key: 'lengthOfService',      label: 'Length of Service',       render: k => k.lengthOfService || '—', width: 140 },
  { key: 'sss',                  label: 'SSS',                     render: k => k.sss || '—', width: 120 },
  { key: 'pagIbig',              label: 'Pag-IBIG',                render: k => k.pagIbig || '—', width: 120 },
  { key: 'philhealth',           label: 'PhilHealth',              render: k => k.philhealth || '—', width: 120 },
  { key: 'qcid',                 label: 'QCID',                    render: k => k.qcid || '—', width: 120 },
  { key: 'isExOfw',              label: 'Ex-OFW',                  render: k => k.isExOfw ? '✓' : '—', width: 70, center: true },
  { key: 'isSoloParent',         label: 'Solo Parent',             render: k => k.isSoloParent ? '✓' : '—', width: 90, center: true },
  { key: 'isPersonWithDisability', label: 'PWD',                   render: k => k.isPersonWithDisability ? '✓' : '—', width: 60, center: true },
  { key: 'isSeniorCitizen',      label: 'Senior',                  render: k => k.isSeniorCitizen ? '✓' : '—', width: 70, center: true },
  { key: 'isQcVoter',            label: 'QC Voter',                render: k => k.isQcVoter || '—', width: 90 },
  { key: 'noOfFamilyVoters',     label: 'Family Voters',           render: k => k.noOfFamilyVoters || '—', width: 110 },
  { key: 'noOfKasambahayInFamily', label: 'Kasambahay in Family',  render: k => k.noOfKasambahayInFamily || '—', width: 150 },
  { key: 'workOfEmployer',       label: "Employer's Work",         render: k => k.workOfEmployer || '—', width: 140 },
  { key: 'isKapsaMember',        label: 'KAPSA',                   render: k => k.isKapsaMember ? '✓' : '—', width: 70, center: true },
  { key: 'isBcoopMember',        label: 'BCOOP',                   render: k => k.isBcoopMember ? '✓' : '—', width: 70, center: true },
  { key: 'kasambahayOrientation',   label: 'Orientation',          render: k => k.kasambahayOrientation ? '✓' : '—', width: 90, center: true },
  { key: 'dateOfOrientation',       label: 'Orientation Date',     render: k => k.dateOfOrientation || '—', width: 120 },
  { key: 'kasambahayOrganizing',    label: 'Organizing',           render: k => k.kasambahayOrganizing ? '✓' : '—', width: 90, center: true },
  { key: 'dateOfOrganizing',        label: 'Organizing Date',      render: k => k.dateOfOrganizing || '—', width: 120 },
  { key: 'occupationalSafetyAndHealth', label: 'OSH',              render: k => k.occupationalSafetyAndHealth ? '✓' : '—', width: 60, center: true },
  { key: 'dateOfOshTraining',       label: 'OSH Date',             render: k => k.dateOfOshTraining || '—', width: 120 },
  { key: 'genderSensitivityTraining',   label: 'GST',              render: k => k.genderSensitivityTraining ? '✓' : '—', width: 60, center: true },
  { key: 'dateOfGenderSensitivity', label: 'GST Date',             render: k => k.dateOfGenderSensitivity || '—', width: 120 },
  { key: 'basicFirstAidTraining',       label: 'First Aid',        render: k => k.basicFirstAidTraining ? '✓' : '—', width: 80, center: true },
  { key: 'dateOfBasicFirstAid',     label: 'First Aid Date',       render: k => k.dateOfBasicFirstAid || '—', width: 120 },
  { key: 'homeSecurityAwareness',       label: 'Home Security',    render: k => k.homeSecurityAwareness ? '✓' : '—', width: 110, center: true },
  { key: 'dateOfHomeSecurity',      label: 'Home Security Date',   render: k => k.dateOfHomeSecurity || '—', width: 140 },
  { key: 'kasambahayGeneralAssembly',   label: 'Gen. Assembly',    render: k => k.kasambahayGeneralAssembly ? '✓' : '—', width: 110, center: true },
  { key: 'dateOfGenAssembly',       label: 'Gen. Assembly Date',   render: k => k.dateOfGenAssembly || '—', width: 140 },
  { key: 'kasambahayDay',               label: 'K. Day',           render: k => k.kasambahayDay ? '✓' : '—', width: 70, center: true },
  { key: 'dateOfKasambahayDay',     label: 'K. Day Date',          render: k => k.dateOfKasambahayDay || '—', width: 120 },
  { key: 'disasterPreparedness',        label: 'Disaster Prep',    render: k => k.disasterPreparedness ? '✓' : '—', width: 100, center: true },
  { key: 'dateOfDisasterPreparedness',label: 'Disaster Prep Date', render: k => k.dateOfDisasterPreparedness || '—', width: 140 },
]

const BADGE_COLORS = {
  blue:   ['#dbeafe', '#1d4ed8'],
  gray:   ['#f0f0f0', '#555'],
  green:  ['#EAF3DE', '#3B6D11'],
  purple: ['#EEEDFE', '#534AB7'],
}

function Badge({ color, children }) {
  const [bg, fg] = BADGE_COLORS[color] || BADGE_COLORS.gray
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: bg, color: fg, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

function KasambahayData() {
  const [year, setYear]               = useState('')
  const [district, setDistrict]       = useState('')
  const [data, setData]               = useState([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [searched, setSearched]       = useState(false)
  const [search, setSearch]           = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [pagination, setPagination]   = useState(null)
  const [page, setPage]               = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const navigate = useNavigate()

  const fetchData = useCallback(async (pageNum = 1, searchVal = '', overrideYear = null, overrideDistrict = null) => {
    const targetYear = overrideYear || year;
    const targetDistrict = overrideDistrict || district;
    if (!targetYear || !targetDistrict) return

    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        year: targetYear,
        district: targetDistrict,
        page:  pageNum,
        limit: LIMIT,
        ...(searchVal ? { search: searchVal } : {}),
      })
      const res = await fetch(`${API_ENDPOINTS.KASAMBAHAY}?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store' // 💡 Bypasses browser cache to guarantee fresh data!
      });
      const json = await res.json()
      if (!res.ok) { setError(json.message); return }
      setData(json.data)
      setPagination(json.pagination)
      setSearched(true)
      setPage(pageNum)
    } catch {
      setError('Failed to fetch data.')
    } finally {
      setLoading(false)
    }
  }, [year, district])

  const handleFetch = () => {
    setSearch('')
    setSearchInput('')
    fetchData(1, '')
  }

  const handleSearch = () => {
    setSearch(searchInput)
    fetchData(1, searchInput)
  }

  const handleSearchKey = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  const sel = {
    height: 40, padding: '0 12px', fontSize: 14, borderRadius: 8,
    border: '1px solid #e4e4e7', background: '#fafafa', color: '#111',
    outline: 'none', cursor: 'pointer', minWidth: 160,
  }

  const pageBtn = (active) => ({
    height: 30, minWidth: 30, padding: '0 8px', borderRadius: 6,
    border: '1px solid #e4e4e7',
    background: active ? '#534AB7' : '#fff',
    color: active ? '#fff' : '#111',
    fontSize: 12, cursor: 'pointer', fontWeight: active ? 600 : 400,
  })

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#f9f9f9' }}>

      {/* Header */}
      {showAddModal && (
        <AddKasambahayModal 
          onClose={() => setShowAddModal(false)} 
          onSuccess={(newYear, newDistrict) => {
            setShowAddModal(false)
            // Instantly switch table to show the new record!
            setYear(newYear)
            setDistrict(newDistrict)
            fetchData(1, '', newYear, newDistrict)
          }} 
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888', padding: 0 }}
          >←</button>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111', margin: 0 }}>Kasambahay data</h2>
            <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Select year and district to view records</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          style={{ height: 38, padding: '0 16px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          + Add Kasambahay
        </button>
      </div>

      {/* Selector card */}
      <div style={{
        background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12,
        padding: '1.25rem 1.5rem', marginBottom: 20,
        display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Year</label>
          <select value={year} onChange={e => setYear(e.target.value)} style={sel}>
            <option value="">Select year</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#555', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>District</label>
          <select value={district} onChange={e => setDistrict(e.target.value)} style={sel}>
            <option value="">Select district</option>
            {DISTRICTS.map(d => <option key={d} value={d}>District {d}</option>)}
          </select>
        </div>
        <button
          onClick={handleFetch}
          disabled={!year || !district || loading}
          style={{
            height: 40, padding: '0 20px',
            background: (!year || !district) ? '#ccc' : '#111',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 500,
            cursor: (!year || !district) ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Loading...' : 'View records'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, padding: '10px 14px',
          fontSize: 13, color: '#ef4444', marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Results */}
      {searched && (
        <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12, overflow: 'hidden' }}>

          {/* Top bar */}
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid #e4e4e7',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>
                {year} — District {district}
              </span>
              {pagination && <Badge color="green">{pagination.total.toLocaleString()} total records</Badge>}
              {pagination && pagination.totalPages > 1 && (
                <Badge color="purple">Page {pagination.page} of {pagination.totalPages}</Badge>
              )}
            </div>

            {/* Search */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Search name or barangay..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKey}
                style={{
                  height: 34, padding: '0 12px', fontSize: 13,
                  border: '1px solid #e4e4e7', borderRadius: 8,
                  outline: 'none', background: '#fafafa', color: '#111', width: 220,
                }}
              />
              <button onClick={handleSearch} style={{ height: 34, padding: '0 14px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                Search
              </button>
              {search && (
                <button onClick={() => { setSearchInput(''); setSearch(''); fetchData(1, '') }} style={{ height: 34, padding: '0 14px', background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Scrollable table */}
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 320px)' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12, whiteSpace: 'nowrap' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {ALL_COLUMNS.map(col => (
                    <th
                      key={col.key}
                      style={{
                        padding: '8px 12px',
                        textAlign: col.center ? 'center' : 'left',
                        fontSize: 11, fontWeight: 600, color: '#555',
                        borderBottom: '2px solid #e4e4e7',
                        borderRight: '1px solid #f0f0f0',
                        minWidth: col.width,
                        maxWidth: col.width,
                        position: 'sticky', top: 0,
                        background: '#fafafa', zIndex: 1,
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={ALL_COLUMNS.length} style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={ALL_COLUMNS.length} style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                      No records found.
                    </td>
                  </tr>
                ) : data.map((k, i) => (
                  <tr
                    key={k._id}
                    style={{ borderBottom: '1px solid #f0f0f0' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafff8'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {ALL_COLUMNS.map(col => {
                      const value = col.render(k, i, page)
                      const badgeColor = col.badge ? col.badge(k) : null
                      return (
                        <td
                          key={col.key}
                          style={{
                            padding: '9px 12px',
                            color: col.bold ? '#111' : '#333',
                            fontWeight: col.bold ? 500 : 400,
                            textAlign: col.center ? 'center' : 'left',
                            borderRight: '1px solid #f5f5f5',
                            minWidth: col.width,
                            maxWidth: col.width,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {badgeColor
                            ? <Badge color={badgeColor}>{value}</Badge>
                            : value}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {pagination && pagination.totalPages > 1 && (
            <div style={{
              padding: '12px 16px', borderTop: '1px solid #e4e4e7',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 10, background: '#fff',
            }}>
              <span style={{ fontSize: 12, color: '#888' }}>
                Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, pagination.total)} of {pagination.total.toLocaleString()} records
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => fetchData(page - 1, search)}
                  disabled={page === 1 || loading}
                  style={{ ...pageBtn(false), opacity: page === 1 ? 0.4 : 1 }}
                >← Prev</button>

                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 2)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, idx) =>
                    p === '...' ? (
                      <span key={`e-${idx}`} style={{ padding: '0 4px', fontSize: 12, color: '#aaa', lineHeight: '30px' }}>…</span>
                    ) : (
                      <button key={p} onClick={() => fetchData(p, search)} disabled={loading} style={pageBtn(p === page)}>{p}</button>
                    )
                  )}

                <button
                  onClick={() => fetchData(page + 1, search)}
                  disabled={page === pagination.totalPages || loading}
                  style={{ ...pageBtn(false), opacity: page === pagination.totalPages ? 0.4 : 1 }}
                >Next →</button>
              </div>
            </div>
          )}


        </div>
      )}
    </div>
  )
}

function AddKasambahayModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '',
    year: new Date().getFullYear(), district: '1', barangay: '',
    birthday: '', age: '', civilStatus: '', mobileNumber: '',
    isMale: false, isFemale: false,
    monthlySalary: '', employerAddress: '', lengthOfService: '',
    isLiveIn: false, isLiveOut: false, isOnCall: false,
    isGeneralHousehelp: false, isCook: false, isLaundryPerson: false, isYaya: false, isGardener: false,
    sss: '', pagIbig: '', philhealth: '', qcid: '',
    isExOfw: false, isSoloParent: false, isPersonWithDisability: false, isSeniorCitizen: false,
    isQcVoter: '', noOfFamilyVoters: '', noOfKasambahayInFamily: '', workOfEmployer: '', isKapsaMember: false, isBcoopMember: false,
    kasambahayOrientation: false, dateOfOrientation: '',
    kasambahayOrganizing: false, dateOfOrganizing: '',
    occupationalSafetyAndHealth: false, dateOfOshTraining: '',
    genderSensitivityTraining: false, dateOfGenderSensitivity: '',
    basicFirstAidTraining: false, dateOfBasicFirstAid: '',
    homeSecurityAwareness: false, dateOfHomeSecurity: '',
    kasambahayGeneralAssembly: false, dateOfGenAssembly: '',
    kasambahayDay: false, dateOfKasambahayDay: '',
    disasterPreparedness: false, dateOfDisasterPreparedness: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleGender = (gender) => setFormData(prev => ({ ...prev, isMale: gender === 'male', isFemale: gender === 'female' }));
  const handleArrangement = (arr) => setFormData(prev => ({ ...prev, isLiveIn: arr === 'liveIn', isLiveOut: arr === 'liveOut', isOnCall: arr === 'onCall' }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(API_ENDPOINTS.KASAMBAHAY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Failed to save record.');
      onSuccess(formData.year, formData.district);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', height: 36, padding: '0 10px', fontSize: 13, border: '1px solid #e4e4e7', borderRadius: 6, outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' };
  const secTitle = { margin: '0 0 12px 0', fontSize: 14, color: '#111', borderBottom: '1px solid #eee', paddingBottom: 6 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 700, maxHeight: '90vh', borderRadius: 12, display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e4e4e7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Add New Kasambahay</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>&times;</button>
        </div>
        
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {error && <div style={{ background: '#fef2f2', color: '#ef4444', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13, border: '1px solid #fecaca' }}>{error}</div>}
          <form id="add-kasambahay-form" onSubmit={handleSubmit}>
            
            <h4 style={secTitle}>Personal Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><label style={labelStyle}>First Name *</label><input required name="firstName" value={formData.firstName} onChange={handleChange} style={inputStyle} /></div>
              <div><label style={labelStyle}>Middle Name</label><input name="middleName" value={formData.middleName} onChange={handleChange} style={inputStyle} /></div>
              <div><label style={labelStyle}>Last Name *</label><input required name="lastName" value={formData.lastName} onChange={handleChange} style={inputStyle} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><label style={labelStyle}>Birthday</label><input type="date" name="birthday" value={formData.birthday} onChange={handleChange} style={inputStyle} /></div>
              <div><label style={labelStyle}>Age</label><input type="number" name="age" value={formData.age} onChange={handleChange} style={inputStyle} /></div>
              <div><label style={labelStyle}>Mobile Number</label><input name="mobileNumber" value={formData.mobileNumber} onChange={handleChange} style={inputStyle} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div><label style={labelStyle}>Gender</label>
                <div style={{ display: 'flex', gap: 16, height: 36, alignItems: 'center' }}>
                  <label style={{ fontSize: 13 }}><input type="radio" checked={formData.isFemale} onChange={() => handleGender('female')} /> Female</label>
                  <label style={{ fontSize: 13 }}><input type="radio" checked={formData.isMale} onChange={() => handleGender('male')} /> Male</label>
                </div></div>
              <div><label style={labelStyle}>Civil Status</label><input name="civilStatus" value={formData.civilStatus} onChange={handleChange} style={inputStyle} /></div>
            </div>

            <h4 style={secTitle}>Location & Meta</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div><label style={labelStyle}>Year</label><input type="number" name="year" value={formData.year} onChange={handleChange} style={inputStyle} /></div>
              <div><label style={labelStyle}>District</label>
                <select name="district" value={formData.district} onChange={handleChange} style={inputStyle}>
                   {[1,2,3,4,5,6].map(d => <option key={d} value={d}>District {d}</option>)}
                </select></div>
              <div><label style={labelStyle}>Barangay</label><input name="barangay" value={formData.barangay} onChange={handleChange} style={inputStyle} /></div>
            </div>

            <h4 style={secTitle}>Employment Info</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><label style={labelStyle}>Monthly Salary (₱)</label><input type="number" name="monthlySalary" value={formData.monthlySalary} onChange={handleChange} style={inputStyle} /></div>
              <div><label style={labelStyle}>Employer Address</label><input name="employerAddress" value={formData.employerAddress} onChange={handleChange} style={inputStyle} /></div>
              <div><label style={labelStyle}>Length of Service</label><input name="lengthOfService" value={formData.lengthOfService} onChange={handleChange} style={inputStyle} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div><label style={labelStyle}>Arrangement</label>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, height: 36, alignItems: 'center' }}>
                  <label><input type="radio" checked={formData.isLiveIn} onChange={() => handleArrangement('liveIn')} /> Live-in</label>
                  <label><input type="radio" checked={formData.isLiveOut} onChange={() => handleArrangement('liveOut')} /> Live-out</label>
                  <label><input type="radio" checked={formData.isOnCall} onChange={() => handleArrangement('onCall')} /> On-call</label>
                </div></div>
              <div><label style={labelStyle}>Type of Work (Check all that apply)</label>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, minHeight: 36, alignItems: 'center' }}>
                  <label><input type="checkbox" name="isGeneralHousehelp" checked={formData.isGeneralHousehelp} onChange={handleChange} /> Househelp</label>
                  <label><input type="checkbox" name="isCook" checked={formData.isCook} onChange={handleChange} /> Cook</label>
                  <label><input type="checkbox" name="isLaundryPerson" checked={formData.isLaundryPerson} onChange={handleChange} /> Laundry</label>
                  <label><input type="checkbox" name="isYaya" checked={formData.isYaya} onChange={handleChange} /> Yaya</label>
                  <label><input type="checkbox" name="isGardener" checked={formData.isGardener} onChange={handleChange} /> Gardener</label>
                </div></div>
            </div>

            <h4 style={secTitle}>Government IDs</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>SSS</label>
                <select name="sss" value={formData.sss} onChange={handleChange} style={inputStyle}>
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Pag-IBIG</label>
                <select name="pagIbig" value={formData.pagIbig} onChange={handleChange} style={inputStyle}>
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>PhilHealth</label>
                <select name="philhealth" value={formData.philhealth} onChange={handleChange} style={inputStyle}>
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>QCID</label>
                <select name="qcid" value={formData.qcid} onChange={handleChange} style={inputStyle}>
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            <h4 style={secTitle}>Classifications & Other Info</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div><label style={labelStyle}>QC Voter?</label><input name="isQcVoter" value={formData.isQcVoter} onChange={handleChange} style={inputStyle} /></div>
              <div><label style={labelStyle}>Family Voters</label><input type="number" name="noOfFamilyVoters" value={formData.noOfFamilyVoters} onChange={handleChange} style={inputStyle} /></div>
              <div><label style={labelStyle}>Kasambahays in Fam</label><input type="number" name="noOfKasambahayInFamily" value={formData.noOfKasambahayInFamily} onChange={handleChange} style={inputStyle} /></div>
              <div><label style={labelStyle}>Employer's Work</label><input name="workOfEmployer" value={formData.workOfEmployer} onChange={handleChange} style={inputStyle} /></div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, marginBottom: 24, alignItems: 'center' }}>
              <label><input type="checkbox" name="isExOfw" checked={formData.isExOfw} onChange={handleChange} /> Ex-OFW</label>
              <label><input type="checkbox" name="isSoloParent" checked={formData.isSoloParent} onChange={handleChange} /> Solo Parent</label>
              <label><input type="checkbox" name="isPersonWithDisability" checked={formData.isPersonWithDisability} onChange={handleChange} /> PWD</label>
              <label><input type="checkbox" name="isSeniorCitizen" checked={formData.isSeniorCitizen} onChange={handleChange} /> Senior</label>
              <label><input type="checkbox" name="isKapsaMember" checked={formData.isKapsaMember} onChange={handleChange} /> KAPSA</label>
              <label><input type="checkbox" name="isBcoopMember" checked={formData.isBcoopMember} onChange={handleChange} /> BCOOP</label>
            </div>

            <h4 style={secTitle}>Trainings & Seminars</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              {[
                { label: 'Orientation', check: 'kasambahayOrientation', date: 'dateOfOrientation' },
                { label: 'Organizing', check: 'kasambahayOrganizing', date: 'dateOfOrganizing' },
                { label: 'OSH', check: 'occupationalSafetyAndHealth', date: 'dateOfOshTraining' },
                { label: 'GST', check: 'genderSensitivityTraining', date: 'dateOfGenderSensitivity' },
                { label: 'First Aid', check: 'basicFirstAidTraining', date: 'dateOfBasicFirstAid' },
                { label: 'Home Security', check: 'homeSecurityAwareness', date: 'dateOfHomeSecurity' },
                { label: 'Gen. Assembly', check: 'kasambahayGeneralAssembly', date: 'dateOfGenAssembly' },
                { label: 'K. Day', check: 'kasambahayDay', date: 'dateOfKasambahayDay' },
                { label: 'Disaster Prep', check: 'disasterPreparedness', date: 'dateOfDisasterPreparedness' },
              ].map((t) => (
                <div key={t.check} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 140, fontSize: 13 }}>
                    <label><input type="checkbox" name={t.check} checked={formData[t.check]} onChange={handleChange} /> {t.label}</label>
                  </div>
                  <div style={{ flex: 1 }}>
                    <input type="date" name={t.date} value={formData[t.date]} onChange={handleChange} disabled={!formData[t.check]} style={{ ...inputStyle, background: formData[t.check] ? '#fff' : '#f4f4f5' }} />
                  </div>
                </div>
              ))}
            </div>
          </form>
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #e4e4e7', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose} style={{ height: 38, padding: '0 16px', background: '#f4f4f5', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <button type="submit" form="add-kasambahay-form" disabled={loading} style={{ height: 38, padding: '0 20px', background: '#111', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
            {loading ? 'Saving...' : 'Save Record'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default KasambahayData