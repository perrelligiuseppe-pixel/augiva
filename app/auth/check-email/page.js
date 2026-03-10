'use client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function CheckEmailContent() {
  const params = useSearchParams()
  const email = params.get('email') || 'la tua email'

  return (
    <div style={{ minHeight: '100vh', background: '#32323C', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '420px', width: '100%', background: '#3A3A45', borderRadius: '20px', padding: '48px 36px', textAlign: 'center', boxShadow: '0 40px 80px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.09)' }}>
        
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '32px' }}>
          <div style={{ width: '38px', height: '38px', background: '#059669', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="19" viewBox="0 0 26 30" fill="none">
              <path d="M13 1 L25 29 H19.5 L13 12 L6.5 29 H1 L13 1Z" fill="white"/>
              <line x1="6" y1="21" x2="20" y2="21" stroke="#059669" strokeWidth="2.5"/>
            </svg>
          </div>
          <span style={{ fontSize: '18px', fontWeight: '700', color: '#F4F4F5' }}>Augiva</span>
        </div>

        {/* Icona email */}
        <div style={{ width: '64px', height: '64px', background: 'rgba(5,150,105,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#F4F4F5', marginBottom: '12px', letterSpacing: '-0.3px' }}>
          Controlla la tua email
        </h1>
        <p style={{ fontSize: '14px', color: '#A1A1AA', lineHeight: '1.6', marginBottom: '32px' }}>
          Abbiamo inviato un link di conferma a <strong style={{ color: '#F4F4F5' }}>{email}</strong>.<br/>
          Clicca il link per attivare il tuo account e accedere alla dashboard.
        </p>

        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '14px', marginBottom: '24px', fontSize: '13px', color: '#71717A' }}>
          Non trovi l&apos;email? Controlla la cartella spam o promo.
        </div>

        <Link href="/auth/login" style={{ display: 'block', textAlign: 'center', color: '#A1A1AA', fontSize: '14px', textDecoration: 'none' }}>
          ← Torna al login
        </Link>
      </div>
    </div>
  )
}

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailContent />
    </Suspense>
  )
}
