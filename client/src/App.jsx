import { Routes, Route, Navigate } from 'react-router-dom'

import AdminLayout    from './layout/AdminLayout'
import AdminDashboard from './pages/AdminDashboard'
import UsersPage      from './pages/UserPage'
import KasambahayPage from './pages/KasambahayData'
import LoginPage      from './pages/LoginPage'

const ReportsPage  = () => <div style={{ padding: 24 }}>Reports page</div>
const SettingsPage = () => <div style={{ padding: 24 }}>Settings page</div>
const AuditPage    = () => <div style={{ padding: 24 }}>Audit log page</div>

// 💡 Simple guard component to protect admin routes
const ProtectedRoute = ({ children }) => {
  // Check if a user token exists in local storage (change 'token' to whatever key your login system uses)
  const token = localStorage.getItem('token'); 
  
  if (!token) {
    // No token found? Boot them back to the login page!
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

export default function App() {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* 💡 Protected Routes: Wrapped inside our authentication guard */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index             element={<AdminDashboard />} />
        <Route path="users"      element={<UsersPage />} />
        <Route path="kasambahay" element={<KasambahayPage />} />
        <Route path="reports"    element={<ReportsPage />} />
        <Route path="settings"   element={<SettingsPage />} />
        <Route path="audit"      element={<AuditPage />} />
      </Route>

      {/* Default Fallback: If not logged in, ProtectedRoute will catch it and send to /login */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}