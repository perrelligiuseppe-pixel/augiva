'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const REGIONI = [
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna',
  'Friuli-Venezia Giulia','Lazio','Liguria','Lombardia','Marche',
  'Molise','Piemonte','Puglia','Sardegna','Sicilia','Toscana',
  'Trentino-Alto Adige','Umbria',"Valle d'Aosta",'Veneto'
]

const TIPI_DOC = [
  'Visura camerale',
  'Autorizzazione trasporto merci',
  'Licenza comunitaria',
  'Certificato antimafia',
  'DURC (regolarità contributiva)',
  'Bilancio ultimo esercizio',
  'Altro documento',
]

export default function ProfiloPage() {
  const router = useRouter()
  const [company, setCompany] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [docs, setDocs] = useState([])
  const fileRef = useRef()
  const [docType, setDocType] = useState(TIPI_DOC[0])
  const [form, setForm] = useState({
    ragione_sociale: '',
    piva: '',
    ateco: '',
    ateco_desc: '',
    regione: '',
    regioni_operative: [],
    pec: '',
    forma_giuridica: '',
  })

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const { data } = await supabase.from('companies').select('*')
        .eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(1).single()
      if (data) {
        setCompany(data)
        setForm({
          ragione_sociale: data.ragione_sociale || '',
          piva: data.piva || '',
          ateco: data.ateco || '',
          ateco_desc: data.ateco_desc || '',
          regione: data.regione || '',
          regioni_operative: data.regioni_operative || [],
          pec: data.pec || '',
          forma_giuridica: data.forma_giuridica || '',
        })
        // Carica documenti
        const { data: files } = await supabase.storage
          .from('company-docs')
          .list(`${data.id}/`, { limit: 50, sortBy: { column: 'created_at', order: 'desc' } })
        if (files) setDocs(files.filter(f => f.name !== '.emptyFolderPlaceholder'))
      }
    }
    load()
  }, [router])

  const toggleRegione = (reg) => {
    setForm(f => {
      const ops = f.regioni_operative.includes(reg)
        ? f.regioni_operative.filter(r => r !== reg)
        : [...f.regioni_operative, reg]
      return { ...f, regioni_operative: ops }
    })
  }

  const handleSave = async () => {
    if (!company) return
    setSaving(true)
    const { error } = await supabase.from('companies').update({
      ragione_sociale: form.ragione_sociale,
      piva: form.piva,
      ateco: form.ateco,
      ateco_desc: form.ateco_desc,
      regione: form.regione,
      regioni_operative: form.regioni_operative,
      pec: form.pec,
      forma_giuridica: form.forma_giuridica,
    }).eq('id', company.id)
    setSaving(false)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !company) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${company.id}/${docType.replace(/\s+/g, '_')}_${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('company-docs').upload(path, file)
    if (!error) {
      const { data: files } = await supabase.storage
        .from('company-docs').list(`${company.id}/`, { limit: 50, sortBy: { column: 'created_at', order: 'desc' } })
      if (files) setDocs(files.filter(f => f.name !== '.emptyFolderPlaceholder'))
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (name) => {
    if (!company) return
    await supabase.storage.from('company-docs').remove([`${company.id}/${name}`])
    setDocs(d => d.filter(f => f.name !== name))
  }

  const inp = {
    width: '100%', background: '#40404C', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px', color: '#F4F4F5', fontSize: '15px', padding: '12px 14px',
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box'
  }
  const lbl = {
    display: 'block', fontSize: '12px', fontWeight: '600', color: '#A1A1AA',
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#32323C', fontFamily: 'Inter, sans-serif', color: '#F4F4F5' }}>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(50,50,60,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 32px', height: '60px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, background: '#059669', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="17" viewBox="0 0 26 30" fill="none">
              <path d="M13 1 L25 29 H19.5 L13 12 L6.5 29 H1 L13 1Z" fill="white"/>
              <line x1="6" y1="21" x2="20" y2="21" stroke="#059669" strokeWidth="2.5"/>
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#F4F4F5' }}>Augiva</span>
        </div>
        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', color: '#F4F4F5', fontSize: '13px', fontWeight: '600', padding: '7px 14px', cursor: 'pointer' }}>
          ← Torna alle opportunità
        </button>
      </nav>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#F4F4F5', margin: '0 0 6px', letterSpacing: '-0.4px' }}>
          Profilo azienda ⚙️
        </h1>
        <p style={{ fontSize: '14px', color: '#A1A1AA', margin: '0 0 36px' }}>
          Più informazioni fornisci, più le opportunità saranno mirate e precise.
        </p>

        {/* Dati azienda */}
        <div style={{ background: '#3A3A45', borderRadius: '16px', padding: '28px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#F4F4F5', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dati azienda</h3>
          {[['Ragione sociale','ragione_sociale'],['Partita IVA','piva'],['Codice ATECO','ateco'],['Descrizione attività','ateco_desc'],['PEC','pec'],['Forma giuridica','forma_giuridica']].map(([label, key]) => (
            <div key={key} style={{ marginBottom: '18px' }}>
              <label style={lbl}>{label}</label>
              <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inp} />
            </div>
          ))}
          <div style={{ marginBottom: '0' }}>
            <label style={lbl}>Regione sede legale</label>
            <select value={form.regione} onChange={e => setForm(f => ({ ...f, regione: e.target.value }))} style={inp}>
              <option value="">— Seleziona —</option>
              {REGIONI.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Aree operative */}
        <div style={{ background: '#3A3A45', borderRadius: '16px', padding: '28px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#F4F4F5', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Aree operative</h3>
          <p style={{ fontSize: '13px', color: '#A1A1AA', margin: '0 0 18px' }}>
            Seleziona le regioni in cui la tua azienda opera. Vedrai solo opportunità in queste aree (+ nazionali).
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {REGIONI.map(reg => {
              const sel = form.regioni_operative.includes(reg)
              return (
                <button key={reg} onClick={() => toggleRegione(reg)}
                  style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', border: '1px solid', transition: 'all .15s',
                    background: sel ? '#059669' : 'rgba(255,255,255,0.06)',
                    borderColor: sel ? '#059669' : 'rgba(255,255,255,0.15)',
                    color: sel ? '#fff' : '#A1A1AA' }}>
                  {reg}
                </button>
              )
            })}
          </div>
          {form.regioni_operative.length > 0 && (
            <p style={{ fontSize: '12px', color: '#059669', marginTop: '12px' }}>
              ✓ {form.regioni_operative.length} {form.regioni_operative.length === 1 ? 'area selezionata' : 'aree selezionate'}
            </p>
          )}
        </div>

        {/* Documenti */}
        <div style={{ background: '#3A3A45', borderRadius: '16px', padding: '28px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#F4F4F5', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Documenti azienda</h3>
          <p style={{ fontSize: '13px', color: '#A1A1AA', margin: '0 0 20px' }}>
            Carica visura camerale, autorizzazioni e permessi. Migliorano la precisione del matching.
          </p>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <select value={docType} onChange={e => setDocType(e.target.value)}
              style={{ ...inp, flex: 1, minWidth: '200px' }}>
              {TIPI_DOC.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="file" ref={fileRef} onChange={handleUpload} style={{ display: 'none' }} accept=".pdf,.doc,.docx,.jpg,.png" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ background: uploading ? 'rgba(5,150,105,0.4)' : 'rgba(5,150,105,0.15)', border: '1px solid rgba(5,150,105,0.5)', borderRadius: '10px', color: '#34D399', fontSize: '14px', fontWeight: '600', padding: '12px 20px', cursor: uploading ? 'default' : 'pointer', whiteSpace: 'nowrap' }}>
              {uploading ? 'Caricamento...' : '+ Carica'}
            </button>
          </div>

          {docs.length === 0 ? (
            <div style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#71717A', fontSize: '14px' }}>
              Nessun documento caricato
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {docs.map(doc => (
                <div key={doc.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#40404C', borderRadius: '10px', padding: '12px 16px' }}>
                  <span style={{ fontSize: '18px' }}>📄</span>
                  <span style={{ flex: 1, fontSize: '13px', color: '#F4F4F5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.name.replace(/_\d{13}\./, '.')}
                  </span>
                  <span style={{ fontSize: '12px', color: '#71717A' }}>
                    {doc.metadata?.size ? `${Math.round(doc.metadata.size/1024)}KB` : ''}
                  </span>
                  <button onClick={() => handleDelete(doc.name)}
                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '7px', color: '#F87171', fontSize: '12px', padding: '4px 10px', cursor: 'pointer' }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Salva */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, background: saving ? 'rgba(5,150,105,0.5)' : '#059669', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: '700', padding: '16px', cursor: saving ? 'default' : 'pointer' }}>
            {saving ? 'Salvataggio...' : saved ? '✅ Salvato!' : 'Salva modifiche'}
          </button>
          <button onClick={() => router.push('/dashboard')}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#F4F4F5', fontSize: '15px', fontWeight: '600', padding: '16px 24px', cursor: 'pointer' }}>
            Annulla
          </button>
        </div>
        <p style={{ fontSize: '12px', color: '#71717A', textAlign: 'center', marginTop: '16px' }}>
          Dopo aver salvato, le opportunità si aggiorneranno nel prossimo ciclo settimanale.
        </p>
      </div>
    </div>
  )
}
