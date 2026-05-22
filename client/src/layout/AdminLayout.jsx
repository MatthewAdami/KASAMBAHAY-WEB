import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useColors } from '../ThemeContext.jsx'

export default function AdminLayout() {
  const c = useColors()
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      position: 'absolute',
      top: 0,
      left: 0,
      background: c.bg,
      transition: 'background 0.2s',
    }}>
      <Sidebar />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100vh',
        overflowY: 'auto',
        background: c.bg,
        transition: 'background 0.2s',
      }}>
        <Outlet />
      </div>
    </div>
  )
}
