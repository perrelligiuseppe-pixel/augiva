'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const REGIONI = [
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna',
  'Friuli-Venezia Giulia','Lazio','Liguria','Lombardia','Marche',
  'Molise','Piemonte','Puglia','Sardegna','Sicilia','Toscana',
  'Trentino-Alto Adige','Umbria',"Valle d'Aosta",'Veneto'
]

export default function ProfiloPage() {
  const router = useRouter()
  const [company, setCompany] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    ragione_sociale: '',
    piva: '',
    ateco: '',
    ateco_desc: '',
    regione: '',
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
          pec: data.pec || '',
          forma_giuridica: data.forma_giuridica || '',
        })
      }
    }
    load()
  }, [router])

  const handleSave = async () => {
    if (!company) return
    setSaving(true)
    const { error } = await supabase.from('companies').update(form).eq('id', company.id)
    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  const field = (label, key, type = 'text', opts = null) => (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
        {label}
      </label>
      {opts ? (
        <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: '100%', background: '#40404C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#F4F4F5', fontSize: '15px', padding: '12px 14px', fontFamily: 'inherit', outline: 'none' }}>
          <option value="">— Seleziona —</option>
          {opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: '100%', background: '#40404C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#F4F4F5', fontSize: '15px', padding: '12px 14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
      )}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#32323C', fontFamily: 'Inter, sans-serif', color: '#F4F4F5' }}>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(50,50,60,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 32px', height: '60px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, background: '#059669', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="17" viewBox="0 0 26 30" fill="none">
              <path d="M13 1 L25 29 H19.5 L13 12 L6.5 29 H1 L13 1Z" fill="white"/>
              <line x1="6" y1="21" x2="20" y2="21" stroke="#059669" strokeWidth="2.5"/>
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#F4F4F5' }}>Augiva</span>
        </div>
        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', color: '#F4F4F5', fontSize: '13px', fontWeight: '600', padding: '7px 14px', cursor: 'pointer', marginLeft: '8px' }}>
          ← Torna alle opportunità
        </button>
      </nav>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#F4F4F5', margin: '0 0 6px', letterSpacing: '-0.4px' }}>
          Profilo azienda ⚙️
        </h1>
        <p style={{ fontSize: '14px', color: '#A1A1AA', margin: '0 0 36px' }}>
          Modifica i dati per migliorare il matching con le opportunità più rilevanti.
        </p>

        <div style={{ background: '#3A3A45', borderRadius: '16px', padding: '28px', border: '1px solid rgba(255,255,255,0.08)' }}>
          {field('Ragione sociale', 'ragione_sociale')}
          {field('Partita IVA', 'piva')}
          {field('Codice ATECO', 'ateco')}
          {field('Descrizione attività', 'ateco_desc')}
          {field('Regione', 'regione', 'text', REGIONI)}
          {field('PEC', 'pec', 'email')}
          {field('Forma giuridica', 'forma_giuridica')}
        </div>

        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, background: saving ? 'rgba(5,150,105,0.5)' : '#059669', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '15px', fontWeight: '700', padding: '16px', cursor: saving ? 'default' : 'pointer', transition: 'opacity .15s' }}>
            {saving ? 'Salvataggio...' : saved ? '✅ Salvato!' : 'Salva modifiche'}
          </button>
          <button onClick={() => router.push('/dashboard')}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#F4F4F5', fontSize: '15px', fontWeight: '600', padding: '16px 24px', cursor: 'pointer' }}>
            Annulla
          </button>
        </div>

        <p style={{ fontSize: '12px', color: '#71717A', textAlign: 'center', marginTop: '16px' }}>
          Dopo aver salvato, il matching verrà ricalcolato automaticamente ogni settimana.
        </p>
      </div>
    </div>
  )
}
