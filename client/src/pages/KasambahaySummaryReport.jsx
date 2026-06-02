import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

import { API_ENDPOINTS } from '../utils/api'
const API_URL = API_ENDPOINTS.KASAMBAHAY
const DISTRICTS = ['District 1','District 2','District 3','District 4','District 5','District 6'];
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 2023 }, (_, i) => 2024 + i);

// ─── Apply filters to raw records ────────────────────────────────────────────
function applyFilters(records, { year, district, sex, arrangement }) {
  return records.filter(r => {
    if (year        && r.year !== Number(year))     return false;
    if (district    && r.district !== district)     return false;
    if (sex === 'female' && !r.isFemale)            return false;
    if (sex === 'male'   && !r.isMale)              return false;
    if (arrangement === 'livein'  && !r.isLiveIn)   return false;
    if (arrangement === 'liveout' && !r.isLiveOut)  return false;
    if (arrangement === 'oncall'  && !r.isOnCall)   return false;
    return true;
  });
}

// ─── Aggregate all records into the summary shape ────────────────────────────
function buildSummary(records) {
  const blank = () => ({
    subtotal: 0,
    ...Object.fromEntries(YEARS.map(y => [`enc${y}`, 0])),
    sss: 0, philhealth: 0, pagibig: 0, qcid: 0,
    female: 0, male: 0,
    liveIn: 0, liveOut: 0, onCall: 0,
    senior: 0, soloParent: 0, exOfw: 0, pwd: 0,
    orientation: 0, organizing: 0, osh: 0,
    genderSens: 0, firstAid: 0, homeSec: 0,
    genHouse: 0, cook: 0, laundry: 0, yaya: 0, gardener: 0,
    age15below: 0, age1830: 0, age3145: 0, age45above: 0,
  });

  const map = {};
  DISTRICTS.forEach(d => { map[d] = { district: d, ...blank() }; });

  for (const r of records) {
    const d = map[r.district];
    if (!d) continue;
    d.subtotal++;
    YEARS.forEach(y => { if (r.year === y) d[`enc${y}`]++ });
    if (r.sss)        d.sss++;
    if (r.philhealth) d.philhealth++;
    if (r.pagIbig)    d.pagibig++;
    if (r.qcid)       d.qcid++;
    if (r.isFemale)   d.female++;
    if (r.isMale)     d.male++;
    if (r.isLiveIn)   d.liveIn++;
    if (r.isLiveOut)  d.liveOut++;
    if (r.isOnCall)   d.onCall++;
    if (r.isSeniorCitizen)         d.senior++;
    if (r.isSoloParent)            d.soloParent++;
    if (r.isExOfw)                 d.exOfw++;
    if (r.isPersonWithDisability)  d.pwd++;
    if (r.kasambahayOrientation)        d.orientation++;
    if (r.kasambahayOrganizing)         d.organizing++;
    if (r.occupationalSafetyAndHealth)  d.osh++;
    if (r.genderSensitivityTraining)    d.genderSens++;
    if (r.basicFirstAidTraining)        d.firstAid++;
    if (r.homeSecurityAwareness)        d.homeSec++;
    if (r.isGeneralHousehelp) d.genHouse++;
    if (r.isCook)             d.cook++;
    if (r.isLaundryPerson)    d.laundry++;
    if (r.isYaya)             d.yaya++;
    if (r.isGardener)         d.gardener++;
    const age = r.age || 0;
    if (age <= 15)      d.age15below++;
    else if (age <= 30) d.age1830++;
    else if (age <= 45) d.age3145++;
    else                d.age45above++;
  }

  return DISTRICTS.map(d => map[d]);
}

function buildTotals(rows) {
  const keys = Object.keys(rows[0]).filter(k => k !== 'district');
  const t = { district: 'TOTAL' };
  for (const k of keys) t[k] = rows.reduce((s, r) => s + (r[k] || 0), 0);
  return t;
}

function buildPct(rows) {
  return rows.map(r => ({
    district:   r.district,
    sss:        r.subtotal ? +((r.sss        / r.subtotal) * 100).toFixed(2) : 0,
    philhealth: r.subtotal ? +((r.philhealth / r.subtotal) * 100).toFixed(2) : 0,
    pagibig:    r.subtotal ? +((r.pagibig    / r.subtotal) * 100).toFixed(2) : 0,
    qcid:       r.subtotal ? +((r.qcid       / r.subtotal) * 100).toFixed(2) : 0,
  }));
}

function buildBarangay(records) {
  const map = {};
  DISTRICTS.forEach(d => { map[d] = {}; });
  for (const r of records) {
    if (!map[r.district]) continue;
    const brgy = (r.barangay || '(Blank)').trim().toUpperCase();
    map[r.district][brgy] = (map[r.district][brgy] || 0) + 1;
  }
  const result = {};
  for (const d of DISTRICTS) {
    result[d] = Object.entries(map[d])
      .map(([barangay, count]) => ({ barangay, count }))
      .sort((a, b) => a.barangay.localeCompare(b.barangay));
  }
  return result;
}

// ─── Export to Excel ─────────────────────────────────────────────────────────
function exportToExcel(rows, totals, pctRows, barangay, rawRecords, fileName) {
  const wb = XLSX.utils.book_new();
  const autoWidth = (data) =>
    data[0]?.map((_, ci) => ({
      wch: Math.max(...data.map(row => String(row[ci] ?? '').length), 8),
    }));

  // Masterlist
  const masterHeaders = [
    'No.','Last Name','First Name','Middle Name','District','Barangay',
    'Age','Sex','Civil Status','Home Address','Nature of Work',
    'Employment Arrangement','Monthly Salary','Remarks'
  ];
  const masterRows = (rawRecords || []).map((item, index) => {
    const sex  = item.isFemale ? 'Female' : item.isMale ? 'Male' : '-';
    const work = item.isGeneralHousehelp ? 'General Househelp'
               : item.isCook            ? 'Cook'
               : item.isLaundryPerson   ? 'Laundry'
               : item.isYaya            ? 'Yaya'
               : item.isGardener        ? 'Gardener' : '-';
    const arr  = item.isLiveIn  ? 'Live-in'
               : item.isLiveOut ? 'Live-out'
               : item.isOnCall  ? 'On-call' : '-';
    return [
      index + 1,
      item.lastName?.toUpperCase()   || '-',
      item.firstName?.toUpperCase()  || '-',
      item.middleName?.toUpperCase() || '-',
      item.district    || '-', item.barangay  || '-',
      item.age         || '-', sex,
      item.civilStatus || '-', item.address   || '-',
      work, arr, item.salary || '-', item.remarks || '-'
    ];
  });
  const masterData = [masterHeaders, ...masterRows];
  const wsMaster = XLSX.utils.aoa_to_sheet(masterData);
  wsMaster['!cols'] = autoWidth(masterData);
  XLSX.utils.book_append_sheet(wb, wsMaster, 'Masterlist');

  // District Overview
  const ovHeaders = [
    'District',...YEARS.map(y => `Encoded ${y}`),'Sub Total',
    'SSS','PhilHealth','Pag-IBIG','QCID',
    'Female','Male','Live-In','Live-Out','On-Call',
    'Senior','Solo Parent','Ex-OFW','PWD',
  ];
  const ovData = [
    ovHeaders,
    ...rows.map(r => [r.district,...YEARS.map(y => r[`enc${y}`]),r.subtotal,r.sss,r.philhealth,r.pagibig,r.qcid,r.female,r.male,r.liveIn,r.liveOut,r.onCall,r.senior,r.soloParent,r.exOfw,r.pwd]),
    ['TOTAL',...YEARS.map(y => totals[`enc${y}`]),totals.subtotal,totals.sss,totals.philhealth,totals.pagibig,totals.qcid,totals.female,totals.male,totals.liveIn,totals.liveOut,totals.onCall,totals.senior,totals.soloParent,totals.exOfw,totals.pwd],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(ovData);
  ws1['!cols'] = autoWidth(ovData);
  XLSX.utils.book_append_sheet(wb, ws1, 'District Overview');

  // Training & Work
  const wkHeaders = ['District','Kasambahay Orientation','Kasambahay Organizing','Occupational Safety','Gender Sensitivity','Basic First Aid','Home Security','General Househelp','Cook','Laundry','Yaya','Gardener'];
  const wkData = [
    wkHeaders,
    ...rows.map(r => [r.district,r.orientation,r.organizing,r.osh,r.genderSens,r.firstAid,r.homeSec,r.genHouse,r.cook,r.laundry,r.yaya,r.gardener]),
    ['TOTAL',totals.orientation,totals.organizing,totals.osh,totals.genderSens,totals.firstAid,totals.homeSec,totals.genHouse,totals.cook,totals.laundry,totals.yaya,totals.gardener],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(wkData);
  ws2['!cols'] = autoWidth(wkData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Training & Work Type');

  // Age Brackets
  const ageBrackets = [
    { label: '15 and below', key: 'age15below' },
    { label: '18–30',        key: 'age1830'    },
    { label: '31–45',        key: 'age3145'    },
    { label: '45 and above', key: 'age45above' },
  ];
  const ageData = [
    ['Age Bracket', ...DISTRICTS, 'TOTAL'],
    ...ageBrackets.map(({ label, key }) => [
      label,
      ...rows.map(r => r[key] || 0),
      rows.reduce((s, r) => s + (r[key] || 0), 0),
    ]),
    ['SUBTOTAL', ...rows.map(r => r.subtotal), totals.subtotal],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(ageData);
  ws3['!cols'] = autoWidth(ageData);
  XLSX.utils.book_append_sheet(wb, ws3, 'Age Brackets');

  // Benefit Coverage %
  const pctData = [
    ['District','SSS %','PhilHealth %','Pag-IBIG %','QCID %'],
    ...pctRows.map(r => [r.district,`${r.sss.toFixed(2)}%`,`${r.philhealth.toFixed(2)}%`,`${r.pagibig.toFixed(2)}%`,`${r.qcid.toFixed(2)}%`]),
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(pctData);
  ws4['!cols'] = autoWidth(pctData);
  XLSX.utils.book_append_sheet(wb, ws4, 'Benefit Coverage');

  // Per Barangay
  const brgyRows = [['District','Barangay','Count']];
  for (const dist of DISTRICTS) {
    const list = barangay[dist] || [];
    list.forEach(b => brgyRows.push([dist, b.barangay, b.count]));
    brgyRows.push([dist, 'Grand Total', list.reduce((s, b) => s + b.count, 0)]);
    brgyRows.push([]);
  }
  const ws5 = XLSX.utils.aoa_to_sheet(brgyRows);
  ws5['!cols'] = autoWidth(brgyRows.filter(r => r.length > 0));
  XLSX.utils.book_append_sheet(wb, ws5, 'Per Barangay');

  XLSX.writeFile(wb, `${fileName || 'Kasambahay_Summary_Report'}.xlsx`);
}

// ─── Fetch ALL pages ──────────────────────────────────────────────────────────
async function fetchAll(token) {
  let page = 1, all = [];
  while (true) {
    const res = await fetch(`${API_URL}?limit=500&page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const json = await res.json();
    const rows = json.data || json || [];
    all = all.concat(rows);
    const { totalPages } = json.pagination || {};
    if (!totalPages || page >= totalPages) break;
    page++;
  }
  return all;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page:       { padding: '20px 16px', fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: '13px', color: '#222', background: '#f8f8fb', minHeight: '100vh' },
  card:       { background: '#fff', borderRadius: '10px', border: '1px solid #e4e2f5', marginBottom: '20px', overflow: 'hidden' },
  metric:     { background: '#f3f1fd', borderRadius: '8px', padding: '12px 14px', textAlign: 'center' },
  metricGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '12px', padding: '16px' },
  metricLabel:{ fontSize: '11px', color: '#7874a7', marginBottom: '4px' },
  metricVal:  { fontSize: '22px', fontWeight: '700', color: '#534AB7' },
  tabBar:     { display: 'flex', borderBottom: '2px solid #e4e2f5', background: '#fff', padding: '0 16px', flexWrap: 'wrap' },
  tab: (a) => ({
    padding: '10px 16px', fontWeight: a ? '700' : '500', fontSize: '13px',
    color: a ? '#534AB7' : '#888', background: 'none', border: 'none',
    borderBottom: `2px solid ${a ? '#534AB7' : 'transparent'}`,
    marginBottom: '-2px', cursor: 'pointer',
  }),
  tbl:  { width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '860px' },
  th:   { background: '#f0eefb', color: '#534AB7', fontWeight: '600', padding: '8px 10px', textAlign: 'center', borderBottom: '2px solid #d5d0f0', borderRight: '1px solid #e0dcf5', whiteSpace: 'nowrap', fontSize: '11px' },
  thL:  { background: '#f0eefb', color: '#534AB7', fontWeight: '600', padding: '8px 10px', textAlign: 'left',   borderBottom: '2px solid #d5d0f0', borderRight: '1px solid #e0dcf5', whiteSpace: 'nowrap', fontSize: '11px' },
  td:   { padding: '7px 10px', textAlign: 'center', borderBottom: '1px solid #eeeaf8', borderRight: '1px solid #f0ecf9', color: '#333' },
  tdL:  { padding: '7px 10px', textAlign: 'left',   borderBottom: '1px solid #eeeaf8', borderRight: '1px solid #f0ecf9', color: '#333', fontWeight: '600', whiteSpace: 'nowrap' },
  tot:  { background: '#edeaf9', fontWeight: '700', color: '#3c3289' },
  btn:  { padding: '9px 20px', color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' },
  sel:  { padding: '5px 8px', borderRadius: '6px', border: '1px solid #d5d0f0', fontSize: '12px', color: '#333', background: '#fff', cursor: 'pointer', minWidth: '120px' },
};

const n   = (v) => (v || 0).toLocaleString();
const pct = (v) => `${(v || 0).toFixed(2)}%`;

// ─── Row renderers ────────────────────────────────────────────────────────────
const OvRow = ({ r, isT, even }) => {
  const ts = isT ? S.tot : { background: even === false ? '#faf9fe' : '#fff' };
  return (
    <tr style={ts}>
      <td style={{ ...S.tdL, ...ts }}>{r.district}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.enc2024)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.enc2025)}</td>
      <td style={{ ...S.td,  ...ts, fontWeight: '700' }}>{n(r.subtotal)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.sss)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.philhealth)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.pagibig)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.qcid)}</td>
      <td style={{ ...S.td,  ...ts, color: isT ? '#3c3289' : '#993556' }}>{n(r.female)}</td>
      <td style={{ ...S.td,  ...ts, color: isT ? '#3c3289' : '#185fa5' }}>{n(r.male)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.liveIn)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.liveOut)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.onCall)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.senior)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.soloParent)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.exOfw)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.pwd)}</td>
    </tr>
  );
};

const WkRow = ({ r, isT, even }) => {
  const ts = isT ? S.tot : { background: even === false ? '#faf9fe' : '#fff' };
  return (
    <tr style={ts}>
      <td style={{ ...S.tdL, ...ts }}>{r.district}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.orientation)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.organizing)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.osh)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.genderSens)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.firstAid)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.homeSec)}</td>
      <td style={{ ...S.td,  ...ts, fontWeight: '700' }}>{n(r.genHouse)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.cook)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.laundry)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.yaya)}</td>
      <td style={{ ...S.td,  ...ts }}>{n(r.gardener)}</td>
    </tr>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const KasambahaySummaryReport = () => {
  const [rawRecords, setRawRecords] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [tab,        setTab]        = useState('overview');

  // Filter state
  const [filterYear,        setFilterYear]        = useState('');
  const [filterDistrict,    setFilterDistrict]    = useState('');
  const [filterSex,         setFilterSex]         = useState('');
  const [filterArrangement, setFilterArrangement] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const token   = localStorage.getItem('token');
        const records = await fetchAll(token);
        setRawRecords(records);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Derive filtered records
  const activeFilters  = { year: filterYear, district: filterDistrict, sex: filterSex, arrangement: filterArrangement };
  const hasFilter      = Object.values(activeFilters).some(Boolean);
  const displayRecords = hasFilter ? applyFilters(rawRecords, activeFilters) : rawRecords;
  const resetFilters   = () => { setFilterYear(''); setFilterDistrict(''); setFilterSex(''); setFilterArrangement(''); };

  // Re-aggregate from displayRecords
  const rows    = buildSummary(displayRecords);
  const totals  = rows.length ? buildTotals(rows) : null;
  const tot     = totals || {};
  const pctRows = totals
    ? [...buildPct(rows), {
        district:   'All Districts',
        sss:        tot.subtotal ? +((tot.sss        / tot.subtotal) * 100).toFixed(2) : 0,
        philhealth: tot.subtotal ? +((tot.philhealth / tot.subtotal) * 100).toFixed(2) : 0,
        pagibig:    tot.subtotal ? +((tot.pagibig    / tot.subtotal) * 100).toFixed(2) : 0,
        qcid:       tot.subtotal ? +((tot.qcid       / tot.subtotal) * 100).toFixed(2) : 0,
      }]
    : [];
  const barangay     = buildBarangay(displayRecords);

  const ageTableRows = [
    { label: '15 and below', key: 'age15below' },
    { label: '18–30',        key: 'age1830'    },
    { label: '31–45',        key: 'age3145'    },
    { label: '45 and above', key: 'age45above' },
  ];

  const filterLabel = [
    filterYear        ? `Y${filterYear}`               : '',
    filterDistrict    ? filterDistrict.replace(' ','')  : '',
    filterSex         ? filterSex                       : '',
    filterArrangement ? filterArrangement               : '',
  ].filter(Boolean).join('_');

  if (loading) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
      <div style={{ textAlign: 'center', color: '#534AB7' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
        <div style={{ fontWeight: '600' }}>Loading summary data…</div>
        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Fetching all records from the database</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
      <div style={{ textAlign: 'center', color: '#c0392b' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
        <div style={{ fontWeight: '600' }}>Failed to load data</div>
        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>{error}</div>
      </div>
    </div>
  );

  return (
    <div style={S.page}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '20px', color: '#2d2a6e', fontWeight: '700' }}>
            Kasambahay Summary Report
          </h2>
          <p style={{ margin: 0, color: '#888', fontSize: '12px' }}>
            All 6 Districts · Combined {YEARS.join(' & ')} ·
            Generated: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
            {hasFilter && (
              <span style={{ marginLeft: '8px', color: '#e67e22', fontWeight: '600' }}>
                ● Filtered view active
              </span>
            )}
          </p>
        </div>
        <div className="hide-on-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Full export — always all records */}
          <button
            onClick={() => {
              const allRows = buildSummary(rawRecords);
              const allTots = buildTotals(allRows);
              exportToExcel(allRows, allTots, buildPct(allRows), buildBarangay(rawRecords), rawRecords, 'Kasambahay_Masterlist_and_Summary');
            }}
            style={{ ...S.btn, background: '#10b981' }}
          >
            📊 Export to Excel
          </button>

          {/* Filtered export — only when a filter is active */}
          {hasFilter && (
            <button
              onClick={() => exportToExcel(rows, totals, pctRows, barangay, displayRecords, `Kasambahay_Filtered_${filterLabel}`)}
              style={{ ...S.btn, background: '#e67e22' }}
            >
              🔽 Export Filtered ({displayRecords.length.toLocaleString()})
            </button>
          )}

          <button onClick={() => window.print()} style={{ ...S.btn, background: '#534AB7' }}>
            🖨️ Print / Save as PDF
          </button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div style={S.card}>
        <div style={S.metricGrid}>
          {[
            { label: 'Total Registered', val: n(tot.subtotal)   },
            ...YEARS.map(y => ({ label: `Encoded ${y}`, val: n(tot[`enc${y}`] || 0) })),
            { label: 'SSS Covered',      val: n(tot.sss)        },
            { label: 'PhilHealth',       val: n(tot.philhealth) },
            { label: 'Pag-IBIG',         val: n(tot.pagibig)    },
            { label: 'QCID',             val: n(tot.qcid)       },
            { label: 'Female',           val: n(tot.female)     },
            { label: 'Male',             val: n(tot.male)       },
          ].map(m => (
            <div key={m.label} style={S.metric}>
              <div style={S.metricLabel}>{m.label}</div>
              <div style={S.metricVal}>{m.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs Card (Filter Bar + Tabs + Content) ── */}
      <div style={S.card}>

        {/* Filter Bar — lives at the top of the card */}
        <div
          className="hide-on-print"
          style={{
            display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end',
            padding: '12px 16px', background: '#f8f7fd', borderBottom: '1px solid #e4e2f5',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#534AB7', alignSelf: 'center' }}>
            🔍 Filters:
          </span>

          {[
            { label: 'Year',        value: filterYear,        setter: setFilterYear,
              options: [['','All Years'], ...YEARS.map(y => [String(y), String(y)])] },
            { label: 'District',    value: filterDistrict,    setter: setFilterDistrict,
              options: [['','All Districts'], ...DISTRICTS.map(d => [d, d])] },
            { label: 'Sex',         value: filterSex,         setter: setFilterSex,
              options: [['','All'], ['female','Female'], ['male','Male']] },
            { label: 'Arrangement', value: filterArrangement, setter: setFilterArrangement,
              options: [['','All'], ['livein','Live-In'], ['liveout','Live-Out'], ['oncall','On-Call']] },
          ].map(({ label, value, setter, options }) => (
            <div key={label}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#7874a7', marginBottom: '3px' }}>{label}</div>
              <select value={value} onChange={e => setter(e.target.value)} style={S.sel}>
                {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
              </select>
            </div>
          ))}

          {hasFilter && (
            <>
              <button
                onClick={resetFilters}
                style={{ padding: '5px 12px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '12px', alignSelf: 'flex-end' }}
              >
                ✕ Reset
              </button>
              <span style={{ fontSize: '12px', color: '#e67e22', fontWeight: '600', alignSelf: 'center' }}>
                {displayRecords.length.toLocaleString()} / {rawRecords.length.toLocaleString()} records
              </span>
            </>
          )}
        </div>

        {/* Tab Bar */}
        <div style={S.tabBar}>
          {[
            { key: 'overview',  label: 'District Overview'    },
            { key: 'work',      label: 'Training & Work Type' },
            { key: 'age',       label: 'Age Brackets'         },
            { key: 'benefits',  label: 'Benefit Coverage %'   },
            { key: 'barangay',  label: 'Per Barangay'         },
          ].map(t => (
            <button key={t.key} style={S.tab(tab === t.key)} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── District Overview ── */}
        {tab === 'overview' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...S.tbl, tableLayout: 'fixed', minWidth: '1300px' }}>
              <colgroup>
                <col style={{ width: '90px' }} />
                {Array(7).fill(0).map((_, i) => <col key={i} style={{ width: '72px' }} />)}
                <col style={{ width: '68px' }} /><col style={{ width: '58px' }} />
                {Array(3).fill(0).map((_, i) => <col key={`a${i}`} style={{ width: '68px' }} />)}
                <col style={{ width: '60px' }} /><col style={{ width: '78px' }} />
                <col style={{ width: '64px' }} /><col style={{ width: '54px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={S.thL} rowSpan={2}>District</th>
                  {YEARS.map(y => <th key={y} style={S.th} rowSpan={2}>Encoded {y}</th>)}
                  <th style={S.th}  rowSpan={2}>Sub Total</th>
                  <th style={S.th}  rowSpan={2}>SSS</th>
                  <th style={S.th}  rowSpan={2}>PhilHealth</th>
                  <th style={S.th}  rowSpan={2}>Pag-IBIG</th>
                  <th style={S.th}  rowSpan={2}>QCID</th>
                  <th style={{ ...S.th, background: '#fce8f0', color: '#993556' }} colSpan={2}>Gender</th>
                  <th style={S.th}  colSpan={3}>Arrangement</th>
                  <th style={S.th}  colSpan={4}>Special Categories</th>
                </tr>
                <tr>
                  <th style={{ ...S.th, background: '#fce8f0', color: '#993556' }}>Female</th>
                  <th style={{ ...S.th, background: '#e6f1fb', color: '#185fa5' }}>Male</th>
                  <th style={S.th}>Live-In</th>
                  <th style={S.th}>Live-Out</th>
                  <th style={S.th}>On-Call</th>
                  <th style={S.th}>Senior</th>
                  <th style={S.th}>Solo Parent</th>
                  <th style={S.th}>Ex-OFW</th>
                  <th style={S.th}>PWD</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => <OvRow key={r.district} r={r} isT={false} even={i % 2 === 0} />)}
                {totals && <OvRow r={totals} isT={true} />}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Training & Work Type ── */}
        {tab === 'work' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...S.tbl, tableLayout: 'fixed', minWidth: '1100px' }}>
              <colgroup>
                <col style={{ width: '90px' }} />
                {Array(6).fill(0).map((_, i) => <col key={i} style={{ width: '130px' }} />)}
                {Array(5).fill(0).map((_, i) => <col key={`w${i}`} style={{ width: '110px' }} />)}
              </colgroup>
              <thead>
                <tr>
                  <th style={S.thL} rowSpan={2}>District</th>
                  <th style={{ ...S.th, background: '#e8f3e8', color: '#3b6d11' }} colSpan={6}>Trainings / Programs</th>
                  <th style={{ ...S.th, background: '#faeeda', color: '#854f0b' }} colSpan={5}>Nature of Work</th>
                </tr>
                <tr>
                  {['Kasambahay Orientation','Kasambahay Organizing','Occupational Safety','Gender Sensitivity','Basic First Aid','Home Security'].map(h => (
                    <th key={h} style={{ ...S.th, background: '#f0f7f0', color: '#3b6d11' }}>{h}</th>
                  ))}
                  {['General Househelp','Cook','Laundry','Yaya','Gardener'].map(h => (
                    <th key={h} style={{ ...S.th, background: '#fef5e0', color: '#854f0b' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => <WkRow key={r.district} r={r} isT={false} even={i % 2 === 0} />)}
                {totals && <WkRow r={totals} isT={true} />}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Age Brackets ── */}
        {tab === 'age' && (
          <div style={{ padding: '16px', overflowX: 'auto' }}>
            <table style={{ ...S.tbl, minWidth: '600px' }}>
              <thead>
                <tr>
                  <th style={S.thL}>Age Bracket</th>
                  {DISTRICTS.map(d => <th key={d} style={S.th}>{d}</th>)}
                  <th style={{ ...S.th, color: '#2d2a6e', fontWeight: '700' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {ageTableRows.map(({ label, key }, i) => (
                  <tr key={key} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fe' }}>
                    <td style={S.tdL}>{label}</td>
                    {rows.map(r => <td key={r.district} style={S.td}>{n(r[key])}</td>)}
                    <td style={{ ...S.td, fontWeight: '700', color: '#534AB7' }}>
                      {n(rows.reduce((s, r) => s + (r[key] || 0), 0))}
                    </td>
                  </tr>
                ))}
                <tr style={S.tot}>
                  <td style={{ ...S.tdL, ...S.tot }}>SUBTOTAL</td>
                  {rows.map(r => <td key={r.district} style={{ ...S.td, ...S.tot }}>{n(r.subtotal)}</td>)}
                  <td style={{ ...S.td, ...S.tot }}>{n(tot.subtotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── Benefit Coverage % ── */}
        {tab === 'benefits' && (
          <div style={{ padding: '16px', overflowX: 'auto' }}>
            <table style={{ ...S.tbl, minWidth: '500px' }}>
              <thead>
                <tr>
                  <th style={S.thL}>District</th>
                  <th style={S.th}>SSS</th>
                  <th style={S.th}>PhilHealth</th>
                  <th style={S.th}>Pag-IBIG</th>
                  <th style={S.th}>QCID</th>
                </tr>
              </thead>
              <tbody>
                {pctRows.map((r, i) => {
                  const isAll = r.district === 'All Districts';
                  return (
                    <tr key={r.district} style={isAll ? S.tot : { background: i % 2 === 0 ? '#fff' : '#faf9fe' }}>
                      <td style={{ ...S.tdL, ...(isAll ? S.tot : {}) }}>{r.district}</td>
                      {['sss','philhealth','pagibig','qcid'].map(k => (
                        <td key={k} style={{ ...S.td, ...(isAll ? S.tot : {}) }}>{pct(r[k])}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Per Barangay ── */}
        {tab === 'barangay' && (
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {DISTRICTS.map(d => {
                const brgyList   = barangay[d] || [];
                const grandTotal = brgyList.reduce((s, b) => s + b.count, 0);
                return (
                  <div key={d} style={{ border: '1px solid #e4e2f5', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ background: '#534AB7', color: '#fff', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '12px' }}>{d}</span>
                      <span style={{ fontSize: '11px', opacity: 0.85 }}>COUNTA of KASAMBAHAY</span>
                    </div>
                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <tbody>
                          {brgyList.length === 0
                            ? <tr><td style={{ ...S.td, textAlign: 'center', color: '#aaa', padding: '16px' }}>No barangay data</td></tr>
                            : brgyList.map((b, i) => (
                                <tr key={b.barangay} style={{ background: i % 2 === 0 ? '#fff' : '#faf9fe' }}>
                                  <td style={{ ...S.tdL, fontWeight: '400', fontSize: '12px', paddingLeft: '12px' }}>{b.barangay}</td>
                                  <td style={{ ...S.td, fontWeight: '600', color: '#534AB7', paddingRight: '12px' }}>{n(b.count)}</td>
                                </tr>
                              ))
                          }
                        </tbody>
                      </table>
                    </div>
                    <div style={{ background: '#edeaf9', borderTop: '2px solid #d5d0f0', padding: '7px 12px', display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '12px', color: '#3c3289' }}>
                      <span>Grand Total</span>
                      <span>{n(grandTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Charts ── */}
        {tab === 'charts' && (
          <div style={{ padding: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#7874a7', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Kasambahays per District — 2024 vs 2025
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={encChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip /><Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="2024" fill="#534AB7" radius={[4,4,0,0]} />
                <Bar dataKey="2025" fill="#9FE1CB" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>

            <p style={{ fontSize: '11px', fontWeight: '700', color: '#7874a7', letterSpacing: '.07em', textTransform: 'uppercase', margin: '24px 0 8px' }}>
              Age Bracket Distribution per District
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ageChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ede9f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip /><Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="18–30" stackId="a" fill="#AFA9EC" />
                <Bar dataKey="31–45" stackId="a" fill="#7F77DD" />
                <Bar dataKey="45+"   stackId="a" fill="#534AB7" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

      </div>{/* end tabs card */}

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .hide-on-print { display: none !important; }
          @page { size: landscape; margin: 10mm; }
        }
      `}} />
    </div>
  );
};

export default KasambahaySummaryReport;