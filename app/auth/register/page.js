'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const REGIONI = [
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna',
  'Friuli-Venezia Giulia','Lazio','Liguria','Lombardia','Marche',
  'Molise','Piemonte','Puglia','Sardegna','Sicilia','Toscana',
  'Trentino-Alto Adige','Umbria','Valle d\'Aosta','Veneto'
]

const SETTORI = [
  'costruzioni','IT','sanità','manifattura','commercio',
  'agricoltura','turismo','energia','trasporti','formazione'
]

export default function RegisterPage() {
  // Account
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Azienda
  const [piva, setPiva] = useState('')
  const [pivaLookupLoading, setPivaLookupLoading] = useState(false)
  const [pivaLookupDone, setPivaLookupDone] = useState(false)
  const [pivaError, setPivaError] = useState('')
  const [ragioneSociale, setRagioneSociale] = useState('')
  const [formaGiuridica, setFormaGiuridica] = useState('')
  const [ateco, setAteco] = useState('')
  const [atecoDesc, setAtecoDesc] = useState('')
  const [pec, setPec] = useState('')
  const [regione, setRegione] = useState('')

  // Settori
  const [settoriSelezionati, setSettoriSelezionati] = useState([])

  // Documenti
  const [files, setFiles] = useState([])
  const fileInputRef = useRef(null)

  // UI
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  const lookupPiva = async () => {
    if (!piva || piva.length < 11) { setPivaError('Inserisci una P.IVA valida (11 cifre)'); return }
    setPivaError('')
    setPivaLookupLoading(true)
    try {
      const resp = await fetch(`https://api.openapi.com/eco/v1/fiscal-code/${piva}?apikey=test_live`)
      const data = await resp.json()
      if (data && (data.denominazione || data.name)) {
        setRagioneSociale(data.denominazione || data.name || '')
        setFormaGiuridica(data.forma_giuridica || data.legal_form || '')
        setAteco(data.ateco || data.ateco_code || '')
        setAtecoDesc(data.ateco_desc || data.ateco_description || '')
        setPec(data.pec || '')
        setPivaLookupDone(true)
        setPivaError('')
      } else {
        setPivaError('Azienda non trovata — inserisci i dati manualmente')
        setPivaLookupDone(true)
      }
    } catch {
      setPivaError('Errore nella ricerca — inserisci i dati manualmente')
      setPivaLookupDone(true)
    } finally {
      setPivaLookupLoading(false)
    }
  }

  const toggleSettore = (s) => {
    setSettoriSelezionati(prev => {
      if (prev.includes(s)) return prev.filter(x => x !== s)
      if (prev.length >= 5) return prev
      return [...prev, s]
    })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
      f.type === 'application/pdf' || f.name.endsWith('.doc') || f.name.endsWith('.docx')
    )
    setFiles(prev => [...prev, ...dropped].slice(0, 5))
  }

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files)
    setFiles(prev => [...prev, ...selected].slice(0, 5))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) { setError('Le password non corrispondono.'); return }
    if (password.length < 8) { setError('Password di almeno 8 caratteri.'); return }
    if (!piva) { setError('Inserisci la P.IVA.'); return }

    setLoading(true)

    // Salva dati azienda in localStorage (verranno scritti nel DB dopo conferma email)
    const companyData = {
      piva, ragione_sociale: ragioneSociale, forma_giuridica: formaGiuridica,
      ateco, ateco_desc: atecoDesc, pec, regione,
      settori: settoriSelezionati, status: 'pending'
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('augiva_company_draft', JSON.stringify(companyData))
    }

    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://app.augiva.com/auth/callback'
      }
    })

    setLoading(false)
    if (err) { setError(err.message); return }
    setEmailSent(true)
  }

  if (emailSent) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ maxWidth: '480px', textAlign: 'center' }}>
          <div className="auth-logo" style={{ justifyContent: 'center', marginBottom: 24 }}>
            <div className="auth-logo-mark">A</div>
            <span className="auth-logo-text">Augiva</span>
          </div>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📬</div>
          <h1 className="auth-title" style={{ textAlign: 'center' }}>Controlla la tua email</h1>
          <p className="auth-subtitle" style={{ textAlign: 'center', marginBottom: 0 }}>
            Ti abbiamo inviato un link di conferma a{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
            <br /><br />
            Clicca il link nell&apos;email per attivare il tuo account e accedere alla dashboard.
          </p>
          <div className="auth-footer" style={{ marginTop: 32 }}>
            Email non arrivata? Controlla lo spam.<br />
            <Link href="/auth/login" style={{ marginTop: 8, display: 'inline-block' }}>Torna al login</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container" style={{ alignItems: 'flex-start', paddingTop: 40, paddingBottom: 40 }}>
      <div className="auth-card" style={{ maxWidth: '580px' }}>
        <div className="auth-logo">
          <div className="auth-logo-mark">A</div>
          <span className="auth-logo-text">Augiva</span>
        </div>
        <h1 className="auth-title">Crea il tuo account</h1>
        <p className="auth-subtitle">Inizia la prova gratuita — 15 giorni senza addebiti</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* ── SEZIONE ACCOUNT ── */}
          <div className="section-divider">
            <span>Account</span>
          </div>

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

          {/* ── SEZIONE AZIENDA ── */}
          <div className="section-divider">
            <span>Dati azienda</span>
          </div>

          <div className="form-group">
            <label className="form-label">Partita IVA</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text" className="form-input" placeholder="12345678901"
                value={piva} onChange={e => setPiva(e.target.value.replace(/\D/g,'').slice(0,11))}
                style={{ flex: 1 }} required
              />
              <button
                type="button"
                onClick={lookupPiva}
                disabled={pivaLookupLoading || piva.length < 11}
                style={{
                  padding: '12px 16px', background: 'var(--bg-input)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-btn)',
                  color: 'var(--text-primary)', cursor: 'pointer', whiteSpace: 'nowrap',
                  fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
                  opacity: piva.length < 11 ? 0.5 : 1, transition: 'all 0.2s',
                }}
              >
                {pivaLookupLoading ? '⏳' : '🔍 Cerca azienda'}
              </button>
            </div>
            {pivaError && (
              <p style={{ fontSize: 13, color: 'var(--orange)', marginTop: 6 }}>{pivaError}</p>
            )}
          </div>

          {(pivaLookupDone || pivaError) && (
            <>
              <div className="form-group">
                <label className="form-label">Ragione sociale</label>
                <input type="text" className="form-input" placeholder="Nome azienda S.r.l."
                  value={ragioneSociale} onChange={e => setRagioneSociale(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Forma giuridica</label>
                <input type="text" className="form-input" placeholder="es. S.r.l., S.p.A., Ditta individuale"
                  value={formaGiuridica} onChange={e => setFormaGiuridica(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Codice ATECO</label>
                  <input type="text" className="form-input" placeholder="es. 62.01"
                    value={ateco} onChange={e => setAteco(e.target.value)} />
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Descrizione ATECO</label>
                  <input type="text" className="form-input" placeholder="Attività principale"
                    value={atecoDesc} onChange={e => setAtecoDesc(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">PEC</label>
                <input type="email" className="form-input" placeholder="pec@azienda.legalmail.it"
                  value={pec} onChange={e => setPec(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Regione</label>
                <select className="form-input" value={regione} onChange={e => setRegione(e.target.value)}>
                  <option value="">Seleziona regione...</option>
                  {REGIONI.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </>
          )}

          {/* ── SEZIONE SETTORI ── */}
          <div className="section-divider">
            <span>Settori di attività</span>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Seleziona fino a 5 settori in cui opera la tua azienda
          </p>
          <div className="tag-selector">
            {SETTORI.map(s => (
              <button
                key={s} type="button"
                className={`tag${settoriSelezionati.includes(s) ? ' tag-selected' : ''}`}
                onClick={() => toggleSettore(s)}
              >
                {s}
              </button>
            ))}
          </div>

          {/* ── SEZIONE DOCUMENTI ── */}
          <div className="section-divider">
            <span>Documenti</span>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            <span style={{ color: 'var(--yellow)', fontWeight: 500 }}>Facoltativo</span> — puoi aggiungerli dopo
          </p>
          <div
            className="upload-area"
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📎</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Trascina qui visura camerale, bilancio o altri documenti
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 4 }}>
              PDF o DOC — max 5 file
            </p>
            {files.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {files.map((f, i) => (
                  <span key={i} style={{
                    background: 'var(--bg-input)', padding: '4px 10px', borderRadius: 8,
                    fontSize: 12, color: 'var(--text-primary)',
                  }}>
                    {f.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <input
            ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx"
            style={{ display: 'none' }} onChange={handleFileChange}
          />

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 24 }}>
            {loading ? 'Creazione account...' : 'Crea account e analizza la mia azienda →'}
          </button>
        </form>

        <div className="auth-footer">
          Hai già un account? <Link href="/auth/login">Accedi</Link>
        </div>
      </div>
    </div>
  )
}
