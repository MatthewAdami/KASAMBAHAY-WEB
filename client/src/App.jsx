import { Routes, Route, Navigate } from 'react-router-dom'

import AdminLayout    from './layout/AdminLayout'
import AdminDashboard from './pages/AdminDashboard'
import UsersPage      from './pages/UserPage'
import KasambahayPage from './pages/KasambahayData'
import ActivityLogs   from './pages/ActivityLogs'
import LoginPage      from './pages/LoginPage'
import KasambahaySummaryReport from './pages/KasambahaySummaryReport'
import ReportsPage    from './pages/ReportsPage'
import SettingsPage   from './pages/SettingsPage'
import ProgramsPage   from './pages/ProgramsPage'
import TrainingsPage from './pages/TrainingsPage'
import { can, getRole } from './rbac'
const AuditPage = () => <div style={{ padding: 24 }}>Audit log page</div>

// ─── Access Denied page ───────────────────────────────────────────────────────
const AccessDenied = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100%', gap: 12, padding: 40,
    fontFamily: "'DM Sans', sans-serif",
  }}>
    <div style={{ fontSize: 48 }}>🚫</div>
    <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111', margin: 0 }}>Access Denied</h2>
    <p style={{ fontSize: 14, color: '#888', textAlign: 'center', margin: 0 }}>
      You don't have permission to view this page.<br />
      Contact your administrator if you think this is a mistake.
    </p>
  </div>
)

// ─── Auth guard — checks token exists ─────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  const expiresAt = parseInt(localStorage.getItem('token_expires_at') || '0')

  if (!token || Date.now() > expiresAt) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('token_expires_at')
    return <Navigate to="/login" replace />
  }
  return children
}

// ─── Role guard — checks role has permission ──────────────────────────────────
const RoleRoute = ({ permission, children }) => {
  const role = getRole()
  if (!can(role, permission)) return <AccessDenied />
  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected: must be logged in */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        {/* All logged-in roles can see the dashboard */}
        <Route index element={<AdminDashboard />} />

        {/* Admin only */}
        <Route path="users" element={
          <RoleRoute permission="viewUsers">
            <UsersPage />
          </RoleRoute>
        } />
        <Route path="audit" element={
          <RoleRoute permission="viewAuditLog">
            <AuditPage />
          </RoleRoute>
        } />
        <Route path="settings" element={
          <RoleRoute permission="viewSettings">
            <SettingsPage />
          </RoleRoute>
        } />

        {/* Admin + Encoder */}
        <Route path="kasambahay" element={
          <RoleRoute permission="viewKasambahay">
            <KasambahayPage />
          </RoleRoute>
        } />
        <Route path="programs" element={
          <RoleRoute permission="viewKasambahay">
            <ProgramsPage />
          </RoleRoute>
        } />
        <Route path="trainings" element={
          <RoleRoute permission="viewKasambahay">
            <TrainingsPage />
          </RoleRoute>
        } />
        <Route path="reports" element={
          <RoleRoute permission="viewReports">
            <ReportsPage />
          </RoleRoute>
        } />
      <Route path="summary-report" element={
        <RoleRoute permission="viewReports">
          <KasambahaySummaryReport />
        </RoleRoute>
      } />
        <Route path="activity-logs" element={
          <RoleRoute permission="viewAuditLog">
            <ActivityLogs />
          </RoleRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
