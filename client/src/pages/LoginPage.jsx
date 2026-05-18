import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_ENDPOINTS } from '../utils/api';
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
      const res  = await fetch(`${API_ENDPOINTS.AUTH_LOGIN}`, {
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
    <div style={styles.page}>

      {/* Left panel */}
      <div style={styles.left}>
        <div style={styles.leftInner}>
          <div style={styles.seal}>
            <div style={styles.sealRing}>
              <span style={styles.sealLetter}>K</span>
            </div>
          </div>
          <h1 style={styles.leftTitle}>Kasambahay<br />Management System</h1>
          <p style={styles.leftSub}>
            Quezon City Government<br />
            Department of Labor & Employment
          </p>
          <div style={styles.dividerLine} />
          <p style={styles.leftNote}>
            Centralizing kasambahay registrations,<br />
            trainings, and employment records<br />
            across all six districts.
          </p>
          <div style={styles.stats}>
            {[['6', 'Districts'], ['2', 'Years'], ['All', 'Records']].map(([val, lbl]) => (
              <div key={lbl} style={styles.statItem}>
                <span style={styles.statVal}>{val}</span>
                <span style={styles.statLbl}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={styles.right}>
        <div style={styles.card}>

          <div style={styles.cardHeader}>
            <p style={styles.cardEyebrow}>Authorized access only</p>
            <h2 style={styles.cardTitle}>Sign in</h2>
            <p style={styles.cardSub}>Enter your credentials to continue</p>
          </div>

          {serverError && (
            <div style={styles.alertBox}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {serverError}
            </div>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: '' })) }}
              onKeyDown={onKey}
              placeholder="your@email.com"
              style={{ ...styles.input, ...(errors.email ? styles.inputErr : {}) }}
              autoComplete="email"
            />
            {errors.email && <span style={styles.errMsg}>{errors.email}</span>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: '' })) }}
                onKeyDown={onKey}
                placeholder="••••••••"
                style={{ ...styles.input, paddingRight: 80, ...(errors.password ? styles.inputErr : {}) }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={styles.showBtn}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <span style={styles.errMsg}>{errors.password}</span>}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ ...styles.submitBtn, ...(loading ? styles.submitBtnDisabled : {}) }}
          >
            {loading ? (
              <span style={styles.spinner} />
            ) : (
              <>
                Sign in
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>

          <p style={styles.footNote}>
            For account issues, contact your system administrator.
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; border-color: #2563a8 !important; box-shadow: 0 0 0 3px rgba(37,99,168,0.12); }
        input::placeholder { color: #bbb; }
      `}</style>
    </div>
  )
}

const styles = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'DM Sans', sans-serif",
    background: '#f4f3ef',
  },
  left: {
    width: 420,
    flexShrink: 0,
    background: '#1a2744',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  leftInner: {
    maxWidth: 320,
  },
  seal: {
    marginBottom: 28,
  },
  sealRing: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.08)',
  },
  sealLetter: {
    fontSize: 24,
    fontWeight: 600,
    color: '#fff',
    fontFamily: "'DM Serif Display', serif",
  },
  leftTitle: {
    fontSize: 28,
    fontWeight: 300,
    color: '#fff',
    lineHeight: 1.25,
    marginBottom: 12,
    fontFamily: "'DM Serif Display', serif",
    letterSpacing: '-0.01em',
  },
  leftSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 1.6,
    marginBottom: 24,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 400,
  },
  dividerLine: {
    width: 40,
    height: 1,
    background: 'rgba(255,255,255,0.2)',
    marginBottom: 24,
  },
  leftNote: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 1.7,
    marginBottom: 36,
  },
  stats: {
    display: 'flex',
    gap: 28,
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  statVal: {
    fontSize: 22,
    fontWeight: 600,
    color: '#fff',
    fontFamily: "'DM Serif Display', serif",
  },
  statLbl: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  right: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    background: '#f4f3ef',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#fff',
    borderRadius: 16,
    padding: '40px 44px',
    border: '1px solid #e8e5de',
    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
  },
  cardHeader: {
    marginBottom: 32,
  },
  cardEyebrow: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#9ca3af',
    marginBottom: 8,
    fontWeight: 500,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: 600,
    color: '#111827',
    fontFamily: "'DM Serif Display', serif",
    marginBottom: 6,
    letterSpacing: '-0.01em',
  },
  cardSub: {
    fontSize: 14,
    color: '#6b7280',
  },
  alertBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: '#b91c1c',
    marginBottom: 20,
    lineHeight: 1.5,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    marginBottom: 7,
  },
  input: {
    width: '100%',
    height: 44,
    padding: '0 14px',
    fontSize: 14,
    color: '#111827',
    background: '#fafaf9',
    border: '1px solid #d1cfc7',
    borderRadius: 8,
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  inputErr: {
    borderColor: '#f87171',
    background: '#fff8f8',
  },
  errMsg: {
    display: 'block',
    marginTop: 5,
    fontSize: 12,
    color: '#ef4444',
  },
  showBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 500,
    color: '#6b7280',
    padding: '0 4px',
    fontFamily: "'DM Sans', sans-serif",
  },
  submitBtn: {
    width: '100%',
    height: 46,
    background: '#1a2744',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
    transition: 'background 0.15s',
    letterSpacing: '0.01em',
    fontFamily: "'DM Sans', sans-serif",
  },
  submitBtnDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed',
  },
  spinner: {
    width: 18,
    height: 18,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },
  footNote: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 1.5,
  },
}
