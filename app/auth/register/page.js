'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const SETTORI_DISPONIBILI = [
  'Costruzioni', 'Informatica & Software', 'Consulenza', 'Manifatturiero',
  'Agricoltura', 'Turismo & Hospitality', 'Energia & Ambiente', 'Sanità',
  'Formazione & Ricerca', 'Commercio', 'Trasporti & Logistica', 'Agroalimentare',
  'Design & Comunicazione', 'Immobiliare', 'Finanza & Assicurazioni'
]

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: account, 2: azienda, 3: documenti
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pivaLoading, setPivaLoading] = useState(false)

  // Account
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Azienda
  const [piva, setPiva] = useState('')
  const [ragioneSociale, setRagioneSociale] = useState('')
  const [ateco, setAteco] = useState('')
  const [pec, setPec] = useState('')
  const [regione, setRegione] = useState('')
  const [settori, setSettori] = useState([])
  const [pivaVerificata, setPivaVerificata] = useState(false)

  // Documenti
  const [documenti, setDocumenti] = useState([])
  const [dragOver, setDragOver] = useState(false)

  const toggleSettore = (s) => {
    if (settori.includes(s)) setSettori(settori.filter(x => x !== s))
    else if (settori.length < 5) setSettori([...settori, s])
  }

  const lookupPiva = async () => {
    if (piva.length < 11) return
    setPivaLoading(true)
    setError('')
    try {
      const res = await fetch(`https://api.openapi.com/v1/vat/it/${piva}`, {
        headers: { 'Accept': 'application/json' }
      })
      if (res.ok) {
        const data = await res.json()
        setRagioneSociale(data.name || '')
        setAteco(data.ateco || '')
        setPec(data.pec || '')
        setPivaVerificata(true)
      }
    } catch (e) {}
    setPivaLoading(false)
  }

  const handleDocumentDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer?.files || e.target?.files || [])
    setDocumenti(prev => [...prev, ...files].slice(0, 5))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      // 1. Crea account Supabase
      const { data, error: signUpErr } = await supabase.auth.signUp({ email, password })
      if (signUpErr) throw new Error(signUpErr.message)
      if (data?.user?.identities?.length === 0) throw new Error('Email già registrata. Prova ad accedere.')

      const userId = data.user.id

      // 2. Crea company nel DB
      const { error: companyErr } = await supabase.from('companies').insert({
        user_id: userId,
        ragione_sociale: ragioneSociale,
        piva,
        ateco,
        pec,
        regione,
        settori: settori.join(', '),
        status: 'pending'
      })
      if (companyErr) console.error('Company insert error:', companyErr)

      // 3. Vai alla dashboard
      router.push('/dashboard')
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    color: '#F4F4F5',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#A1A1AA',
    marginBottom: '6px',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#32323C',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ width: '40px', height: '40px', background: '#2563EB', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: '20px', fontWeight: '800' }}>A</span>
            </div>
            <span style={{ fontSize: '20px', fontWeight: '700', color: '#F4F4F5' }}>Augiva</span>
          </Link>
        </div>

        {/* Progress steps */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
          {['Account', 'Azienda', 'Documenti'].map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                opacity: step > i + 1 ? 1 : step === i + 1 ? 1 : 0.4
              }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: step > i + 1 ? '#34C759' : step === i + 1 ? '#3B82F6' : 'rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: '700', color: 'white'
                }}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: '13px', color: step === i + 1 ? '#F4F4F5' : '#71717A', fontWeight: step === i + 1 ? '600' : '400' }}>{label}</span>
              </div>
              {i < 2 && <div style={{ width: '32px', height: '1px', background: 'rgba(255,255,255,0.12)' }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: '#3A3A45',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.09)',
        }}>
          {error && (
            <div style={{
              background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.3)',
              borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
              color: '#FF3B30', fontSize: '14px',
            }}>{error}</div>
          )}

          {/* STEP 1 — Account */}
          {step === 1 && (
            <>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#F4F4F5', marginBottom: '6px' }}>Crea il tuo account</h1>
              <p style={{ fontSize: '15px', color: '#71717A', marginBottom: '28px' }}>Le opportunità arrivano a te — automaticamente.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Email aziendale</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@azienda.it" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimo 8 caratteri" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Conferma password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Ripeti la password" style={inputStyle} />
                </div>
              </div>

              <button
                onClick={() => {
                  if (!email || !password) return setError('Compila tutti i campi.')
                  if (password !== confirmPassword) return setError('Le password non corrispondono.')
                  if (password.length < 8) return setError('Password troppo corta (min 8 caratteri).')
                  setError('')
                  setStep(2)
                }}
                style={{
                  width: '100%', marginTop: '28px', padding: '14px',
                  background: '#3B82F6', border: 'none', borderRadius: '12px',
                  color: 'white', fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                }}
              >
                Continua →
              </button>

              <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#71717A' }}>
                Hai già un account?{' '}
                <Link href="/auth/login" style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: '600' }}>Accedi</Link>
              </p>
            </>
          )}

          {/* STEP 2 — Azienda */}
          {step === 2 && (
            <>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#F4F4F5', marginBottom: '6px' }}>La tua azienda</h1>
              <p style={{ fontSize: '15px', color: '#71717A', marginBottom: '28px' }}>Inserisci la P.IVA — compiliamo tutto automaticamente.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* P.IVA con auto-fill */}
                <div>
                  <label style={labelStyle}>Partita IVA</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text" value={piva} onChange={e => setPiva(e.target.value.replace(/\D/g, '').slice(0, 11))}
                      placeholder="12345678901" style={{ ...inputStyle, flex: 1 }}
                    />
                    <button
                      onClick={lookupPiva} disabled={pivaLoading || piva.length < 11}
                      style={{
                        padding: '12px 16px', background: piva.length >= 11 ? '#3B82F6' : 'rgba(255,255,255,0.08)',
                        border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px',
                        fontWeight: '600', cursor: piva.length >= 11 ? 'pointer' : 'default', whiteSpace: 'nowrap',
                      }}
                    >
                      {pivaLoading ? '...' : pivaVerificata ? '✓ Verificata' : 'Verifica'}
                    </button>
                  </div>
                  {pivaVerificata && <p style={{ fontSize: '12px', color: '#34C759', marginTop: '4px' }}>✓ Dati recuperati automaticamente</p>}
                </div>

                <div>
                  <label style={labelStyle}>Ragione sociale</label>
                  <input type="text" value={ragioneSociale} onChange={e => setRagioneSociale(e.target.value)} placeholder="Mario Rossi Srl" style={inputStyle} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Codice ATECO</label>
                    <input type="text" value={ateco} onChange={e => setAteco(e.target.value)} placeholder="41.20" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Regione</label>
                    <input type="text" value={regione} onChange={e => setRegione(e.target.value)} placeholder="Lombardia" style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>PEC</label>
                  <input type="email" value={pec} onChange={e => setPec(e.target.value)} placeholder="azienda@pec.it" style={inputStyle} />
                </div>

                {/* Settori */}
                <div>
                  <label style={labelStyle}>Settori di attività <span style={{ color: '#71717A', fontWeight: '400' }}>(max 5)</span></label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                    {SETTORI_DISPONIBILI.map(s => (
                      <button
                        key={s} onClick={() => toggleSettore(s)}
                        style={{
                          padding: '6px 12px', borderRadius: '20px', border: 'none',
                          background: settori.includes(s) ? '#3B82F6' : 'rgba(255,255,255,0.08)',
                          color: settori.includes(s) ? 'white' : '#A1A1AA',
                          fontSize: '13px', fontWeight: settori.includes(s) ? '600' : '400',
                          cursor: 'pointer',
                        }}
                      >{s}</button>
                    ))}
                  </div>
                  {settori.length > 0 && <p style={{ fontSize: '12px', color: '#3B82F6', marginTop: '6px' }}>{settori.length}/5 selezionati</p>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
                <button onClick={() => setStep(1)} style={{
                  flex: '0 0 auto', padding: '14px 20px', background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
                  color: '#A1A1AA', fontSize: '15px', cursor: 'pointer',
                }}>← Indietro</button>
                <button
                  onClick={() => {
                    if (!piva || !ragioneSociale) return setError('P.IVA e ragione sociale sono obbligatori.')
                    setError('')
                    setStep(3)
                  }}
                  style={{
                    flex: 1, padding: '14px', background: '#3B82F6', border: 'none',
                    borderRadius: '12px', color: 'white', fontSize: '16px', fontWeight: '700', cursor: 'pointer',
                  }}
                >Continua →</button>
              </div>
            </>
          )}

          {/* STEP 3 — Documenti */}
          {step === 3 && (
            <>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#F4F4F5', marginBottom: '6px' }}>Documenti aziendali</h1>
              <p style={{ fontSize: '15px', color: '#71717A', marginBottom: '28px' }}>
                Opzionale ma consigliato — migliora la qualità del matching e velocizza la pre-compilazione.
              </p>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDocumentDrop}
                style={{
                  border: `2px dashed ${dragOver ? '#3B82F6' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: '16px', padding: '40px 24px', textAlign: 'center',
                  background: dragOver ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
                  transition: 'all 0.2s', cursor: 'pointer', marginBottom: '16px',
                }}
                onClick={() => document.getElementById('file-input').click()}
              >
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📎</div>
                <p style={{ color: '#F4F4F5', fontWeight: '600', marginBottom: '6px' }}>Trascina i documenti qui</p>
                <p style={{ color: '#71717A', fontSize: '14px' }}>Visura camerale, statuto, bilanci, certificazioni</p>
                <p style={{ color: '#3B82F6', fontSize: '13px', marginTop: '12px', fontWeight: '600' }}>o clicca per selezionare</p>
                <input id="file-input" type="file" multiple accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleDocumentDrop} />
              </div>

              {documenti.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {documenti.map((f, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '10px 14px',
                    }}>
                      <span style={{ fontSize: '18px' }}>📄</span>
                      <span style={{ flex: 1, fontSize: '14px', color: '#F4F4F5' }}>{f.name}</span>
                      <button onClick={() => setDocumenti(documenti.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button onClick={() => setStep(2)} style={{
                  flex: '0 0 auto', padding: '14px 20px', background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px',
                  color: '#A1A1AA', fontSize: '15px', cursor: 'pointer',
                }}>← Indietro</button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    flex: 1, padding: '14px', background: loading ? 'rgba(59,130,246,0.5)' : '#3B82F6',
                    border: 'none', borderRadius: '12px', color: 'white',
                    fontSize: '16px', fontWeight: '700', cursor: loading ? 'default' : 'pointer',
                  }}
                >
                  {loading ? 'Creazione account...' : 'Inizia la prova →'}
                </button>
              </div>

              <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#71717A' }}>
                Puoi saltare questo passaggio e aggiungere documenti dopo dalla dashboard
              </p>
              <p style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: '#71717A' }}>
                Nessun addebito per 30 giorni. Disdici prima e non paghi nulla.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
