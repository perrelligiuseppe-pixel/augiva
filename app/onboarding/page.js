'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const SETTORI_OPTIONS = [
  'Edilizia', 'Informatica', 'Sanità', 'Formazione', 'Energia',
  'Agricoltura', 'Manifatturiero', 'Trasporti', 'Commercio', 'Consulenza',
  'Turismo', 'Ambiente', 'Sicurezza', 'Telecomunicazioni', 'Automotive',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [piva, setPiva] = useState('')
  const [pivaError, setPivaError] = useState('')
  const [searching, setSearching] = useState(false)
  const [companyData, setCompanyData] = useState(null)
  const [ragioneSociale, setRagioneSociale] = useState('')
  const [ateco, setAteco] = useState('')
  const [atecoDesc, setAtecoDesc] = useState('')
  const [formaGiuridica, setFormaGiuridica] = useState('')
  const [pec, setPec] = useState('')
  const [regione, setRegione] = useState('')
  const [settori, setSettori] = useState([])
  const [saving, setSaving] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/auth/login')
    })
  }, [router])

  const validatePiva = (value) => {
    const cleaned = value.replace(/\s/g, '')
    if (!/^\d{11}$/.test(cleaned)) return 'La P.IVA deve essere di 11 cifre numeriche'
    return ''
  }

  const handleSearchPiva = async () => {
    const err = validatePiva(piva)
    if (err) { setPivaError(err); return }
    setPivaError('')
    setSearching(true)
    setCompanyData(null)

    try {
      const res = await fetch(`https://api.openapi.com/eco/v1/fiscal-code/${piva.trim()}?apikey=test_live`)
      if (res.ok) {
        const data = await res.json()
        const company = data?.data || data
        setRagioneSociale(company?.ragione_sociale || company?.name || '')
        setAteco(company?.ateco || company?.ateco_code || '')
        setAtecoDesc(company?.ateco_desc || company?.ateco_description || '')
        setFormaGiuridica(company?.forma_giuridica || company?.legal_form || '')
        setPec(company?.pec || '')
        setRegione(company?.regione || company?.region || '')
        setCompanyData(company)
      } else {
        // Fallback: show empty fields for manual entry
        setCompanyData({})
        setRagioneSociale('')
      }
    } catch (e) {
      setCompanyData({})
    }
    setSearching(false)
  }

  const toggleSettore = (s) => {
    setSettori(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const handleSubmit = async () => {
    if (!ragioneSociale.trim()) { alert('Inserisci la ragione sociale'); return }
    setSaving(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth/login'); return }

    const { error } = await supabase.from('companies').insert({
      user_id: session.user.id,
      piva: piva.trim(),
      ragione_sociale: ragioneSociale,
      ateco,
      ateco_desc: atecoDesc,
      forma_giuridica: formaGiuridica,
      pec,
      regione,
      settori,
      status: 'pending',
    })

    setSaving(false)
    if (error) {
      alert('Errore: ' + error.message)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7', padding: '40px 24px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '36px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '24px' }}>
            <div style={{ width: '36px', height: '36px', background: '#2563EB', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: '18px', fontWeight: '800' }}>A</span>
            </div>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#1D1D1F' }}>Augiva</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#2563EB', background: '#EEF4FF', padding: '3px 10px', borderRadius: '20px' }}>
              Passo 1 di 1
            </span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1D1D1F', marginBottom: '8px' }}>
            Configura il tuo profilo aziendale
          </h1>
          <p style={{ fontSize: '15px', color: '#6E6E73' }}>
            Inserisci la P.IVA — recuperiamo i dati automaticamente dal registro imprese.
          </p>
        </div>

        {/* P.IVA search */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1D1D1F', marginBottom: '8px' }}>
            Partita IVA
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="es. 12345678901"
              value={piva}
              onChange={e => { setPiva(e.target.value); setPivaError('') }}
              maxLength={11}
              style={{ flex: 1 }}
            />
            <button
              onClick={handleSearchPiva}
              disabled={searching || piva.length < 11}
              style={{
                padding: '13px 20px',
                background: searching || piva.length < 11 ? '#93B5FB' : '#2563EB',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '12px',
                cursor: searching || piva.length < 11 ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {searching ? 'Cerco...' : 'Cerca azienda'}
            </button>
          </div>
          {pivaError && (
            <p style={{ fontSize: '13px', color: '#FF6B35', marginTop: '6px' }}>{pivaError}</p>
          )}
        </div>

        {/* Company data form */}
        {companyData !== null && (
          <>
            <div style={{ background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
              {Object.keys(companyData).length > 0 && (
                <div style={{
                  background: '#E8F8ED',
                  border: '1px solid #34C759',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  color: '#1D7A3A',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  ✅ Dati recuperati automaticamente — puoi modificarli se necessario
                </div>
              )}

              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1D1D1F', marginBottom: '20px' }}>
                Dati aziendali
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1D1D1F', marginBottom: '6px' }}>
                    Ragione sociale *
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={ragioneSociale}
                    onChange={e => setRagioneSociale(e.target.value)}
                    placeholder="Es. Mario Rossi S.r.l."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1D1D1F', marginBottom: '6px' }}>
                      Codice ATECO
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={ateco}
                      onChange={e => setAteco(e.target.value)}
                      placeholder="es. 43.21.01"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1D1D1F', marginBottom: '6px' }}>
                      Forma giuridica
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={formaGiuridica}
                      onChange={e => setFormaGiuridica(e.target.value)}
                      placeholder="es. S.r.l."
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1D1D1F', marginBottom: '6px' }}>
                    Descrizione attività
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={atecoDesc}
                    onChange={e => setAtecoDesc(e.target.value)}
                    placeholder="es. Installazione impianti elettrici"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1D1D1F', marginBottom: '6px' }}>
                      PEC
                    </label>
                    <input
                      type="email"
                      className="input-field"
                      value={pec}
                      onChange={e => setPec(e.target.value)}
                      placeholder="pec@azienda.it"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1D1D1F', marginBottom: '6px' }}>
                      Regione
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      value={regione}
                      onChange={e => setRegione(e.target.value)}
                      placeholder="es. Lombardia"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Settori aggiuntivi */}
            <div style={{ background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 20px rgba(0,0,0,0.06)', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1D1D1F', marginBottom: '6px' }}>
                Settori di interesse aggiuntivi
              </h3>
              <p style={{ fontSize: '13px', color: '#6E6E73', marginBottom: '16px' }}>
                Seleziona altri ambiti in cui la tua azienda opera o vuole espandersi
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {SETTORI_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSettore(s)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: '500',
                      border: settori.includes(s) ? '2px solid #2563EB' : '1.5px solid rgba(0,0,0,0.1)',
                      background: settori.includes(s) ? '#EEF4FF' : 'white',
                      color: settori.includes(s) ? '#2563EB' : '#1D1D1F',
                      cursor: 'pointer',
                    }}
                  >
                    {settori.includes(s) ? '✓ ' : ''}{s}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving || !ragioneSociale.trim()}
              style={{
                width: '100%',
                padding: '16px',
                background: saving || !ragioneSociale.trim() ? '#93B5FB' : '#2563EB',
                color: 'white',
                fontSize: '16px',
                fontWeight: '700',
                border: 'none',
                borderRadius: '14px',
                cursor: saving || !ragioneSociale.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Salvataggio...' : 'Conferma e analizza →'}
            </button>
            <p style={{ textAlign: 'center', fontSize: '13px', color: '#6E6E73', marginTop: '12px' }}>
              L'analisi richiede circa 30 secondi
            </p>
          </>
        )}
      </div>
    </div>
  )
}
