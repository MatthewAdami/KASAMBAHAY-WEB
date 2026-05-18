import { Routes, Route, Navigate } from 'react-router-dom'

import AdminLayout    from './layout/AdminLayout'
import AdminDashboard from './pages/AdminDashboard'
import UsersPage      from './pages/UserPage'
import KasambahayPage from './pages/KasambahayData'
import LoginPage      from './pages/LoginPage'

const ReportsPage  = () => <div style={{ padding: 24 }}>Reports page</div>
const SettingsPage = () => <div style={{ padding: 24 }}>Settings page</div>
const AuditPage    = () => <div style={{ padding: 24 }}>Audit log page</div>

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index             element={<AdminDashboard />} />
        <Route path="users"      element={<UsersPage />} />
        <Route path="kasambahay" element={<KasambahayPage />} />
        <Route path="reports"    element={<ReportsPage />} />
        <Route path="settings"   element={<SettingsPage />} />
        <Route path="audit"      element={<AuditPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}