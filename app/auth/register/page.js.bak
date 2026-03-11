'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const SETTORI = [
  'Costruzioni', 'Informatica & Software', 'Consulenza', 'Manifatturiero',
  'Agricoltura', 'Turismo & Hospitality', 'Energia & Ambiente', 'Sanità',
  'Formazione & Ricerca', 'Commercio', 'Trasporti & Logistica', 'Agroalimentare',
  'Design & Comunicazione', 'Immobiliare', 'Finanza & Assicurazioni'
]

const REGIONI = [
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna','Friuli-Venezia Giulia',
  'Lazio','Liguria','Lombardia','Marche','Molise','Piemonte','Puglia','Sardegna',
  'Sicilia','Toscana','Trentino-Alto Adige','Umbria','Valle d\'Aosta','Veneto'
]

const CAPACITA = [
  { label: 'Fino a €50.000', value: '50k' },
  { label: '€50.000 – €250.000', value: '250k' },
  { label: '€250.000 – €1.000.000', value: '1m' },
  { label: 'Oltre €1.000.000', value: '1m+' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [pivaLoading, setPivaLoading] = useState(false)
  const [pivaOk, setPivaOk] = useState(false)
  const [error, setError] = useState('')
  const [documenti, setDocumenti] = useState([])
  const [dragOver, setDragOver] = useState(false)

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    piva: '', ragioneSociale: '', ateco: '', pec: '', regione: '',
    settori: [], zoneOperative: [], capacita: '', note: ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleArr = (k, v) => setForm(f => {
    const arr = f[k]
    return { ...f, [k]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] }
  })

  const lookupPiva = async () => {
    if (form.piva.length < 11) return
    setPivaLoading(true)
    try {
      const res = await fetch(`https://api.openapi.com/v1/vat/it/${form.piva}`, {
        headers: { Accept: 'application/json' }
      })
      if (res.ok) {
        const d = await res.json()
        setForm(f => ({ ...f, ragioneSociale: d.name || f.ragioneSociale, ateco: d.ateco || f.ateco, pec: d.pec || f.pec }))
        setPivaOk(true)
      }
    } catch {}
    setPivaLoading(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer?.files || e.target?.files || [])
    setDocumenti(p => [...p, ...files].slice(0, 5))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) return setError('Le password non corrispondono.')
    if (form.password.length < 8) return setError('Password troppo corta (min 8 caratteri).')
    if (!form.piva || !form.ragioneSociale) return setError('P.IVA e ragione sociale sono obbligatori.')
    setLoading(true)
    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({ email: form.email, password: form.password })
      if (signUpErr) throw new Error(signUpErr.message)
      if (data?.user?.identities?.length === 0) throw new Error('Email già registrata. Prova ad accedere.')
      await supabase.from('companies').insert({
        user_id: data.user.id,
        ragione_sociale: form.ragioneSociale,
        piva: form.piva, ateco: form.ateco, pec: form.pec, regione: form.regione,
        settori: form.settori.join(', '),
        zone_operative: form.zoneOperative.join(', '),
        capacita_finanziaria: form.capacita,
        status: 'pending'
      })
      router.push('/dashboard')
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const inp = {
    width: '100%', padding: '11px 14px',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px', color: '#F4F4F5', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  }
  const lbl = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#A1A1AA', marginBottom: '5px' }

  return (
    <div style={{ minHeight: '100vh', background: '#32323C', padding: '32px 16px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{ width: '38px', height: '38px', background: '#2563EB', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: '18px', fontWeight: '800' }}>A</span>
            </div>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#F4F4F5' }}>Augiva</span>
          </Link>
        </div>

        <div style={{ background: '#3A3A45', borderRadius: '20px', padding: '36px', boxShadow: '0 40px 80px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#F4F4F5', marginBottom: '4px' }}>Crea il tuo account</h1>
          <p style={{ fontSize: '14px', color: '#71717A', marginBottom: '28px' }}>Le opportunità arrivano a te ogni settimana, automaticamente.</p>

          {error && (
            <div style={{ background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', color: '#FF3B30', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* ── SEZIONE 1: Account ── */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Account</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={lbl}>Email aziendale</label>
                  <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} placeholder="nome@azienda.it" style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={lbl}>Password</label>
                    <input type="password" required value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 8 caratteri" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Conferma password</label>
                    <input type="password" required value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="Ripeti" style={inp} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />

            {/* ── SEZIONE 2: P.IVA + Profilo azienda ── */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Inserisci la P.IVA</div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <input
                  type="text" value={form.piva}
                  onChange={e => { set('piva', e.target.value.replace(/\D/g,'').slice(0,11)); setPivaOk(false) }}
                  placeholder="12345678901" style={{ ...inp, flex: 1 }}
                />
                <button type="button" onClick={lookupPiva} disabled={pivaLoading || form.piva.length < 11}
                  style={{ padding: '11px 16px', background: form.piva.length >= 11 ? '#3B82F6' : 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: '600', cursor: form.piva.length >= 11 ? 'pointer' : 'default', whiteSpace: 'nowrap' }}>
                  {pivaLoading ? '...' : pivaOk ? '✓ Verificata' : 'Verifica →'}
                </button>
              </div>
              {pivaOk && <p style={{ fontSize: '12px', color: '#34C759', marginBottom: '12px' }}>✓ Dati azienda compilati automaticamente</p>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={lbl}>Ragione sociale</label>
                  <input type="text" required value={form.ragioneSociale} onChange={e => set('ragioneSociale', e.target.value)} placeholder="Mario Rossi Srl" style={inp} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={lbl}>Codice ATECO</label>
                    <input type="text" value={form.ateco} onChange={e => set('ateco', e.target.value)} placeholder="41.20" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>PEC</label>
                    <input type="email" value={form.pec} onChange={e => set('pec', e.target.value)} placeholder="azienda@pec.it" style={inp} />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />

            {/* ── SEZIONE 3: Zone operative + Settori ── */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Conferma profilo e zone operative</div>
              <div style={{ marginBottom: '14px' }}>
                <label style={lbl}>Settori di attività <span style={{ color: '#71717A', fontWeight: '400' }}>(max 5)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {SETTORI.map(s => (
                    <button key={s} type="button" onClick={() => toggleArr('settori', s)}
                      style={{ padding: '5px 11px', borderRadius: '20px', border: 'none', background: form.settori.includes(s) ? '#3B82F6' : 'rgba(255,255,255,0.08)', color: form.settori.includes(s) ? 'white' : '#A1A1AA', fontSize: '12px', fontWeight: form.settori.includes(s) ? '600' : '400', cursor: 'pointer' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Zone operative <span style={{ color: '#71717A', fontWeight: '400' }}>(regioni in cui operi)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {REGIONI.map(r => (
                    <button key={r} type="button" onClick={() => toggleArr('zoneOperative', r)}
                      style={{ padding: '5px 11px', borderRadius: '20px', border: 'none', background: form.zoneOperative.includes(r) ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.06)', color: form.zoneOperative.includes(r) ? '#93C5FD' : '#71717A', fontSize: '12px', fontWeight: form.zoneOperative.includes(r) ? '600' : '400', cursor: 'pointer', border: form.zoneOperative.includes(r) ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent' }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />

            {/* ── SEZIONE 4: Documenti ── */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Carica documenti aziendali <span style={{ color: '#71717A', fontWeight: '400', textTransform: 'none', letterSpacing: '0' }}>(opzionale)</span></div>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input').click()}
                style={{ border: `2px dashed ${dragOver ? '#3B82F6' : 'rgba(255,255,255,0.15)'}`, borderRadius: '12px', padding: '28px 20px', textAlign: 'center', background: dragOver ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all .2s' }}>
                <p style={{ color: '#F4F4F5', fontWeight: '600', marginBottom: '4px', fontSize: '14px' }}>📎 Trascina i file qui o clicca per sfogliare</p>
                <p style={{ color: '#71717A', fontSize: '12px' }}>Visura camerale, statuto, bilanci, certificazioni — PDF, DOC · Max 20MB</p>
                <input id="file-input" type="file" multiple accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleDrop} />
              </div>
              {documenti.length > 0 && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {documenti.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px 12px' }}>
                      <span style={{ fontSize: '16px' }}>📄</span>
                      <span style={{ flex: 1, fontSize: '13px', color: '#F4F4F5' }}>{f.name}</span>
                      <button type="button" onClick={() => setDocumenti(documenti.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)' }} />

            {/* ── SEZIONE 5: Capacità finanziaria ── */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Capacità finanziaria per appalti</div>
              <p style={{ fontSize: '12px', color: '#71717A', marginBottom: '12px' }}>Ci permette di filtrare solo appalti compatibili con la tua dimensione aziendale.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {CAPACITA.map(c => (
                  <button key={c.value} type="button" onClick={() => set('capacita', c.value)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', background: form.capacita === c.value ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${form.capacita === c.value ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', padding: '12px 16px', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${form.capacita === c.value ? '#3B82F6' : 'rgba(255,255,255,0.2)'}`, background: form.capacita === c.value ? '#3B82F6' : 'transparent', flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', fontWeight: form.capacita === c.value ? '600' : '400', color: form.capacita === c.value ? '#F4F4F5' : '#A1A1AA' }}>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '15px', background: loading ? 'rgba(59,130,246,0.5)' : '#3B82F6', border: 'none', borderRadius: '12px', color: 'white', fontSize: '16px', fontWeight: '700', cursor: loading ? 'default' : 'pointer', marginTop: '4px' }}>
              {loading ? 'Creazione account...' : 'Inizia la prova →'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '12px', color: '#71717A', marginTop: '-8px' }}>
              Nessun addebito per 15 giorni. Disdici prima e non paghi nulla.
            </p>
            <p style={{ textAlign: 'center', fontSize: '14px', color: '#71717A' }}>
              Hai già un account?{' '}
              <Link href="/auth/login" style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: '600' }}>Accedi</Link>
            </p>

          </form>
        </div>
      </div>
    </div>
  )
}
