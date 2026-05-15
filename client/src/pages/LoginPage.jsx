import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function LoginPage() {
  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async () => {
    const errs = {}
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = 'Enter a valid email.'
    if (!password)
      errs.password = 'Password is required.'
    setErrors(errs)
    if (Object.keys(errs).length) return

    try {
      setLoading(true)
      setServerError('')

      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setServerError(data.message)
        return
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

      if (data.user.role === 'Admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/helper/dashboard')
      }

    } catch (err) {
      setServerError('Server error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#ffffff'
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, border: '1px solid #e4e4e7',
        padding: '2rem', width: '100%', maxWidth: 360,
        boxShadow: 'rgba(0, 0, 0, 0.05) 0px 4px 12px'
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111', margin: '0 0 6px' }}>
          Sign in
        </h2>
        <p style={{ fontSize: 14, color: '#888', margin: '0 0 1.5rem' }}>
          Enter your email and password.
        </p>

        {serverError && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 8, padding: '10px 12px',
            fontSize: 13, color: '#ef4444', marginBottom: '1rem'
          }}>
            {serverError}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 5 }}>
            Email
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: '100%', height: 40, padding: '0 12px', fontSize: 14,
              border: `1px solid ${errors.email ? '#f87171' : '#e4e4e7'}`,
              borderRadius: 8, outline: 'none', boxSizing: 'border-box',
              background: '#fafafa', color: '#111'
            }}
          />
          {errors.email && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{errors.email}</p>}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#444', marginBottom: 5 }}>
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', height: 40, padding: '0 70px 0 12px', fontSize: 14,
                border: `1px solid ${errors.password ? '#f87171' : '#e4e4e7'}`,
                borderRadius: 8, outline: 'none', boxSizing: 'border-box',
                background: '#fafafa', color: '#111'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: '#888', padding: 0
              }}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.password && <p style={{ fontSize: 12, color: '#ef4444', margin: '4px 0 0' }}>{errors.password}</p>}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', height: 40,
            background: loading ? '#888' : '#111',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
    </div>
  )
}

export default LoginPage