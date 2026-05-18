import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AnimatedBackground from '../components/AnimatedBackground'
import { authAPI } from '../services/api'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      await authAPI.resetPassword(email, newPassword)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed. Email not found.')
    } finally {
      setLoading(false)
    }
  }

  const inp = {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.07)',
    background: 'rgba(255,255,255,0.03)', color: '#fff',
    fontSize: '14px', outline: 'none', transition: 'all 0.2s',
    fontFamily: 'Inter, sans-serif'
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#080808',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative'
    }}>
      <AnimatedBackground />

      <div style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px',
        background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderRadius: '20px', border: '1px solid rgba(0,212,170,0.2)',
        padding: '44px 40px',
        boxShadow: '0 0 0 1px rgba(0,212,170,0.05), 0 40px 100px rgba(0,0,0,0.7)',
        animation: 'fadeInUp 0.6s ease'
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span style={{
            fontSize: '34px', fontWeight: '700', letterSpacing: '-1px',
            background: 'linear-gradient(135deg, #00ffcc 0%, #00d4aa 40%, #00a884 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            display: 'inline-block'
          }}>TradeForge</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}>
            <div style={{ height: '1px', width: '40px', background: 'linear-gradient(90deg, transparent, rgba(0,212,170,0.3))' }} />
            <span style={{ color: 'rgba(0,212,170,0.5)', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase' }}>AI-Powered Trading</span>
            <div style={{ height: '1px', width: '40px', background: 'linear-gradient(90deg, rgba(0,212,170,0.3), transparent)' }} />
          </div>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p style={{ fontSize: '56px', marginBottom: '16px' }}>✅</p>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              Password Reset!
            </h2>
            <p style={{ color: '#444', fontSize: '13px', marginBottom: '8px' }}>
              Your password has been updated successfully.
            </p>
            <p style={{ color: 'rgba(0,212,170,0.6)', fontSize: '12px', marginBottom: '28px' }}>
              Redirecting to login...
            </p>
            <Link to="/login" style={{
              display: 'block', padding: '13px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #00d4aa, #00b894)',
              color: '#000', fontSize: '14px', fontWeight: '700',
              textDecoration: 'none', textAlign: 'center',
              boxShadow: '0 4px 24px rgba(0,212,170,0.35)'
            }}>Sign In Now →</Link>
          </div>
        ) : (
          <>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
              Reset Password
            </h2>
            <p style={{ color: '#444', fontSize: '13px', marginBottom: '28px' }}>
              Enter your email and choose a new password
            </p>

            {error && (
              <div style={{
                background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)',
                borderRadius: '10px', padding: '12px 14px', marginBottom: '20px',
                color: '#ff6b6b', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center'
              }}>
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleReset}>
              {/* Email */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>
                  Email
                </label>
                <input
                  type="email" placeholder="your@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                  style={inp}
                  onFocus={e => { e.target.style.borderColor = 'rgba(0,212,170,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,212,170,0.08)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              {/* New Password */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required minLength={6}
                    style={{ ...inp, padding: '12px 44px 12px 14px' }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(0,212,170,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,212,170,0.08)' }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '16px', padding: '4px', lineHeight: 1, transition: 'color 0.2s' }}
                    onMouseEnter={e => e.target.style.color = '#00d4aa'}
                    onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '28px' }}>
                <label style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required minLength={6}
                  style={{
                    ...inp,
                    borderColor: confirmPassword && confirmPassword !== newPassword
                      ? 'rgba(255,80,80,0.5)' : 'rgba(255,255,255,0.07)'
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(0,212,170,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,212,170,0.08)' }}
                  onBlur={e => {
                    e.target.style.borderColor = confirmPassword && confirmPassword !== newPassword
                      ? 'rgba(255,80,80,0.5)' : 'rgba(255,255,255,0.07)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p style={{ color: '#ff5050', fontSize: '11px', marginTop: '6px' }}>
                    Passwords do not match
                  </p>
                )}
                {confirmPassword && confirmPassword === newPassword && (
                  <p style={{ color: '#00d4aa', fontSize: '11px', marginTop: '6px' }}>
                    ✓ Passwords match
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
                  background: loading ? 'rgba(0,212,170,0.15)' : 'linear-gradient(135deg, #00d4aa, #00b894)',
                  color: loading ? '#00d4aa' : '#000',
                  fontSize: '14px', fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 30px rgba(0,212,170,0.4)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if (!loading) { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 8px 40px rgba(0,212,170,0.5)' } }}
                onMouseLeave={e => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = loading ? 'none' : '0 4px 30px rgba(0,212,170,0.4)' }}
              >
                {loading ? '⏳ Resetting...' : '🔐 Reset Password →'}
              </button>
            </form>

            <p style={{ color: '#333', fontSize: '13px', textAlign: 'center', marginTop: '24px' }}>
              Remember it?{' '}
              <Link to="/login" style={{ color: '#00d4aa', textDecoration: 'none', fontWeight: '600' }}>
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}