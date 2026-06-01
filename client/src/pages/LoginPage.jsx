import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '../utils/api';

const PHOTOS = [
  '/photo1.jpg',
  '/photo2.jpg',
  '/photo3.jpg',
  '/photo4.jpg',
  '/photo5.jpg',
  '/photo1.jpg',
]


export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [errors, setErrors]     = useState({})
  const [serverError, setServerError] = useState('')
  const navigate = useNavigate()

  const validate = () => {
    const e = {}
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = 'Enter a valid email address.'
    if (!password)
      e.password = 'Password is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true); setServerError('')
    try {
      const res  = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setServerError(data.message); return }
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate(data.user.role === 'Admin' ? '/admin/dashboard' : '/dashboard')
    } catch {
      setServerError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e) => { if (e.key === 'Enter') handleSubmit() }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── LEFT PANEL — photo collage with light blue gradient overlay ── */}
      <div style={{
        flex: '0 0 55%',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }} className="lp-left">

        {/* 3×3 photo grid background */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
        }}>
          {PHOTOS.map((src, i) => (
            <img key={i} src={src} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ))}
        </div>

        {/* Light blue gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, rgba(153,183,222,0.88) 0%, rgba(96,149,220,0.88) 40%, rgba(37,99,235,0.88) 100%)',
        }} />

        {/* Content on top of overlay */}
        <div style={{
          position: 'relative', zIndex: 10,
          height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '48px',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: 420, width: '100%' }}>

            {/* Logo container */}
            <div style={{ marginBottom: 32 }}>
              <img
                src="/Kasambahay-Program-Logo-removebg-preview.png"
                alt="Kasambahay Program Logo"
                style={{
                  height: 200, width: 'auto', objectFit: 'contain',
                  filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.95)) drop-shadow(0 0 40px rgba(255,255,255,0.7)) drop-shadow(0 0 70px rgba(255,255,255,0.4))',
                }}
              />
            </div>
            {/* Title */}
            <h1 style={{
              color: '#fff', fontSize: 32, fontWeight: 700,
              lineHeight: 1.25, marginBottom: 8,
              textShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}>
              Kasambahay<br />Management System
            </h1>

            <p style={{
              color: 'rgba(219,234,254,0.95)', fontSize: 13,
              marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              Quezon City Government
            </p>
            <p style={{
              color: 'rgba(239,246,255,0.85)', fontSize: 12,
              marginBottom: 28, letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              Public Employment Service Office
            </p>

            {/* Divider */}
            <div style={{
              width: 64, height: 1,
              background: 'rgba(255,255,255,0.5)',
              margin: '0 auto 24px',
            }} />

            {/* Description */}
            <p style={{
              color: 'rgba(255,255,255,0.9)', fontSize: 14,
              lineHeight: 1.75, marginBottom: 36,
            }}>
              Centralizing kasambahay registrations,<br />
              trainings, and employment records<br />
              across all six districts.
            </p>

            {/* Stats */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 40 }}>
              {[['6','Districts'],['3','Years'],['All','Records']].map(([v, l]) => (
                <div key={l} style={{ textAlign: 'center' }}>
                  <p style={{
                    color: '#fff', fontSize: 38, fontWeight: 700,
                    lineHeight: 1, marginBottom: 6,
                    textShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  }}>{v}</p>
                  <p style={{
                    color: 'rgba(219,234,254,0.85)', fontSize: 11,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                  }}>{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — clean white form ── */}
      <div style={{
        flex: '0 0 45%',
        minHeight: '100vh',
        background: 'linear-gradient(270deg, #94e1f8 0%, #7cb3f3 60%, #7cacfa 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 32px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: '#747a85',
              letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12,
            }}>
              AUTHORIZED ACCESS ONLY
            </p>
            <h2 style={{
              fontSize: 30, fontWeight: 700, color: '#111827',
              marginBottom: 8, fontFamily: "'DM Sans', sans-serif",
            }}>
              Sign in
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              Enter your credentials to continue
            </p>
          </div>

          {serverError && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#b91c1c', marginBottom: 20, lineHeight: 1.5,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {serverError}
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: '' })) }}
              onKeyDown={onKey}
              placeholder="your@email.com"
              style={{
                width: '100%', padding: '12px 16px', fontSize: 14, color: '#111827',
                border: errors.email ? '1px solid #f87171' : '1px solid #d1d5db',
                borderRadius: 8, background: errors.email ? '#fff8f8' : '#f9fafb',
                outline: 'none', boxSizing: 'border-box',
              }}
              autoComplete="email"
            />
            {errors.email && <span style={{ display: 'block', marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.email}</span>}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: '' })) }}
                onKeyDown={onKey}
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '12px 48px 12px 16px', fontSize: 14, color: '#111827',
                  border: errors.password ? '1px solid #f87171' : '1px solid #d1d5db',
                  borderRadius: 8, background: errors.password ? '#fff8f8' : '#f9fafb',
                  outline: 'none', boxSizing: 'border-box',
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#6b7280', display: 'flex', alignItems: 'center', padding: 0,
                }}
              >
                {showPw ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            {errors.password && <span style={{ display: 'block', marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.password}</span>}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: '13px', fontSize: 15, fontWeight: 600,
              color: '#fff', background: loading ? '#fca5a5' : '#b91c1c',
              border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 24, transition: 'background 0.15s',
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: '0 4px 12px rgba(185,28,28,0.3)',
            }}
          >
            {loading ? (
              <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            ) : (
              <>Sign in <span style={{ fontSize: 18, lineHeight: 1 }}>→</span></>
            )}
          </button>

          <p style={{ fontSize: 12, color: '#5d6066', textAlign: 'center', lineHeight: 1.5 }}>
            For account issues, contact your system administrator.
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none !important; border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15) !important; }
        input::placeholder { color: #9ca3af; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .lp-left { display: none !important; }
        }
      `}</style>
    </div>
  )
}
