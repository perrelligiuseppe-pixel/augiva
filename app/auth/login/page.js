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

    if (err) {
      setError('Email o password non corretti. Riprova.')
      return
    }

    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F5F5F7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ width: '40px', height: '40px', background: '#2563EB', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: '20px', fontWeight: '800' }}>A</span>
            </div>
            <span style={{ fontSize: '20px', fontWeight: '700', color: '#1D1D1F' }}>Augiva</span>
          </Link>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.04)',
        }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#1D1D1F', marginBottom: '8px' }}>
            Bentornato
          </h1>
          <p style={{ fontSize: '15px', color: '#6E6E73', marginBottom: '32px' }}>
            Accedi per vedere le tue opportunità
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1D1D1F', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="tu@azienda.it"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1D1D1F', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="La tua password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{
                background: '#FFF3EE',
                border: '1px solid #FF6B35',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '14px',
                color: '#D4380D',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? '#93B5FB' : '#2563EB',
                color: 'white',
                fontSize: '16px',
                fontWeight: '700',
                border: 'none',
                borderRadius: '12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '4px',
              }}
            >
              {loading ? 'Accesso in corso...' : 'Accedi →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#6E6E73' }}>
          Non hai un account?{' '}
          <Link href="/auth/register" style={{ color: '#2563EB', fontWeight: '600', textDecoration: 'none' }}>
            Registrati gratis
          </Link>
        </p>
      </div>
    </div>
  )
}
