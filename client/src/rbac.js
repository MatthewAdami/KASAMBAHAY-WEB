// ─── Role Definitions ─────────────────────────────────────────────────────────
// Roles: 'Admin' | 'Encoder' | 'helper' (viewer)

export const ROLES = {
  ADMIN:   'Admin',
  ENCODER: 'Encoder',
  VIEWER:  'helper',
}

// What each role can access
export const PERMISSIONS = {
  // Pages
  viewDashboard:    ['Admin', 'Encoder', 'helper'],
  viewRecords:      ['Admin', 'Encoder', 'helper'],
  viewKasambahay:   ['Admin', 'Encoder', 'helper'],
  viewReports:      ['Admin', 'Encoder', 'helper'],
  viewUsers:        ['Admin'],
  viewAuditLog:     ['Admin'],
  viewSettings:     ['Admin'],

  // Actions
  addRecord:        ['Admin', 'Encoder'],
  editRecord:       ['Admin', 'Encoder'],
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
