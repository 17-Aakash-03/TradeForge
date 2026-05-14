import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AnimatedBackground from '../components/AnimatedBackground'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('tf_remember_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRemember(true)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await login(email, password)
      if (remember) {
        localStorage.setItem('tf_remember_email', email)
      } else {
        localStorage.removeItem('tf_remember_email')
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your credentials.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#080808', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px', position:'relative' }}>
      <AnimatedBackground />
      <div style={{
        position:'relative', zIndex:1, width:'100%', maxWidth:'420px',
        background:'rgba(10,10,10,0.88)', backdropFilter:'blur(30px)',
        WebkitBackdropFilter:'blur(30px)',
        borderRadius:'20px', border:'1px solid rgba(0,212,170,0.2)',
        padding:'44px 40px',
        boxShadow:'0 0 0 1px rgba(0,212,170,0.05), 0 40px 100px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)',
        animation:'fadeInUp 0.6s ease'
      }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <span style={{
            fontSize:'34px', fontWeight:'700', letterSpacing:'-1px',
            background:'linear-gradient(135deg, #00ffcc 0%, #00d4aa 40%, #00a884 100%)',
            WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
            animation:'logoGlow 3s ease-in-out infinite', display:'inline-block'
          }}>TradeForge</span>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', marginTop:'10px' }}>
            <div style={{ height:'1px', width:'40px', background:'linear-gradient(90deg, transparent, rgba(0,212,170,0.3))' }} />
            <span style={{ color:'rgba(0,212,170,0.5)', fontSize:'10px', letterSpacing:'0.15em', textTransform:'uppercase' }}>AI-Powered Trading</span>
            <div style={{ height:'1px', width:'40px', background:'linear-gradient(90deg, rgba(0,212,170,0.3), transparent)' }} />
          </div>
        </div>

        <h2 style={{ color:'#fff', fontSize:'20px', fontWeight:'600', marginBottom:'4px' }}>Sign in</h2>
        <p style={{ color:'#444', fontSize:'13px', marginBottom:'28px' }}>Enter your credentials to continue</p>

        {error && (
          <div style={{ background:'rgba(255,80,80,0.08)', border:'1px solid rgba(255,80,80,0.2)', borderRadius:'10px', padding:'12px 14px', marginBottom:'20px', color:'#ff6b6b', fontSize:'13px', display:'flex', gap:'8px', alignItems:'center' }}>
            <span>⚠️</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Email */}
          <div style={{ marginBottom:'18px' }}>
            <label style={{ color:'rgba(255,255,255,0.25)', fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:'8px' }}>
              Email
            </label>
            <input
              type="email"
              placeholder="admin@tradeforge.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width:'100%', padding:'12px 14px', borderRadius:'10px',
                border:'1px solid rgba(255,255,255,0.07)',
                background:'rgba(255,255,255,0.03)', color:'#fff',
                fontSize:'14px', outline:'none', transition:'all 0.2s'
              }}
              onFocus={e => { e.target.style.borderColor='rgba(0,212,170,0.5)'; e.target.style.boxShadow='0 0 0 3px rgba(0,212,170,0.08)' }}
              onBlur={e => { e.target.style.borderColor='rgba(255,255,255,0.07)'; e.target.style.boxShadow='none' }}
            />
          </div>

          {/* Password with show/hide */}
          <div style={{ marginBottom:'16px' }}>
            <label style={{ color:'rgba(255,255,255,0.25)', fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:'8px' }}>
              Password
            </label>
            <div style={{ position:'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width:'100%', padding:'12px 44px 12px 14px', borderRadius:'10px',
                  border:'1px solid rgba(255,255,255,0.07)',
                  background:'rgba(255,255,255,0.03)', color:'#fff',
                  fontSize:'14px', outline:'none', transition:'all 0.2s'
                }}
                onFocus={e => { e.target.style.borderColor='rgba(0,212,170,0.5)'; e.target.style.boxShadow='0 0 0 3px rgba(0,212,170,0.08)' }}
                onBlur={e => { e.target.style.borderColor='rgba(255,255,255,0.07)'; e.target.style.boxShadow='none' }}
              />
              {/* Show / Hide button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)',
                  background:'transparent', border:'none', cursor:'pointer',
                  color:'rgba(255,255,255,0.3)', fontSize:'16px', padding:'4px',
                  transition:'color 0.2s', lineHeight:1
                }}
                onMouseEnter={e => e.target.style.color='#00d4aa'}
                onMouseLeave={e => e.target.style.color='rgba(255,255,255,0.3)'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'24px' }}>
            <div
              onClick={() => setRemember(!remember)}
              style={{
                width:'18px', height:'18px', borderRadius:'5px', cursor:'pointer',
                border:`1px solid ${remember ? '#00d4aa' : 'rgba(255,255,255,0.15)'}`,
                background: remember ? '#00d4aa' : 'rgba(255,255,255,0.03)',
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'all 0.2s', flexShrink:0
              }}
            >
              {remember && <span style={{ color:'#000', fontSize:'11px', fontWeight:'700', lineHeight:1 }}>✓</span>}
            </div>
            <span
              onClick={() => setRemember(!remember)}
              style={{ color:'rgba(255,255,255,0.35)', fontSize:'13px', cursor:'pointer', userSelect:'none' }}
            >
              Remember my email
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width:'100%', padding:'14px', borderRadius:'10px', border:'none',
              background: loading ? 'rgba(0,212,170,0.15)' : 'linear-gradient(135deg, #00d4aa 0%, #00b894 100%)',
              color: loading ? '#00d4aa' : '#000',
              fontSize:'14px', fontWeight:'700', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 30px rgba(0,212,170,0.4)',
              transition:'all 0.2s', letterSpacing:'0.02em'
            }}
            onMouseEnter={e => { if (!loading) { e.target.style.transform='translateY(-2px)'; e.target.style.boxShadow='0 8px 40px rgba(0,212,170,0.5)' } }}
            onMouseLeave={e => { e.target.style.transform='translateY(0)'; e.target.style.boxShadow=loading?'none':'0 4px 30px rgba(0,212,170,0.4)' }}
          >
            {loading ? '⏳ Signing in...' : 'Sign In →'}
          </button>
        </form>

        <p style={{ color:'#333', fontSize:'13px', textAlign:'center', marginTop:'24px' }}>
          No account?{' '}
          <Link to="/register" style={{ color:'#00d4aa', textDecoration:'none', fontWeight:'600' }}>Create one free</Link>
        </p>

        <div style={{
          marginTop:'28px', padding:'14px 18px',
          background:'rgba(0,212,170,0.04)',
          borderRadius:'10px', border:'1px solid rgba(0,212,170,0.12)',
          textAlign:'center', animation:'borderPulse 4s ease-in-out infinite'
        }}>
          <p style={{ color:'rgba(0,212,170,0.4)', fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'6px' }}>Demo Credentials</p>
          <p style={{ color:'rgba(0,212,170,0.7)', fontSize:'12px', fontFamily:'monospace' }}>admin@tradeforge.com / admin123</p>
        </div>
      </div>
    </div>
  )
}