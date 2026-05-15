import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(email, username, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>TradeForge</h1>
        <p style={styles.subtitle}>Create your free account</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input style={styles.input} type="email" placeholder="Email"
            value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={styles.input} type="text" placeholder="Username"
            value={username} onChange={e => setUsername(e.target.value)} required />
          <input style={styles.input} type="password" placeholder="Password"
            value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p style={styles.link}>
          Already have an account?{' '}
          <Link to="/login" style={styles.linkText}>Login here</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center', background: '#0f0f0f'
  },
  card: {
    background: '#1a1a1a', padding: '40px', borderRadius: '12px',
    width: '100%', maxWidth: '400px', border: '1px solid #2a2a2a'
  },
  logo: { color: '#00d4aa', fontSize: '28px', fontWeight: 'bold', textAlign: 'center', margin: '0 0 8px' },
  subtitle: { color: '#888', textAlign: 'center', fontSize: '14px', marginBottom: '32px' },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  input: {
    padding: '12px 16px', borderRadius: '8px', border: '1px solid #333',
    background: '#242424', color: '#fff', fontSize: '14px', outline: 'none'
  },
  button: {
    padding: '12px', borderRadius: '8px', border: 'none',
    background: '#00d4aa', color: '#000', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer'
  },
  error: { color: '#ff4444', fontSize: '13px', textAlign: 'center' },
  link: { color: '#888', textAlign: 'center', marginTop: '20px', fontSize: '14px' },
  linkText: { color: '#00d4aa', textDecoration: 'none' }
}