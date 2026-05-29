import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '../utils/api';

const PHOTOS = [
  'https://images.unsplash.com/photo-1647381518264-97ff1835026f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
  'https://images.unsplash.com/photo-1758272421751-963195322eaa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
  'https://images.unsplash.com/photo-1581578731548-c64695cc6952?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
  'https://images.unsplash.com/photo-1774556377811-ad512c1bbb66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
  'https://images.unsplash.com/photo-1758273238368-1e2ada245183?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
  'https://images.unsplash.com/photo-1774556354894-6d923a123ace?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
  'https://images.unsplash.com/photo-1646980241033-cd7abda2ee88?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
  'https://images.unsplash.com/photo-1651803456072-7c3362e4a8df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
  'https://images.unsplash.com/photo-1531428148505-6993f9489e0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
]

// Figma background SVG pattern icons (iron, house, broom, shirt, apron, plate, bucket, sponge)
function BgPattern() {
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="bgPattern" x="0" y="0" width="180" height="180" patternUnits="userSpaceOnUse">
          <g transform="translate(20, 20) rotate(12)" fill="white">
            <path d="M0,8 L12,8 L12,12 L14,15 L-2,15 L0,12 Z" />
            <rect x="4" y="4" width="4" height="3" rx="1" opacity="0.6" />
          </g>
          <g transform="translate(90, 10) rotate(8)" fill="white">
            <path d="M0,10 L10,0 L20,10 L20,25 L0,25 Z" />
          </g>
          <g transform="translate(50, 80) rotate(25)" fill="white">
            <rect x="0" y="0" width="8" height="6" rx="1" />
            <rect x="3" y="6" width="2" height="20" />
          </g>
          <g transform="translate(130, 70) rotate(-12)" fill="white">
            <path d="M4,0 L8,0 L12,4 L12,18 L0,18 L0,4 Z" />
          </g>
          <g transform="translate(20, 120) rotate(6)" fill="white">
            <path d="M5,0 L5,3 L0,3 L0,20 L14,20 L14,3 L9,3 L9,0 Z" />
          </g>
          <g transform="translate(110, 130) rotate(10)" fill="white">
            <circle cx="8" cy="8" r="8" />
          </g>
          <g transform="translate(150, 30) rotate(-5)" fill="white">
            <path d="M2,2 L14,2 L16,16 L0,16 Z" />
          </g>
          <g transform="translate(80, 150) rotate(20)" fill="white">
            <rect x="0" y="0" width="14" height="9" rx="2" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#bgPattern)" />
    </svg>
  )
}

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

      {/* ── LEFT PANEL — #99b7de with SVG pattern, exactly as Figma ── */}
      <div style={{
        flex: '0 0 55%', minHeight: '100vh', position: 'relative', overflow: 'hidden',
        background: '#99b7de',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px',
      }} className="lp-left">

        {/* SVG decorative pattern — opacity 0.15 exactly as Figma */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.15, pointerEvents: 'none' }}>
          <BgPattern />
        </div>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 440, width: '100%', textAlign: 'center' }}>

          {/* Logo with white glow exactly as Figma */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
            <img
              src="/kasambahaylogo.png"
              alt="Kasambahay Program - Dignity in Domestic Work"
              style={{
                height: 192, width: 'auto',
                filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.9)) drop-shadow(0 0 40px rgba(255,255,255,0.6)) drop-shadow(0 0 60px rgba(255,255,255,0.3))',
              }}
            />
          </div>

          {/* Title */}
          <h1 style={{ color: '#fff', fontSize: 30, fontWeight: 700, lineHeight: 1.25, marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
            Kasambahay<br />Management System
          </h1>

          <p style={{ color: 'rgba(219,234,254,0.9)', fontSize: 13, marginBottom: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            QUEZON CITY GOVERNMENT
          </p>
          <p style={{ color: 'rgba(239,246,255,0.8)', fontSize: 12, marginBottom: 24, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            PUBLIC EMPLOYMENT SERVICE OFFICE
          </p>

          {/* Divider */}
          <div style={{ width: 64, height: 1, background: 'rgba(96,165,250,0.6)', margin: '0 auto 24px' }} />

          {/* Description */}
          <p style={{ color: '#111', fontSize: 14, lineHeight: 1.7, marginBottom: 32 }}>
            Centralizing kasambahay registrations,<br />
            trainings, and employment records<br />
            across all six districts.
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
            {[['6','Districts'],['2','Years'],['All','Records']].map(([v,l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <p style={{ color: '#fff', fontSize: 36, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{v}</p>
                <p style={{ color: 'rgba(219,234,254,0.8)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — photo grid + frosted card, exactly as Figma ── */}
      <div style={{
        flex: '0 0 45%', minHeight: '100vh', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* 3×3 photo grid background */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)',
          opacity: 0.7,
        }}>
          {PHOTOS.map((src, i) => (
            <img key={i} src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ))}
        </div>

        {/* White gradient overlay — matches Figma from-white/75 via-white/70 to-white/65 */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.80) 0%, rgba(255,255,255,0.74) 50%, rgba(255,255,255,0.68) 100%)',
        }} />

        {/* Login form card */}
        <div style={{
          position: 'relative', zIndex: 10,
          width: '100%', maxWidth: 420,
          padding: '0 32px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
              AUTHORIZED ACCESS ONLY
            </p>
            <h2 style={{ fontSize: 30, fontWeight: 700, color: '#111827', marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
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
                borderRadius: 8, background: errors.email ? '#fff8f8' : '#fff',
                outline: 'none', boxSizing: 'border-box',
              }}
              autoComplete="email"
            />
            {errors.email && <span style={{ display: 'block', marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.email}</span>}
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
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
                  borderRadius: 8, background: errors.password ? '#fff8f8' : '#fff',
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
              width: '100%', padding: '12px', fontSize: 15, fontWeight: 600,
              color: '#fff', background: loading ? '#fca5a5' : '#b91c1c',
              border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 24, transition: 'background 0.15s', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {loading ? (
              <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
            ) : (
              <>Sign in <span style={{ fontSize: 18, lineHeight: 1 }}>→</span></>
            )}
          </button>

          <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5 }}>
            For account issues, contact your system administrator.
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none !important; border-color: #ef4444 !important; box-shadow: 0 0 0 3px rgba(239,68,68,0.15) !important; }
        input::placeholder { color: #9ca3af; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .lp-left { display: none !important; }
        }
      `}</style>
    </div>
  )
}
