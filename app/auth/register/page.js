'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('Le password non corrispondono.'); return }
    if (password.length < 8) { setError('Password di almeno 8 caratteri.'); return }
    setLoading(true)
    const { data, error: err } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    if (data?.user?.identities?.length === 0) { setSuccess(true); return }
    router.push('/onboarding')
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">A</div>
          <span className="auth-logo-text">Augiva</span>
        </div>
        <h1 className="auth-title">Crea il tuo account</h1>
        <p className="auth-subtitle">Inizia la prova gratuita — 15 giorni senza addebiti</p>

        {error && <div className="auth-error">{error}</div>}
        {success && (
          <div className="auth-success">
            Controlla la tua email per confermare la registrazione.
          </div>
        )}

        {!success && (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" placeholder="nome@azienda.it"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" placeholder="Minimo 8 caratteri"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Conferma password</label>
              <input type="password" className="form-input" placeholder="Ripeti la password"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creazione account...' : 'Crea account →'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Hai già un account? <Link href="/auth/login">Accedi</Link>
        </div>
      </div>
    </div>
  )
}
