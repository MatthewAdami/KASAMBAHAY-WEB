import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const YEARS = [2024, 2025]
const DISTRICTS = [1, 2, 3, 4, 5, 6]

function KasambahayData() {
  const [year, setYear] = useState('')
  const [district, setDistrict] = useState('')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const handleFetch = async () => {
    if (!year || !district) return
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('token')
      const res = await fetch(
        `http://localhost:5000/api/kasambahay?year=${year}&district=${district}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const json = await res.json()
      if (!res.ok) { setError(json.message); return }
      setData(json)
      setSearched(true)
    } catch {
      setError('Failed to fetch data.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = data.filter(k => {
    const s = search.toLowerCase()
    return (
      k.lastName?.toLowerCase().includes(s) ||
      k.firstName?.toLowerCase().includes(s) ||
      k.barangay?.toLowerCase().includes(s)
    )
  })

  const sel = {
    height: 40, padding: '0 12px', fontSize: 14, borderRadius: 8,
    border: '1px solid #e4e4e7', background: '#fafafa', color: '#111',
    outline: 'none', cursor: 'pointer', minWidth: 160
  }
  const badge = (color) => {
    const map = { green: ['#EAF3DE','#3B6D11'], gray: ['#f0f0f0','#555'] }
    return { fontSize: 11, padding: '2px 8px', borderRadius: 20, background: map[color][0], color: map[color][1] }
  }

  return (
    <div style={{ padding: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={() => navigate('/admin/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#888', padding: 0 }}
        >←</button>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111', margin: 0 }}>Kasambahay data</h2>
          <p style={{ fontSize: 13, color: '#888', margin: 0 }}>Select year and district to view records</p>
        </div>
      </div>

      {/* Selector card */}
      <div style={{
        background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12,
        padding: '1.25rem 1.5rem', marginBottom: 20,
        display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap'
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
            height: 40, padding: '0 20px', background: (!year || !district) ? '#ccc' : '#111',
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 14,
            fontWeight: 500, cursor: (!year || !district) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Loading...' : 'View records'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Results */}
      {searched && (
        <div style={{ background: '#fff', border: '1px solid #e4e4e7', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e4e4e7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>
                {year} — District {district}
              </span>
              <span style={{ ...badge('green') }}>{filtered.length} records</span>
            </div>
            <input
              type="text"
              placeholder="Search name or barangay..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                height: 34, padding: '0 12px', fontSize: 13,
                border: '1px solid #e4e4e7', borderRadius: 8,
                outline: 'none', background: '#fafafa', color: '#111', width: 220
              }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['#','Last name','First name','Middle name','Barangay','Birthday','Age','Civil status','Education','Monthly salary','Gender','Type','Mobile'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#888', borderBottom: '1px solid #e4e4e7', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={13} style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 13 }}>No records found.</td></tr>
                ) : filtered.map((k, i) => (
                  <tr key={k._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 12px', color: '#aaa' }}>{i + 1}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 500, color: '#111' }}>{k.lastName}</td>
                    <td style={{ padding: '10px 12px', color: '#111' }}>{k.firstName}</td>
                    <td style={{ padding: '10px 12px', color: '#111' }}>{k.middleName}</td>
                    <td style={{ padding: '10px 12px', color: '#111' }}>{k.barangay}</td>
                    <td style={{ padding: '10px 12px', color: '#111', whiteSpace: 'nowrap' }}>
                      {k.birthday ? new Date(k.birthday).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#111' }}>{k.age || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#111' }}>{k.civilStatus || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#111', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.educationalAttainment || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#111' }}>
                      {k.monthlySalary ? `₱${k.monthlySalary.toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={badge('gray')}>{k.isFemale ? 'Female' : k.isMale ? 'Male' : '—'}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#111', whiteSpace: 'nowrap' }}>
                      {k.isGeneralHousehelp ? 'Househelp' : k.isCook ? 'Cook' : k.isLaundryPerson ? 'Laundry' : k.isYaya ? 'Yaya' : k.isGardener ? 'Gardener' : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#111' }}>{k.mobileNumber || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default KasambahayData