import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import AnimatedBackground from '../components/AnimatedBackground'

export default function Register() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await authAPI.register(email, username, password)
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.')
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

        <h2 style={{ color:'#fff', fontSize:'20px', fontWeight:'600', marginBottom:'4px' }}>Create account</h2>
        <p style={{ color:'#444', fontSize:'13px', marginBottom:'28px' }}>Start trading with AI signals for free</p>

        {error && (
          <div style={{ background:'rgba(255,80,80,0.08)', border:'1px solid rgba(255,80,80,0.2)', borderRadius:'10px', padding:'12px 14px', marginBottom:'20px', color:'#ff6b6b', fontSize:'13px' }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {[
            { lbl:'Email', type:'email', val:email, set:setEmail, ph:'you@email.com' },
            { lbl:'Username', type:'text', val:username, set:setUsername, ph:'username' },
            { lbl:'Password', type:'password', val:password, set:setPassword, ph:'••••••••' }
          ].map(({ lbl, type, val, set, ph }) => (
            <div key={lbl} style={{ marginBottom:'16px' }}>
              <label style={{ color:'#444', fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:'7px' }}>{lbl}</label>
              <input type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)} required
                style={{ width:'100%', padding:'12px 14px', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.03)', color:'#fff', fontSize:'14px', outline:'none', transition:'all 0.2s' }}
                onFocus={e => Object.assign(e.target.style, { borderColor:'rgba(0,212,170,0.5)', boxShadow:'0 0 0 3px rgba(0,212,170,0.08)' })}
                onBlur={e => Object.assign(e.target.style, { borderColor:'rgba(255,255,255,0.07)', boxShadow:'none' })}
              />
            </div>
          ))}
          <button type="submit" disabled={loading}
            style={{
              width:'100%', padding:'14px', borderRadius:'10px', border:'none',
              background: loading ? 'rgba(0,212,170,0.15)' : 'linear-gradient(135deg, #00d4aa, #00b894)',
              color: loading ? '#00d4aa' : '#000',
              fontSize:'14px', fontWeight:'700', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 30px rgba(0,212,170,0.4)',
              transition:'all 0.2s', marginTop:'8px'
            }}>
            {loading ? '⏳ Creating...' : 'Create Account →'}
          </button>
        </form>

        <p style={{ color:'#333', fontSize:'13px', textAlign:'center', marginTop:'24px' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'#00d4aa', textDecoration:'none', fontWeight:'600' }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}