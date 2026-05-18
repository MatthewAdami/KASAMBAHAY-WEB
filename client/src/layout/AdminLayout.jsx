import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AdminLayout() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      position: 'absolute',
      top: 0,
      left: 0,
      background: '#f4f4f5',
    }}>
      <Sidebar />

      {/* Main content area */}
     <div style={{
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  height: '100vh',
  overflowY: 'auto',
}}>
  <Outlet />
</div>
    </div>
  )
}