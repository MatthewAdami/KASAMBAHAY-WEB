// ─── Role Definitions ─────────────────────────────────────────────────────────
// Roles: 'Admin' | 'SPES' | 'GIP' | 'helper' (viewer)

export const ROLES = {
  ADMIN:  'Admin',
  SPES:   'SPES',
  GIP:    'GIP',
  VIEWER: 'helper',
}

// Encoder roles — both SPES and GIP have the same encoding permissions
const ENCODERS = ['SPES', 'GIP']

// What each role can access
export const PERMISSIONS = {
  // Pages
  viewDashboard:    ['Admin', ...ENCODERS, 'helper'],
  viewRecords:      ['Admin', ...ENCODERS, 'helper'],
  viewKasambahay:   ['Admin', ...ENCODERS, 'helper'],
  viewReports:      ['Admin', ...ENCODERS, 'helper'],
  viewUsers:        ['Admin'],
  viewAuditLog:     ['Admin'],
  viewSettings:     ['Admin'],

  // Actions
  addRecord:        ['Admin', ...ENCODERS],
  editRecord:       ['Admin', ...ENCODERS],
  deleteRecord:     ['Admin'],
  createUser:       ['Admin'],
  manageUsers:      ['Admin'],
}

// Check if a role has a permission
export function can(role, permission) {
  return PERMISSIONS[permission]?.includes(role) ?? false
}

// Get current user from localStorage
export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch {
    return {}
  }
}

// Get current user's role
export function getRole() {
  return getCurrentUser().role || ''
}
