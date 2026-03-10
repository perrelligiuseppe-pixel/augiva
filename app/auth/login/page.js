'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError('Email o password non corretti.'); return }
    router.push('/dashboard')
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <div style={{ width: '38px', height: '38px', background: '#059669', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="19" viewBox="0 0 26 30" fill="none">
              <path d="M13 1 L25 29 H19.5 L13 12 L6.5 29 H1 L13 1Z" fill="white"/>
              <line x1="6" y1="21" x2="20" y2="21" stroke="#059669" strokeWidth="2.5"/>
            </svg>
          </div>
          <span className="auth-logo-text">Augiva</span>
        </div>
        <h1 className="auth-title">Bentornato</h1>
        <p className="auth-subtitle">Accedi al tuo account Augiva</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" placeholder="nome@azienda.it"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="La tua password"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Accesso in corso...' : 'Accedi →'}
          </button>
        </form>

        <div className="auth-footer">
          Non hai un account? <Link href="/auth/register">Registrati</Link>
        </div>
      </div>
    </div>
  )
}
