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
    setLoading(true)
    setServerError('')
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
    <div style={S.page}>

      {/* ── Left panel ── */}
      <div style={S.left}>
        {/* Logo row */}
        <div style={S.logoRow}>
          <img src='/kasambahaylogo.png' alt='Kasambahay Logo' style={S.logoMain} />
          <div style={S.logoDivider} />
          <img src='/PESOLogo.png'      alt='PESO Logo'        style={S.logoPeso} />
        </div>

        <h1 style={S.title}>Kasambahay<br />Management System</h1>
        <p style={S.sub}>Quezon City Government<br />Public Employment Service Office</p>
        <div style={S.divider} />
        <p style={S.note}>
          Centralizing kasambahay registrations,<br />
          trainings, and employment records<br />
          across all six districts.
        </p>

        <div style={S.stats}>
          {[['6','Districts'],['2','Years'],['All','Records']].map(([v,l]) => (
            <div key={l} style={S.statItem}>
              <span style={S.statVal}>{v}</span>
              <span style={S.statLbl}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={S.right}>
        {/* Photo grid background */}
        <div style={S.photoGrid}>
          {PHOTOS.map((src, i) => (
            <img key={i} src={src} alt="" style={S.photo} />
          ))}
        </div>
        {/* Overlay */}
        <div style={S.overlay} />

        {/* Login card */}
        <div style={S.card}>
          <p style={S.eyebrow}>Authorized access only</p>
          <h2 style={S.cardTitle}>Sign in</h2>
          <p style={S.cardSub}>Enter your credentials to continue</p>

          {serverError && (
            <div style={S.alert}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {serverError}
            </div>
          )}

          {/* Email */}
          <div style={S.field}>
            <label style={S.label}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: '' })) }}
              onKeyDown={onKey}
              placeholder="your@email.com"
              style={{ ...S.input, ...(errors.email ? S.inputErr : {}) }}
              autoComplete="email"
            />
            {errors.email && <span style={S.err}>{errors.email}</span>}
          </div>

          {/* Password */}
          <div style={S.field}>
            <label style={S.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: '' })) }}
                onKeyDown={onKey}
                placeholder="••••••••"
                style={{ ...S.input, paddingRight: 60, ...(errors.password ? S.inputErr : {}) }}
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPw(v => !v)} style={S.showBtn}>
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <span style={S.err}>{errors.password}</span>}
          </div>

          <button onClick={handleSubmit} disabled={loading} style={{ ...S.submit, ...(loading ? S.submitDis : {}) }}>
            {loading ? <span style={S.spinner} /> : <>Sign in <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></>}
          </button>

          <p style={S.foot}>For account issues, contact your system administrator.</p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; border-color: #b91c1c !important; box-shadow: 0 0 0 3px rgba(185,28,28,0.12); }
        input::placeholder { color: #bbb; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .lp-left  { display: none !important; }
          .lp-right { width: 100% !important; }
        }
      `}</style>
    </div>
  )
}

const S = {
  page: {
    display: 'flex', minHeight: '100vh', width: '100%',
    fontFamily: "'DM Sans', sans-serif",
  },

  /* ── Left ── */
  left: {
    flex: 1, minHeight: '100vh',
    background: '#1a2744',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '40px 64px', textAlign: 'center',
  },
  logoRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
    background: '#fff', borderRadius: 16, padding: '14px 24px',
    marginBottom: 28, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
  },
  logoMain: {
    width: 140, height: 140, objectFit: 'contain',
    filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.5))',
  },
  logoDivider: { width: 1, height: 80, background: '#e5e7eb' },
  logoPeso: {
    width: 90, height: 90, objectFit: 'contain',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
  },
  title: {
    fontSize: 28, fontWeight: 300, color: '#fff', lineHeight: 1.25,
    marginBottom: 12, fontFamily: "'DM Serif Display', serif",
  },
  sub: {
    fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6,
    marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  divider: { width: 40, height: 1, background: 'rgba(255,255,255,0.2)', marginBottom: 24 },
  note: { fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, marginBottom: 36 },
  stats: { display: 'flex', gap: 28, justifyContent: 'center' },
  statItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  statVal: { fontSize: 22, fontWeight: 600, color: '#fff', fontFamily: "'DM Serif Display', serif" },
  statLbl: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' },

  /* ── Right ── */
  right: {
    flex: 1, minHeight: '100vh', position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px',
  },
  photoGrid: {
    position: 'absolute', inset: 0,
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)',
    opacity: 0.7,
  },
  photo: { width: '100%', height: '100%', objectFit: 'cover' },
  overlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(135deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.75) 50%, rgba(255,255,255,0.70) 100%)',
  },
  card: {
    position: 'relative', zIndex: 10,
    width: '100%', maxWidth: 420,
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(12px)',
    borderRadius: 16,
    padding: '40px 36px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
    border: '1px solid rgba(255,255,255,0.8)',
  },
  eyebrow: {
    fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
    color: '#9ca3af', marginBottom: 8, fontWeight: 500,
  },
  cardTitle: {
    fontSize: 26, fontWeight: 600, color: '#111827',
    fontFamily: "'DM Serif Display', serif", marginBottom: 6,
  },
  cardSub: { fontSize: 14, color: '#6b7280', marginBottom: 28 },
  alert: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    background: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: 8, padding: '10px 14px',
    fontSize: 13, color: '#b91c1c', marginBottom: 20, lineHeight: 1.5,
  },
  field: { marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 7 },
  input: {
    width: '100%', height: 44, padding: '0 14px', fontSize: 14, color: '#111827',
    background: 'rgba(250,250,249,0.9)', border: '1px solid #d1cfc7',
    borderRadius: 8, transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  inputErr: { borderColor: '#f87171', background: '#fff8f8' },
  err: { display: 'block', marginTop: 5, fontSize: 12, color: '#ef4444' },
  showBtn: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 12, fontWeight: 500, color: '#6b7280', padding: '0 4px',
    fontFamily: "'DM Sans', sans-serif",
  },
  submit: {
    width: '100%', height: 48, background: '#b91c1c', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 8, marginBottom: 20, transition: 'background 0.15s',
    fontFamily: "'DM Sans', sans-serif",
  },
  submitDis: { background: '#fca5a5', cursor: 'not-allowed' },
  spinner: {
    width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },
  foot: { fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5 },
}
