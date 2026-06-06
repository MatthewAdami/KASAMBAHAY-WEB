import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function ResetPasswordPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [status, setStatus]     = useState('idle') // idle, loading, success, error
  const [msg, setMsg]           = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) {
      setStatus('error')
      setMsg('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setStatus('error')
      setMsg('Password must be at least 6 characters long.')
      return
    }

    setStatus('loading')
    try {
      const res = await fetch(`https://kasambahay-backend.onrender.com/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.message || 'Failed to reset password.')
      
      setStatus('success')
      setMsg('Your password has been successfully reset!')
    } catch (err) {
      setStatus('error')
      setMsg(err.message)
    }
  }

  if (status === 'success') {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ background: '#fff', padding: '40px 32px', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: 400, width: '100%' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h2 style={{ margin: '0 0 8px', color: '#111827', fontSize: 24 }}>Password Reset</h2>
          <p style={{ color: '#4b5563', fontSize: 15, marginBottom: 24, lineHeight: 1.5 }}>{msg}</p>
          <button onClick={() => navigate('/login')} style={{ width: '100%', padding: '12px', background: '#534AB7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: '#fff', padding: '40px 32px', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxWidth: 400, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 8px', color: '#111827', fontSize: 24 }}>Set New Password</h2>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Enter a new strong password below.</p>
        </div>

        {status === 'error' && (
          <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 20 }}>
            ⚠ {msg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              placeholder="••••••••"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Confirm New Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              width: '100%', padding: '12px', background: status === 'loading' ? '#9ca3af' : '#534AB7', color: '#fff',
              border: 'none', borderRadius: 8, cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 600,
            }}
          >
            {status === 'loading' ? 'Saving...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  )
}