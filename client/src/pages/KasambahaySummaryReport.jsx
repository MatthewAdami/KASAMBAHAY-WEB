import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';

import { API_ENDPOINTS } from '../utils/api'
const API_URL = API_ENDPOINTS.KASAMBAHAY
const DISTRICTS = ['District 1','District 2','District 3','District 4','District 5','District 6'];
const YEARS     = [2024, 2025];

// ─── Official Barangays per District ─────────────────────────────────────────
const DISTRICT_BARANGAYS = {
  'District 1': [
    'Alicia', 'Bagong Pag-asa', 'Bahay Toro', 'Balingasa', 'Bungad', 'Damar', 'Damayan',
    'Del Monte', 'Katipunan', 'Lourdes', 'Maharlika', 'Manresa', 'Mariblo', 'Masambong',
    'N.S. Amoranto (Gintong Silahis)', 'Nayong Kanluran', 'Paang Bundok', 'Pag-ibig sa Nayon',
    'Paltok', 'Paraiso', 'Phil-Am', 'Project 6', 'Ramon Magsaysay', 'Saint Peter', 'Salvacion',
    'San Antonio', 'San Isidro Labrador', 'San Jose', 'Santa Cruz', 'Santa Teresita',
    'Santo Cristo', 'Santo Domingo (Matalahib)', 'Siena', 'Talayan', 'Vasra',
    'Veterans Village', 'West Triangle',
  ],
  'District 2': [
    'Bagong Silangan', 'Batasan Hills', 'Commonwealth', 'Holy Spirit', 'Payatas',
  ],
  'District 3': [
    'Amihan', 'Bagumbayan', 'Bagumbuhay', 'Bayanihan', 'Blue Ridge A', 'Blue Ridge B',
    'Camp Aguinaldo', 'Claro (Quirino 3-B)', 'Dioquino Zobel', 'Duyan-duyan', 'E. Rodriguez',
    'East Kamias', 'Escopa I', 'Escopa II', 'Escopa III', 'Escopa IV', 'Libis',
    'Loyola Heights', 'Mangga', 'Marilag', 'Masagana', 'Milagrosa', 'Pansol',
    'Quirino 2-A', 'Quirino 2-B', 'Quirino 2-C', 'Quirino 3-A', 'San Roque', 'Silangan',
    'St. Ignatius', 'Tagumpay', 'Ugong Norte', 'Villa Maria Clara', 'West Kamias', 'White Plains',
  ],
  'District 4': [
    'Bagong Lipunan ng Crame', 'Botocan', 'Central', 'Damayang Lagi', 'Don Manuel',
    'Doña Aurora', 'Doña Imelda', 'Doña Josefa', 'Horseshoe', 'Immaculate Concepcion',
    'Kalusugan', 'Kamuning', 'Kaunlaran', 'Kristong Hari', 'Krus na Ligas', 'Laging Handa',
    'Malaya', 'Mariana', 'Obrero', 'Old Capitol Site', 'Paligsahan', 'Pinagkaisahan',
    'Pinyahan', 'Roxas', 'Sacred Heart', 'San Isidro Galas', 'San Martin de Porres',
    'San Vicente', 'Santol', 'Sikatuna Village', 'South Triangle', 'Santo Niño',
    "Teacher's Village East", "Teacher's Village West", 'Tatalon', 'U.P. Campus',
    'U.P. Village', 'Valencia',
  ],
  'District 5': [
    'Bagbag', 'Capri', 'Fairview', 'Greater Lagro', 'Gulod', 'Kaligayahan',
    'Nagkaisang Nayon', 'North Fairview', 'Novaliches Proper', 'Pasong Putik Proper',
    'San Agustin', 'San Bartolome', 'Santa Lucia', 'Santa Monica',
  ],
  'District 6': [
    'Apolonio Samson', 'Baesa', 'Balong Bato', 'Culiat', 'New Era', 'Pasong Tamo',
    'Sangandaan', 'Sauyo', 'Talipapa', 'Tandang Sora', 'Unang Sigaw',
  ],
};

// ─── Colors ───────────────────────────────────────────────────────────────────
const PDF_COLORS = {
  maroon:    [123, 17,  19],
  darkBlue:  [26,  58,  107],
  midBlue:   [37,  99,  168],
  lightBlue: [214, 228, 247],
  gold:      [200, 169, 81],
  rowAlt:    [249, 249, 249],
  totalRow:  [232, 238, 247],
  white:     [255, 255, 255],
  gray:      [102, 102, 102],
};

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
    enc2024: 0, enc2025: 0,
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
    if (r.year === 2024) d.enc2024++;
    if (r.year === 2025) d.enc2025++;
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

const BARANGAY_OFFICIAL_NAMES = [
  'Alicia', 'Bagong Pag-asa', 'Bahay Toro', 'Balingasa', 'Bungad', 'Damar', 'Damayan', 'Del Monte', 'Katipunan', 'Lourdes',
  'Maharlika', 'Manresa', 'Mariblo', 'Masambong', 'N.S. Amoranto (Gintong Silahis)', 'Nayong Kanluran', 'Paang Bundok',
  'Pag-ibig sa Nayon', 'Paltok', 'Paraiso', 'Phil-Am', 'Project 6', 'Ramon Magsaysay', 'Saint Peter', 'Salvacion', 'San Antonio',
  'San Isidro Labrador', 'San Jose', 'Santa Cruz', 'Santa Teresita', 'Santo Cristo', 'Santo Domingo (Matalahib)', 'Siena',
  'Talayan', 'Vasra', 'Veterans Village', 'West Triangle',
  'Bagong Silangan', 'Batasan Hills', 'Commonwealth', 'Holy Spirit', 'Payatas',
  'Amihan', 'Bagumbayan', 'Bagumbuhay', 'Bayanihan', 'Blue Ridge A', 'Blue Ridge B', 'Camp Aguinaldo', 'Claro (Quirino 3-B)',
  'Dioquino Zobel', 'Duyan-duyan', 'E. Rodriguez', 'East Kamias', 'Escopa I', 'Escopa II', 'Escopa III', 'Escopa IV', 'Libis',
  'Loyola Heights', 'Mangga', 'Marilag', 'Masagana', 'Milagrosa', 'Pansol', 'Quirino 2-A', 'Quirino 2-B', 'Quirino 2-C', 'Quirino 3-A',
  'San Roque', 'Silangan', 'St. Ignatius', 'Tagumpay', 'Ugong Norte', 'Villa Maria Clara', 'West Kamias', 'White Plains',
  'Bagong Lipunan ng Crame', 'Botocan', 'Central', 'Damayang Lagi', 'Don Manuel', 'Doña Aurora', 'Doña Imelda', 'Doña Josefa',
  'Horseshoe', 'Immaculate Concepcion', 'Kalusugan', 'Kamuning', 'Kaunlaran', 'Kristong Hari', 'Krus na Ligas', 'Laging Handa',
  'Malaya', 'Mariana', 'Obrero', 'Old Capitol Site', 'Paligsahan', 'Pinagkaisahan', 'Pinyahan', 'Roxas', 'Sacred Heart',
  'San Isidro Galas', 'San Martin de Porres', 'San Vicente', 'Santol', 'Sikatuna Village', 'South Triangle', 'Santo Niño',
  'Tatalon', 'Teacher\'s Village East', 'Teacher\'s Village West', 'U.P. Campus', 'U.P. Village', 'Valencia',
  'Bagbag', 'Capri', 'Fairview', 'Greater Lagro', 'Gulod', 'Kaligayahan', 'Nagkaisang Nayon', 'North Fairview', 'Novaliches Proper',
  'Pasong Putik Proper', 'San Agustin', 'San Bartolome', 'Santa Lucia', 'Santa Monica',
  'Apolonio Samson', 'Baesa', 'Balong Bato', 'Culiat', 'New Era', 'Pasong Tamo', 'Sangandaan', 'Sauyo', 'Talipapa', 'Tandang Sora',
  'Unang Sigaw'
];

const BARANGAY_CANONICAL = BARANGAY_OFFICIAL_NAMES.reduce((map, name) => {
  const key = normalizeBarangayKey(name);
  if (key) map[key] = name;
  const keyWithoutParens = normalizeBarangayKey(name.replace(/\s*\(.*\)$/, ''));
  if (keyWithoutParens) map[keyWithoutParens] = name;
  return map;
}, {});

function normalizeBarangayKey(input) {
  return String(input || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .trim()
    .replace(/^(BRGY\.?|BARANGAY)\s*/i, '')
    .replace(/\s+(BRGY\.?|BARANGAY)$/i, '')
    .replace(/[-.,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeBarangayName(raw) {
  let name = normalizeBarangayKey(raw);
  if (!name || name === 'N/A') return '';
  return BARANGAY_CANONICAL[name] || name;
}

// ─── Build barangay counts — only official barangays per district ─────────────
function buildBarangay(records) {
  // Start with all official barangays at 0
  const map = {};
  DISTRICTS.forEach(d => {
    map[d] = {};
    (DISTRICT_BARANGAYS[d] || []).forEach(brgy => {
      map[d][brgy] = 0;
    });
  });

  // Count records — only increment if barangay is official for that district
  for (const r of records) {
    if (!map[r.district]) continue;
    const brgy = normalizeBarangayName(r.barangay);
    if (!brgy) continue;
    // Only count if it's a recognized official barangay for this district
    if (Object.prototype.hasOwnProperty.call(map[r.district], brgy)) {
      map[r.district][brgy]++;
    }
  }

  // Convert to sorted array — always show all official barangays
  const result = {};
  for (const d of DISTRICTS) {
    result[d] = (DISTRICT_BARANGAYS[d] || []).map(barangay => ({
      barangay,
      count: map[d][barangay] || 0,
    }));
    // Already in official order, but sort alphabetically for display
    result[d].sort((a, b) => a.barangay.localeCompare(b.barangay));
  }
  return result;
}

// ─── Shared parsers ───────────────────────────────────────────────────────────
const parseSvc = (val) => {
  if (!val || String(val).trim().toUpperCase() === 'N/A') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).toLowerCase();
  const match = str.match(/(\d+(\.\d+)?)/);
  if (!match) return 0;
  let num = parseFloat(match[0]);
  if (str.includes('mo') || str.includes('month')) num = num / 12;
  return num;
};

const NCR_KEYWORDS = ['manila','quezon city','qc','caloocan','malabon','navotas','valenzuela','makati','pasay','taguig','parañaque','paranaque','las piñas','las pinas','muntinlupa','mandaluyong','marikina','pasig','san juan','pateros','ncr','metro manila','national capital'];
const isNCR = (val) => {
  if (!val) return false;
  return NCR_KEYWORDS.some(k => String(val).trim().toLowerCase().includes(k));
};

// ════════════════════════════════════════════════════════════════════════════
// GENERAL ANALYSIS PDF GENERATOR — exact mirror of the QC PESO report format
// ════════════════════════════════════════════════════════════════════════════
async function exportGeneralAnalysisPDF(rawRecords) {
  const { default: jsPDF }           = await import('jspdf');
  const { default: jspdfAutoTable }  = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const ML = 14, MR = 14, CT = PW / 2;
  let y = 0;

  const n   = (v) => (v || 0).toLocaleString();
  const pct = (a, b) => b ? `${((a / b) * 100).toFixed(1)}%` : '0%';
  const cnt = (fn) => rawRecords.filter(fn).length;

  const checkNewPage = (needed = 12) => {
    if (y + needed > PH - 18) { doc.addPage(); y = 14; }
  };

  const drawSectionHeader = (title) => {
    checkNewPage(14);
    doc.setFillColor(...PDF_COLORS.darkBlue);
    doc.rect(ML, y, PW - ML - MR, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(title, ML + 3, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 10;
  };

  const drawFigCaption = (text) => {
    checkNewPage(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_COLORS.darkBlue);
    doc.text(text, ML, y);
    doc.setTextColor(0, 0, 0);
    y += 5;
  };

  const drawNote = (text) => {
    checkNewPage(6);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(text, ML, y);
    doc.setTextColor(0, 0, 0);
    y += 4;
  };

  const drawBodyText = (text) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(text, PW - ML - MR);
    checkNewPage(lines.length * 4.5 + 3);
    doc.text(lines, ML, y);
    y += lines.length * 4.5 + 3;
    doc.setTextColor(0, 0, 0);
  };

  const drawBullet = (text) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(text, PW - ML - MR - 6);
    checkNewPage(lines.length * 4.5 + 2);
    doc.text('\u2022', ML + 1, y);
    doc.text(lines, ML + 6, y);
    y += lines.length * 4.5 + 2;
    doc.setTextColor(0, 0, 0);
  };

  const drawSubBullet = (text) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(text, PW - ML - MR - 12);
    checkNewPage(lines.length * 4.5 + 1);
    doc.text('\u2013', ML + 7, y);
    doc.text(lines, ML + 12, y);
    y += lines.length * 4.5 + 1;
    doc.setTextColor(0, 0, 0);
  };

  const autoTable = (head, body, opts = {}) => {
    checkNewPage(20);
    const result = jspdfAutoTable(doc, {
      startY: y,
      head,
      body,
      margin: { left: ML, right: MR },
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        valign: 'middle',
        lineColor: [200, 200, 200],
        lineWidth: 0.2,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: PDF_COLORS.darkBlue,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 7.5,
      },
      alternateRowStyles: { fillColor: PDF_COLORS.rowAlt },
      ...opts,
    });
    y = (result?.finalY ?? doc.lastAutoTable?.finalY ?? y) + 4;
  };

  const totalRowCb = (rowCount) => ({
    didParseCell: (data) => {
      if (data.row.index === rowCount) {
        data.cell.styles.fillColor = PDF_COLORS.totalRow;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = PDF_COLORS.darkBlue;
      }
    },
  });

  const rec2425 = rawRecords.filter(r => r.year === 2024 || r.year === 2025);

  const liveIn2425  = cnt(r => r.isLiveIn  && (r.year===2024||r.year===2025));
  const liveOut2425 = cnt(r => r.isLiveOut && (r.year===2024||r.year===2025));
  const onCall2425  = cnt(r => r.isOnCall  && (r.year===2024||r.year===2025));
  const total2425   = rec2425.length;

  const rec2026    = rawRecords.filter(r => r.year === 2026);
  const liveIn26   = cnt(r => r.isLiveIn  && r.year === 2026);
  const liveOut26  = cnt(r => r.isLiveOut && r.year === 2026);
  const onCall26   = cnt(r => r.isOnCall  && r.year === 2026);
  const total26    = rec2026.length;

  const genHouse2425 = cnt(r => r.isGeneralHousehelp && (r.year===2024||r.year===2025));
  const yaya2425     = cnt(r => r.isYaya          && (r.year===2024||r.year===2025));
  const cook2425     = cnt(r => r.isCook          && (r.year===2024||r.year===2025));
  const laun2425     = cnt(r => r.isLaundryPerson && (r.year===2024||r.year===2025));
  const gard2425     = cnt(r => r.isGardener      && (r.year===2024||r.year===2025));
  const jobTotal2425 = yaya2425 + cook2425 + laun2425 + gard2425;

  const genHouse26  = cnt(r => r.isGeneralHousehelp && r.year===2026);
  const yaya26      = cnt(r => r.isYaya          && r.year===2026);
  const cook26      = cnt(r => r.isCook          && r.year===2026);
  const laun26      = cnt(r => r.isLaundryPerson && r.year===2026);
  const gard26      = cnt(r => r.isGardener      && r.year===2026);
  const jobTotal26  = yaya26 + cook26 + laun26 + gard26;

  const svc = (lo, hi) => cnt(r => {
    const s = parseSvc(r.yearsOfService || r.lengthOfService);
    return s >= lo && s <= hi && (r.year===2024||r.year===2025);
  });
  const svc26 = (lo, hi) => cnt(r => {
    const s = parseSvc(r.yearsOfService || r.lengthOfService);
    return s >= lo && s <= hi && r.year===2026;
  });
  const svc35   = svc(3, 5);
  const svc510  = svc(5, 9);
  const svc1020 = svc(10, 19);
  const svc2030 = svc(20, 29);
  const svc3040 = svc(30, 39);
  const svc4050 = svc(40, 49);
  const svc50p  = svc(50, 999);
  const svcTotal= svc35+svc510+svc1020+svc2030+svc3040+svc4050+svc50p;
  const svc35_26   = svc26(3, 5);
  const svc510_26  = svc26(5, 9);
  const svc1020_26 = svc26(10, 19);
  const svc2030_26 = svc26(20, 29);
  const svc3040_26 = svc26(30, 39);
  const svc4050_26 = svc26(40, 49);
  const svc50p_26  = svc26(50, 999);
  const svcTotal_26= svc35_26+svc510_26+svc1020_26+svc2030_26+svc3040_26+svc4050_26+svc50p_26;

  const age1830_2425 = cnt(r => (r.age||0)>=18 && (r.age||0)<=30 && (r.year===2024||r.year===2025));
  const age3145_2425 = cnt(r => (r.age||0)>=31 && (r.age||0)<=45 && (r.year===2024||r.year===2025));
  const age41up_2425 = cnt(r => (r.age||0)> 41                   && (r.year===2024||r.year===2025));
  const ageTotal2425 = age1830_2425 + age3145_2425 + age41up_2425;

  const age1830_26 = cnt(r => (r.age||0)>=18 && (r.age||0)<=30 && r.year===2026);
  const age3145_26 = cnt(r => (r.age||0)>=31 && (r.age||0)<=45 && r.year===2026);
  const age41up_26 = cnt(r => (r.age||0)> 41                   && r.year===2026);
  const ageTotal26 = age1830_26 + age3145_26 + age41up_26;

  const female2425 = cnt(r => r.isFemale && (r.year===2024||r.year===2025));
  const male2425   = cnt(r => r.isMale   && (r.year===2024||r.year===2025));

  const female26 = cnt(r => r.isFemale && r.year===2026);
  const male26   = cnt(r => r.isMale   && r.year===2026);

  const edKey = (r) => (r.educationalAttainment || r.education || '').toLowerCase();
  const ed = (kw) => cnt(r => edKey(r).includes(kw) && (r.year===2024||r.year===2025));
  const edElemGrad    = ed('elem') && cnt(r => edKey(r).includes('elem') && !edKey(r).includes('under') && (r.year===2024||r.year===2025));
  const edElemUnder   = cnt(r => edKey(r).includes('elem') && edKey(r).includes('under') && (r.year===2024||r.year===2025));
  const edHSGrad      = cnt(r => (edKey(r).includes('high school') || edKey(r).includes('hs')) && !edKey(r).includes('under') && (r.year===2024||r.year===2025));
  const edHSUnder     = cnt(r => (edKey(r).includes('high school') || edKey(r).includes('hs')) && edKey(r).includes('under') && (r.year===2024||r.year===2025));
  const edColGrad     = cnt(r => edKey(r).includes('college') && !edKey(r).includes('under') && (r.year===2024||r.year===2025));
  const edColUnder    = cnt(r => edKey(r).includes('college') && edKey(r).includes('under') && (r.year===2024||r.year===2025));
  const edVoc         = cnt(r => edKey(r).includes('voc') && (r.year===2024||r.year===2025));
  const edTotal2425   = edElemGrad+edElemUnder+edHSGrad+edHSUnder+edColGrad+edColUnder+edVoc;

  const edElemGrad26  = cnt(r => edKey(r).includes('elem') && !edKey(r).includes('under') && r.year===2026);
  const edElemUnder26 = cnt(r => edKey(r).includes('elem') && edKey(r).includes('under') && r.year===2026);
  const edHSGrad26    = cnt(r => (edKey(r).includes('high school')||edKey(r).includes('hs')) && !edKey(r).includes('under') && r.year===2026);
  const edHSUnder26   = cnt(r => (edKey(r).includes('high school')||edKey(r).includes('hs')) && edKey(r).includes('under') && r.year===2026);
  const edColGrad26   = cnt(r => edKey(r).includes('college') && !edKey(r).includes('under') && r.year===2026);
  const edColUnder26  = cnt(r => edKey(r).includes('college') && edKey(r).includes('under') && r.year===2026);
  const edVoc26       = cnt(r => edKey(r).includes('voc') && r.year===2026);
  const edTotal26     = edElemGrad26+edElemUnder26+edHSGrad26+edHSUnder26+edColGrad26+edColUnder26+edVoc26;

  const originNCR2425  = cnt(r => isNCR(r.provincialAddress || r.birthPlace || r.placeOfOrigin || r.origin) && (r.year===2024||r.year===2025));
  const originProv2425 = cnt(r => !isNCR(r.provincialAddress || r.birthPlace || r.placeOfOrigin || r.origin) && !!(r.provincialAddress || r.birthPlace || r.placeOfOrigin || r.origin) && (r.year===2024||r.year===2025));

  const originNCR26   = cnt(r => isNCR(r.provincialAddress || r.birthPlace || r.placeOfOrigin || r.origin) && r.year===2026);
  const originProv26  = cnt(r => !isNCR(r.provincialAddress || r.birthPlace || r.placeOfOrigin || r.origin) && !!(r.provincialAddress || r.birthPlace || r.placeOfOrigin || r.origin) && r.year===2026);

  const sss2425  = cnt(r => r.sss        && (r.year===2024||r.year===2025));
  const phi2425  = cnt(r => r.philhealth && (r.year===2024||r.year===2025));
  const pag2425  = cnt(r => r.pagIbig    && (r.year===2024||r.year===2025));
  const qcid2425 = cnt(r => r.qcid       && (r.year===2024||r.year===2025));
  const benTotal2425 = sss2425 + phi2425 + pag2425 + qcid2425;

  const sss26   = cnt(r => r.sss        && r.year===2026);
  const phi26   = cnt(r => r.philhealth && r.year===2026);
  const pag26   = cnt(r => r.pagIbig    && r.year===2026);
  const qcid26  = cnt(r => r.qcid       && r.year===2026);
  const benTotal26 = sss26 + phi26 + pag26 + qcid26;

  // Use official-barangay-only data for PDF
  const barangayData   = buildBarangay(rawRecords);
  const brgyCompliance = DISTRICTS.map(d => ({
    district:  d,
    barangays: (DISTRICT_BARANGAYS[d] || []),
    total:     (DISTRICT_BARANGAYS[d] || []).length,
  }));
  const totalBrgy = brgyCompliance.reduce((s, d) => s + d.total, 0);

  const ori24  = cnt(r => r.kasambahayOrientation);
  const org24  = cnt(r => r.kasambahayOrganizing);
  const fgd24  = cnt(r => r.focusGroupDiscussion);
  const ga24   = cnt(r => r.generalAssembly);
  const osh24  = cnt(r => r.occupationalSafetyAndHealth);
  const gen24  = cnt(r => r.genderSensitivityTraining);
  const fa24   = cnt(r => r.basicFirstAidTraining);
  const hs24   = cnt(r => r.homeSecurityAwareness);

  const rows   = buildSummary(rawRecords);
  const totals = buildTotals(rows);

  // HEADER
  y = 12;
  doc.setFillColor(...PDF_COLORS.maroon);
  doc.rect(0, 0, PW, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.darkBlue);
  doc.text('Republic of the Philippines', CT, y, { align: 'center' }); y += 4;
  doc.text('Local Government of Quezon City', CT, y, { align: 'center' }); y += 4;
  doc.setFontSize(12.5);
  doc.text('PUBLIC EMPLOYMENT SERVICE OFFICE', CT, y, { align: 'center' }); y += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(80, 80, 80);
  doc.text(
    '6th Floor Civic Center Building A, Quezon City Hall, Quezon City, Philippines  |  Tel: 8988-42-42 loc. 8436/8437/8439  |  peso@quezoncity.gov.ph',
    CT, y, { align: 'center' }
  );
  y += 3;
  doc.setDrawColor(...PDF_COLORS.maroon);
  doc.setLineWidth(1.5);
  doc.line(ML, y, PW - MR, y); y += 1.5;
  doc.setDrawColor(...PDF_COLORS.darkBlue);
  doc.setLineWidth(0.4);
  doc.line(ML, y, PW - MR, y); y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PDF_COLORS.maroon);
  doc.text('GENERAL ANALYSIS FOR KASAMBAHAY PROGRAM', CT, y, { align: 'center' }); y += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PDF_COLORS.darkBlue);
  doc.text(
    `Special Projects Division – Kasambahay Section  |  Generated: ${new Date().toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' })}`,
    CT, y, { align: 'center' }
  ); y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(ML, y, PW - MR, y); y += 7;
  doc.setTextColor(0, 0, 0);

  drawSectionHeader('I.  OVERVIEW');
  drawBodyText(
    'The Special Projects Division – Kasambahay Section continues to implement various orientations, ' +
    'activities, and programs in line with the enforcement of Republic Act No. 10361 or the Batas Kasambahay. ' +
    'These initiatives aim to promote awareness of rights and benefits, strengthen organization among ' +
    'Kasambahays, and improve access to social protection and government services.'
  );

  drawSectionHeader('II.  DEMOGRAPHIC PROFILE');

  drawFigCaption('Figure 1: Employment Arrangements');
  autoTable(
    [['', 'Live-In', 'Live-Out', 'On-Call', 'Total']],
    [
      ['2024 and 2025 Data',    n(liveIn2425),  n(liveOut2425),  n(onCall2425),  n(total2425)],
      ['January to April 2026', n(liveIn26),    n(liveOut26),    n(onCall26),    n(total26)],
    ],
    { columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 55 }, 4: { fontStyle: 'bold', textColor: PDF_COLORS.darkBlue } } }
  );
  drawBodyText(
    `The consolidated data on Kasambahay employment arrangements for 2024 and 2025 recorded a total of ` +
    `${n(total2425)} domestic workers, consisting of ${n(liveIn2425)} live-in, ${n(liveOut2425)} live-out, and ` +
    `${n(onCall2425)} on-call workers. The data shows that live-out kasambahays had the highest number, ` +
    `indicating a growing preference for non-residential work arrangements.`
  );
  drawBodyText(
    `From January to April 2026, a total of ${n(total26)} kasambahays were recorded, including ` +
    `${n(liveIn26)} live-in, ${n(liveOut26)} live-out, and ${n(onCall26)} on-call workers. Live-out ` +
    `workers remained the highest in number, while the increase in on-call workers reflects a growing ` +
    `demand for flexible domestic work services.`
  );

  drawFigCaption('Figure 2: Job Categorizations');
  autoTable(
    [['', 'Yaya', 'Cook', 'Laundry', 'Gardener', 'Total']],
    [
      ['2024 and 2025 Data',    n(yaya2425), n(cook2425), n(laun2425), n(gard2425), n(jobTotal2425)],
      ['January to April 2026', n(yaya26),   n(cook26),   n(laun26),   n(gard26),   n(jobTotal26)],
    ],
    { columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 55 }, 5: { fontStyle: 'bold', textColor: PDF_COLORS.darkBlue } } }
  );
  drawBodyText(
    `The data on kasambahay job categorizations for 2024 and 2025 recorded a total of ${n(jobTotal2425)} ` +
    `domestic workers. Cooks had the highest number with ${n(cook2425)} workers, followed by laundry ` +
    `workers with ${n(laun2425)}, yayas with ${n(yaya2425)}, and gardeners with ${n(gard2425)}. This shows ` +
    `that cooking, childcare, and laundry services are the most needed household roles.`
  );
  drawBodyText(
    `From January to April 2026, a total of ${n(jobTotal26)} kasambahays were recorded. Cooks remained ` +
    `the highest with ${n(cook26)} workers, followed by yayas with ${n(yaya26)}, laundry workers with ` +
    `${n(laun26)}, and gardeners with ${n(gard26)}. The increase in gardeners indicates a growing demand ` +
    `for household maintenance services.`
  );
  drawBodyText(
    'Overall, the data reflects the continuing demand for cooking and childcare services and highlights ' +
    'the need for skills training and support programs for kasambahays.'
  );

  drawFigCaption('Figure 3: Length of Service');
  drawNote('Source: Open Data Kit (ODK) LMIS DATABASE 2024–2025');
  autoTable(
    [['', '3–5\nyrs', '5–10\nyrs', '10–20\nyrs', '20–30\nyrs', '30–40\nyrs', '40–50\nyrs', '50 yrs\n& above', 'Total']],
    [
      ['2024 and 2025 Data',    n(svc35), n(svc510), n(svc1020), n(svc2030), n(svc3040), n(svc4050), n(svc50p), n(svcTotal)],
      ['January to April 2026', n(svc35_26), n(svc510_26), n(svc1020_26), n(svc2030_26), n(svc3040_26), n(svc4050_26), n(svc50p_26), n(svcTotal_26)],
    ],
    { columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 45 }, 8: { fontStyle: 'bold', textColor: PDF_COLORS.darkBlue } }, styles: { fontSize: 7 } }
  );
  drawNote('Based on Open Data Kit (ODK) YEAR 2024 TO 2025 NOVEMBER');

  drawFigCaption('Figure 4: Age Brackets');
  autoTable(
    [['', 'Age 18–30', 'Age 31–45', 'Age 41 Above', 'Total']],
    [
      ['2024 and 2025 Data',    n(age1830_2425), n(age3145_2425), n(age41up_2425), n(ageTotal2425)],
      ['January to April 2026', n(age1830_26),   n(age3145_26),   n(age41up_26),   n(ageTotal26)],
    ],
    { columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 55 }, 4: { fontStyle: 'bold', textColor: PDF_COLORS.darkBlue } } }
  );
  drawBodyText(
    `The table shows the age brackets of kasambahays for 2024 and 2025, recording a total of ` +
    `${n(ageTotal2425)} domestic workers. The majority belonged to the age group 41 and above with ` +
    `${n(age41up_2425)} domestic workers, followed by ages 31–45 with ${n(age3145_2425)}, and ages 18–30 with ${n(age1830_2425)}.`
  );
  drawBodyText(
    `From January to April 2026, a total of ${n(ageTotal26)} kasambahays were recorded, with ` +
    `${n(age41up_26)} domestic workers aged 41 and above, ${n(age3145_26)} aged 31–45, and ${n(age1830_26)} aged 18–30.`
  );
  drawBodyText(
    'Overall, the data shows that most kasambahays belong to the older age group, indicating that ' +
    'domestic work is largely sustained by experienced adult workers rather than younger individuals.'
  );

  drawFigCaption('Figure 5: Sex');
  autoTable(
    [['', 'Female', 'Male', 'Total']],
    [
      ['2024 and 2025 Data',    n(female2425), n(male2425), n(female2425+male2425)],
      ['January to April 2026', n(female26),   n(male26),   n(female26+male26)],
    ],
    { columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 55 }, 3: { fontStyle: 'bold', textColor: PDF_COLORS.darkBlue } } }
  );
  drawBodyText(
    `The data on the sex distribution of kasambahays for 2024 and 2025 recorded a total of ` +
    `${n(female2425+male2425)} workers, of which ${n(female2425)} were female and ${n(male2425)} were male. ` +
    `This indicates that the kasambahay sector remains predominantly female-dominated.`
  );
  drawBodyText(
    `From January to April 2026, a total of ${n(female26+male26)} kasambahays were recorded, including ` +
    `${n(female26)} females and ${n(male26)} males. The data continues to show a significantly higher ` +
    `number of female workers compared to males.`
  );
  drawBodyText(
    'Overall, the figures highlight that domestic work is still primarily carried out by women, emphasizing ' +
    'the importance of gender-responsive programs, protection, and welfare support for female kasambahays.'
  );

  drawFigCaption('Figure 6: Educational Attainment');
  autoTable(
    [['', 'Elem.\nGrad.', 'Elem.\nUndergrad', 'HS\nGrad', 'HS\nUndergrad', 'College\nGrad', 'Col.\nUndergrad', 'Voc.', 'Total']],
    [
      ['2024 and 2025 Data',    n(edElemGrad),   n(edElemUnder),   n(edHSGrad),   n(edHSUnder),   n(edColGrad),   n(edColUnder),   n(edVoc),   n(edTotal2425)],
      ['January to April 2026', n(edElemGrad26), n(edElemUnder26), n(edHSGrad26), n(edHSUnder26), n(edColGrad26), n(edColUnder26), n(edVoc26), n(edTotal26)],
    ],
    { columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 }, 8: { fontStyle: 'bold', textColor: PDF_COLORS.darkBlue } }, styles: { fontSize: 7 } }
  );
  drawBodyText(
    'The data shows that most kasambahays are high school graduates and high school undergraduates. ' +
    `In 2024–2025, High School Graduates recorded the highest number (${n(edHSGrad)}), followed by ` +
    `High School Undergraduates (${n(edHSUnder)}). Elementary-level workers also make up a large ` +
    'portion of the sector, while college graduates and vocational graduates recorded the lowest numbers. ' +
    'This indicates that most kasambahays have basic to secondary education only.'
  );
  drawBodyText(
    'The findings highlight the need for continuous skills training, education support, and livelihood ' +
    'programs to improve employment opportunities and career growth for kasambahays.'
  );

  drawFigCaption('Figure 7: Place of Origin');
  drawNote('Based on Kasambahay Masterlist database.');
  autoTable(
    [['', 'NCR', 'Provinces']],
    [
      ['2024 and 2025 Data',    n(originNCR2425), n(originProv2425)],
      ['January to April 2026', n(originNCR26),   n(originProv26)],
    ],
    { columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 55 } } }
  );

  drawFigCaption('Figure 8: Social Benefits');
  autoTable(
    [['', 'SSS', 'PhilHealth', 'Pag-IBIG', 'QC ID', 'Total']],
    [
      ['2024 and 2025 Data',    n(sss2425), n(phi2425), n(pag2425), n(qcid2425), n(benTotal2425)],
      ['January to April 2026', n(sss26),   n(phi26),   n(pag26),   n(qcid26),   n(benTotal26)],
    ],
    { columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 55 }, 5: { fontStyle: 'bold', textColor: PDF_COLORS.darkBlue } } }
  );
  drawBodyText(
    `The data shows that many kasambahays are enrolled in social protection programs, with QC ID having ` +
    `the highest number of beneficiaries (${n(qcid2425)}), followed by PhilHealth (${n(phi2425)}) and ` +
    `SSS (${n(sss2425)}). In 2024–2025, Pag-IBIG recorded the lowest number (${n(pag2425)}), indicating ` +
    `lower participation in housing and savings programs. From January to April 2026, QC ID remained the ` +
    `most accessed benefit, while Pag-IBIG participation showed improvement. Overall, the figures reflect ` +
    `increasing awareness and access to social benefits among kasambahays, but continued information and ` +
    `registration assistance are still needed to improve coverage.`
  );

  drawFigCaption('Figure 9: Based on Submitted Report per Barangays');
  autoTable(
    [['Compliance Submitted Report per Barangays', '2024–2025', '2026']],
    [['', `${totalBrgy} Barangays`, `${brgyCompliance.reduce((s,d)=> s + (d.barangays.filter(b => b).length), 0)}`]],
    { columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 100 }, 1: { fontStyle: 'bold', textColor: PDF_COLORS.darkBlue }, 2: { fontStyle: 'bold', textColor: PDF_COLORS.darkBlue } } }
  );

  checkNewPage(30);
  drawSectionHeader('OTHER KEY OUTPUTS (ENGAGEMENTS)');
  drawBullet('Kasambahays enrolled in Savings Program');
  drawBullet('Groups with ongoing DOLE Accreditation:');
  drawSubBullet('WONDER KASAMBAHAY Q2A (6/24/25)');
  drawSubBullet('MADISKARTENG KASAMBAHAY NG ESCOPA 1 (7/14/25)');
  y += 2;

  checkNewPage(30);
  drawSectionHeader('SUMMARY OF KASAMBAHAY PROGRAM ACTIVITIES');
  drawBodyText('Below are the breakdowns of the various activities/programs conducted:');
  drawFigCaption('Figure 1. Summary of Kasambahay Program Activities');
  autoTable(
    [['Program Category', 'Number of Attendees']],
    [
      ['Orientation of Batas Kasambahay',             n(ori24)],
      ['Organizing of Kasambahay Groups',              n(org24)],
      ['Focus Group Discussion',                       n(fgd24)],
      ['Kasambahay General Assembly',                  n(ga24)],
      ['Kasambahay OSH Training and GAD',              n(osh24 + gen24)],
      ['Basic First Aid Training and Home Security Awareness', n(fa24 + hs24)],
    ],
    { columnStyles: { 0: { halign: 'left', cellWidth: 130 }, 1: { halign: 'center', fontStyle: 'bold', textColor: PDF_COLORS.darkBlue } } }
  );

  checkNewPage(30);
  drawSectionHeader('BARANGAYS COMPLIANCE – SUBMITTED REPORTS');
  drawFigCaption('Figure 2: Barangays Compliance Submitted Reports');

  const brgyBody = brgyCompliance.map(d => [
    `${d.district}\n(Total: ${d.total})`,
    d.barangays.length > 0 ? d.barangays.join('\n') : 'None recorded',
  ]);

  autoTable(
    [['District', 'Barangays']],
    brgyBody,
    {
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 40, textColor: PDF_COLORS.darkBlue },
        1: { halign: 'left', cellWidth: PW - ML - MR - 40 },
      },
      styles: { fontSize: 7.5, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
    }
  );
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...PDF_COLORS.darkBlue);
  doc.text(`Total: ${n(totalBrgy)} Barangays`, ML, y);
  y += 6;
  doc.setTextColor(0, 0, 0);

  checkNewPage(30);
  drawSectionHeader('DISTRICT SUMMARY – REGISTERED KASAMBAHAYS');
  drawFigCaption('District Overview: Encoded Records & Demographics');
  autoTable(
    [['District', 'Enc\n2024', 'Enc\n2025', 'Sub\nTotal', 'Female', 'Male', 'Live-In', 'Live-Out', 'On-Call']],
    [
      ...rows.map(r => [r.district, n(r.enc2024), n(r.enc2025), n(r.subtotal), n(r.female), n(r.male), n(r.liveIn), n(r.liveOut), n(r.onCall)]),
      ['TOTAL', n(totals.enc2024), n(totals.enc2025), n(totals.subtotal), n(totals.female), n(totals.male), n(totals.liveIn), n(totals.liveOut), n(totals.onCall)],
    ],
    { columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 28 }, 3: { fontStyle: 'bold' } }, styles: { fontSize: 7 }, ...totalRowCb(rows.length) }
  );

  drawFigCaption('District Training & Work Type');
  autoTable(
    [['District', 'Orientation', 'Organizing', 'OSH', 'Gender\nSens.', 'First Aid', 'Home\nSec.', 'Gen.\nHousehelp', 'Cook', 'Laundry', 'Yaya', 'Gardener']],
    [
      ...rows.map(r => [r.district, n(r.orientation), n(r.organizing), n(r.osh), n(r.genderSens), n(r.firstAid), n(r.homeSec), n(r.genHouse), n(r.cook), n(r.laundry), n(r.yaya), n(r.gardener)]),
      ['TOTAL', n(totals.orientation), n(totals.organizing), n(totals.osh), n(totals.genderSens), n(totals.firstAid), n(totals.homeSec), n(totals.genHouse), n(totals.cook), n(totals.laundry), n(totals.yaya), n(totals.gardener)],
    ],
    { columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 28 } }, styles: { fontSize: 7 }, ...totalRowCb(rows.length) }
  );

  drawFigCaption('Age Brackets per District');
  const ageBracketsDist = [
    { label: '15 and below', key: 'age15below' },
    { label: '18–30',        key: 'age1830'    },
    { label: '31–45',        key: 'age3145'    },
    { label: '45 and above', key: 'age45above' },
  ];
  autoTable(
    [['Age Bracket', ...DISTRICTS, 'TOTAL']],
    [
      ...ageBracketsDist.map(({ label, key }) => [label, ...rows.map(r => n(r[key])), n(rows.reduce((s, r) => s + (r[key] || 0), 0))]),
      ['SUBTOTAL', ...rows.map(r => n(r.subtotal)), n(totals.subtotal)],
    ],
    { columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 30 } }, styles: { fontSize: 7 }, ...totalRowCb(ageBracketsDist.length) }
  );

  drawFigCaption('Benefits Coverage % per District');
  const pctRows = buildPct(rows);
  autoTable(
    [['District', 'SSS %', 'PhilHealth %', 'Pag-IBIG %', 'QCID %']],
    [
      ...pctRows.map(r => [r.district, `${r.sss.toFixed(2)}%`, `${r.philhealth.toFixed(2)}%`, `${r.pagibig.toFixed(2)}%`, `${r.qcid.toFixed(2)}%`]),
      ['All Districts', `${totals.subtotal ? ((totals.sss/totals.subtotal)*100).toFixed(2) : 0}%`, `${totals.subtotal ? ((totals.philhealth/totals.subtotal)*100).toFixed(2) : 0}%`, `${totals.subtotal ? ((totals.pagibig/totals.subtotal)*100).toFixed(2) : 0}%`, `${totals.subtotal ? ((totals.qcid/totals.subtotal)*100).toFixed(2) : 0}%`],
    ],
    { columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }, ...totalRowCb(pctRows.length) }
  );

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...PDF_COLORS.maroon);
    doc.rect(0, PH - 9, PW, 9, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(
      'Quezon City Public Employment Service Office (QC PESO)  |  Special Projects Division – Kasambahay Section',
      CT, PH - 4.5, { align: 'center' }
    );
    doc.text(`Page ${i} of ${totalPages}`, PW - MR, PH - 4.5, { align: 'right' });
  }

  const today = new Date().toISOString().slice(0, 10);
  doc.save(`General_Analysis_Kasambahay_${today}.pdf`);
}

// ─── Export to Excel ─────────────────────────────────────────────────────────
function exportToExcel(rows, totals, pctRows, barangay, rawRecords, fileName) {
  const wb = XLSX.utils.book_new();
  const autoWidth = (data) =>
    data[0]?.map((_, ci) => ({
      wch: Math.max(...data.map(row => String(row[ci] ?? '').length), 8),
    }));

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

  const ovHeaders = [
    'District','Encoded 2024','Encoded 2025','Sub Total',
    'Female','Male','Live-In','Live-Out','On-Call',
    'Senior','Solo Parent','Ex-OFW','PWD',
  ];
  const ovData = [
    ovHeaders,
    ...rows.map(r => [r.district,r.enc2024,r.enc2025,r.subtotal,r.female,r.male,r.liveIn,r.liveOut,r.onCall,r.senior,r.soloParent,r.exOfw,r.pwd]),
    ['TOTAL',totals.enc2024,totals.enc2025,totals.subtotal,totals.female,totals.male,totals.liveIn,totals.liveOut,totals.onCall,totals.senior,totals.soloParent,totals.exOfw,totals.pwd],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(ovData);
  ws1['!cols'] = autoWidth(ovData);
  XLSX.utils.book_append_sheet(wb, ws1, 'District Overview');

  const wkHeaders = ['District','Kasambahay Orientation','Kasambahay Organizing','Occupational Safety','Gender Sensitivity','Basic First Aid','Home Security','General Househelp','Cook','Laundry','Yaya','Gardener'];
  const wkData = [
    wkHeaders,
    ...rows.map(r => [r.district,r.orientation,r.organizing,r.osh,r.genderSens,r.firstAid,r.homeSec,r.genHouse,r.cook,r.laundry,r.yaya,r.gardener]),
    ['TOTAL',totals.orientation,totals.organizing,totals.osh,totals.genderSens,totals.firstAid,totals.homeSec,totals.genHouse,totals.cook,totals.laundry,totals.yaya,totals.gardener],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(wkData);
  ws2['!cols'] = autoWidth(wkData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Training & Work Type');

  const ageBrackets = [
    { label: '15 and below', key: 'age15below' },
    { label: '18–30',        key: 'age1830'    },
    { label: '31–45',        key: 'age3145'    },
    { label: '45 and above', key: 'age45above' },
  ];
  const ageData = [
    ['Age Bracket', ...DISTRICTS, 'TOTAL'],
    ...ageBrackets.map(({ label, key }) => [label, ...rows.map(r => r[key] || 0), rows.reduce((s, r) => s + (r[key] || 0), 0)]),
    ['SUBTOTAL', ...rows.map(r => r.subtotal), totals.subtotal],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(ageData);
  ws3['!cols'] = autoWidth(ageData);
  XLSX.utils.book_append_sheet(wb, ws3, 'Age Brackets');

  const pctData = [
    ['District','SSS %','PhilHealth %','Pag-IBIG %','QCID %'],
    ...pctRows.map(r => [r.district,`${r.sss.toFixed(2)}%`,`${r.philhealth.toFixed(2)}%`,`${r.pagibig.toFixed(2)}%`,`${r.qcid.toFixed(2)}%`]),
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(pctData);
  ws4['!cols'] = autoWidth(pctData);
  XLSX.utils.book_append_sheet(wb, ws4, 'Benefit Coverage');

  // Per Barangay — always uses official barangay list, shows all even if count = 0
  const brgyRows = [['District','Barangay','Count']];
  for (const dist of DISTRICTS) {
    const officialList = DISTRICT_BARANGAYS[dist] || [];
    const countMap = {};
    (barangay[dist] || []).forEach(b => { countMap[b.barangay] = b.count; });
    officialList.forEach(brgy => {
      brgyRows.push([dist, brgy, countMap[brgy] || 0]);
    });
    brgyRows.push([dist, 'Grand Total', officialList.reduce((s, brgy) => s + (countMap[brgy] || 0), 0)]);
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
  const [genPdfLoading, setGenPdfLoading] = useState(false);

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

  const handleGeneralAnalysisPDF = async () => {
    setGenPdfLoading(true);
    try {
      await exportGeneralAnalysisPDF(rawRecords);
    } catch (e) {
      alert('Failed to generate General Analysis PDF: ' + e.message);
    } finally {
      setGenPdfLoading(false);
    }
  };

  const activeFilters  = { year: filterYear, district: filterDistrict, sex: filterSex, arrangement: filterArrangement };
  const hasFilter      = Object.values(activeFilters).some(Boolean);
  const displayRecords = hasFilter ? applyFilters(rawRecords, activeFilters) : rawRecords;
  const resetFilters   = () => { setFilterYear(''); setFilterDistrict(''); setFilterSex(''); setFilterArrangement(''); };

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
  const encChartData = rows.map(r => ({ name: r.district.replace('District ', 'D'), '2024': r.enc2024, '2025': r.enc2025 }));
  const ageChartData = rows.map(r => ({ name: r.district.replace('District ', 'D'), '18–30': r.age1830, '31–45': r.age3145, '45+': r.age45above }));

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
            All 6 Districts · Combined 2024 &amp; 2025 ·
            Generated: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
            {hasFilter && (
              <span style={{ marginLeft: '8px', color: '#e67e22', fontWeight: '600' }}>
                ● Filtered view active
              </span>
            )}
          </p>
        </div>

        <div className="hide-on-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            onClick={handleGeneralAnalysisPDF}
            disabled={genPdfLoading}
            style={{
              ...S.btn,
              background: genPdfLoading ? '#999' : '#7B1113',
              cursor: genPdfLoading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
            title="Export General Analysis Report as PDF (QC PESO format)"
          >
            {genPdfLoading ? '⏳ Generating…' : '📋 General Analysis PDF'}
          </button>

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
            { label: 'Encoded 2024',     val: n(tot.enc2024)    },
            { label: 'Encoded 2025',     val: n(tot.enc2025)    },
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

      {/* ── Tabs Card ── */}
      <div style={S.card}>

        {/* Filter Bar */}
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
              options: [['','All Years'],  ['2024','2024'], ['2025','2025']] },
            { label: 'District',    value: filterDistrict,    setter: setFilterDistrict,
              options: [['','All Districts'], ...DISTRICTS.map(d => [d, d])] },
            { label: 'Sex',         value: filterSex,         setter: setFilterSex,
              options: [['','All'], ['female','Female'], ['male','Male']] },
            { label: 'Working Arrangements', value: filterArrangement, setter: setFilterArrangement,
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
            { key: 'benefits',  label: 'Benefits Coverage %'   },
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
            <table style={{ ...S.tbl, tableLayout: 'fixed', minWidth: '1000px' }}>
              <colgroup>
                <col style={{ width: '90px' }} />
                {Array(3).fill(0).map((_, i) => <col key={i} style={{ width: '72px' }} />)}
                <col style={{ width: '68px' }} /><col style={{ width: '58px' }} />
                {Array(3).fill(0).map((_, i) => <col key={`a${i}`} style={{ width: '68px' }} />)}
                <col style={{ width: '60px' }} /><col style={{ width: '78px' }} />
                <col style={{ width: '64px' }} /><col style={{ width: '54px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={S.thL} rowSpan={2}>District</th>
                  <th style={S.th}  rowSpan={2}>Encoded 2024</th>
                  <th style={S.th}  rowSpan={2}>Encoded 2025</th>
                  <th style={S.th}  rowSpan={2}>Sub Total</th>
                  <th style={{ ...S.th, background: '#fce8f0', color: '#993556' }} colSpan={2}>Gender</th>
                  <th style={S.th}  colSpan={3}>Working Arrangements</th>
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

        {/* ── Nature of Work ── */}
        {tab === 'work' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ ...S.tbl, tableLayout: 'fixed', minWidth: '600px' }}>
              <colgroup>
                <col style={{ width: '90px' }} />
                {Array(5).fill(0).map((_, i) => <col key={i} style={{ width: '110px' }} />)}
              </colgroup>
              <thead>
                <tr>
                  <th style={S.thL}>District</th>
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

        {/* ── Per Barangay — official barangays only, always all shown ── */}
        {tab === 'barangay' && (
          <div style={{ padding: '16px' }}>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '11px', color: '#888', flexWrap: 'wrap' }}>
              <span>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: '#fff', border: '1px solid #e0dcf5', borderRadius: 2, marginRight: 4 }} />
                Barangay with registered kasambahays
              </span>
              <span>
                <span style={{ display: 'inline-block', width: 10, height: 10, background: '#fdf6f6', border: '1px solid #e0dcf5', borderRadius: 2, marginRight: 4 }} />
                No registered kasambahays yet
              </span>
              <span style={{ marginLeft: 'auto', fontStyle: 'italic', color: '#aaa' }}>
                Showing all official barangays per district (QC)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {DISTRICTS.map(d => {
                const brgyList   = barangay[d] || [];
                const grandTotal = brgyList.reduce((s, b) => s + b.count, 0);
                const withData   = brgyList.filter(b => b.count > 0).length;

                return (
                  <div key={d} style={{ border: '1px solid #e4e2f5', borderRadius: '8px', overflow: 'hidden' }}>
                    {/* District header */}
                    <div style={{ background: '#534AB7', color: '#fff', padding: '8px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '700', fontSize: '12px' }}>{d}</span>
                        <span style={{ fontSize: '11px', opacity: 0.85 }}>No. of KASAMBAHAY</span>
                      </div>
                      <div style={{ fontSize: '10px', opacity: 0.75, marginTop: '2px' }}>
                        {withData} of {brgyList.length} barangays with records
                      </div>
                    </div>

                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <tbody>
                          {brgyList.length === 0
                            ? (
                              <tr>
                                <td style={{ ...S.td, textAlign: 'center', color: '#aaa', padding: '16px' }}>
                                  No barangay data
                                </td>
                              </tr>
                            )
                            : brgyList.map((b, i) => {
                                const hasRecords = b.count > 0;
                                return (
                                  <tr
                                    key={b.barangay}
                                    style={{
                                      background: hasRecords
                                        ? (i % 2 === 0 ? '#fff' : '#faf9fe')
                                        : '#fdf6f6',
                                    }}
                                  >
                                    <td style={{
                                      ...S.tdL,
                                      fontWeight: '400',
                                      fontSize: '12px',
                                      paddingLeft: '8px',
                                      color: hasRecords ? '#333' : '#bbb',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                    }}>
                                      <input 
                                        type="checkbox" 
                                        checked={hasRecords} 
                                        readOnly 
                                        style={{
                                          width: '14px',
                                          height: '14px',
                                          cursor: 'default',
                                          flexShrink: 0,
                                          accentColor: '#534AB7',
                                        }}
                                      />
                                      {b.barangay}
                                    </td>
                                    <td style={{
                                      ...S.td,
                                      fontWeight: hasRecords ? '600' : '400',
                                      color: hasRecords ? '#534AB7' : '#ccc',
                                      paddingRight: '12px',
                                    }}>
                                      {hasRecords ? n(b.count) : '—'}
                                    </td>
                                  </tr>
                                );
                              })
                          }
                        </tbody>
                      </table>
                    </div>

                    <div style={{
                      background: '#edeaf9',
                      borderTop: '2px solid #d5d0f0',
                      padding: '7px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: '700',
                      fontSize: '12px',
                      color: '#3c3289',
                    }}>
                      <span>Grand Total</span>
                      <span>{n(grandTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
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