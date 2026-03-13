'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function formatDate(d) {
  if (!d) return null
  try { return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return d }
}

function formatImporto(val) {
  if (!val) return null
  const n = parseFloat(val)
  if (isNaN(n)) return null
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `€${Math.round(n / 1_000).toLocaleString('it-IT')}K`
  return `€${n.toLocaleString('it-IT')}`
}

function daysLeft(d) {
  if (!d) return null
  const diff = new Date(d) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function BandoPage() {
  const router = useRouter()
  const { id } = useParams()
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [precompiling, setPrecompiling] = useState(false)
  const [session, setSession] = useState(null)
  const [company, setCompany] = useState(null)
  const [showGate, setShowGate] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) { router.push('/auth/login'); return }
      setSession(s)
      const { data: comp } = await supabase.from('companies').select('legale_rappresentante, documenti_ids, regione').eq('user_id', s.user.id).single()
      if (comp) setCompany(comp)

      const { data } = await supabase
        .from('matches')
        .select('*, tenders(*)')
        .eq('id', id)
        .single()

      if (!data) { router.push('/dashboard'); return }

      const t = data.tenders
      setMatch({
        id: data.id,
        tender_id: t.id,
        score: Math.round(data.score > 1 ? data.score : data.score * 100),
        titolo: t.titolo || t.title || 'Opportunità',
        ente: t.ente || t.contracting_body || '',
        tipo: t.tipo || 'appalto',
        source: t.source || '',
        importo: t.importo || t.estimated_value,
        scadenza: t.scadenza || t.deadline_date,
        regioni: t.region ? [t.region] : [],
        sintesi: t.description || '',
        link: t.link || t.url || '',
      })
      setLoading(false)
    }
    load()
  }, [id, router])

  const handlePrecompila = async () => {
    if (!match || !session || precompiling) return
    // Gate: controlla se il profilo è sufficientemente completo
    const hasDocs = company?.documenti_ids && company.documenti_ids.length > 0
    if (!hasDocs) { setShowGate(true); return }
    setPrecompiling(true)

    try {
      const res = await fetch('/api/precompile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ tender_id: match.tender_id })
      })
      const data = await res.json()
      if (data.job_id) {
        router.push(`/dashboard/precompila/${data.job_id}`)
      } else {
        alert('Errore avvio precompilazione: ' + (data.error || 'errore sconosciuto'))
        setPrecompiling(false)
      }
    } catch (e) {
      alert('Errore di rete: ' + e.message)
      setPrecompiling(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#32323C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: '#A1A1AA', fontSize: 14 }}>Caricamento...</p>
      </div>
    </div>
  )

  if (!match) return null

  // Modale gate pre-precompilazione
  const GateModal = showGate && (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'#3A3A45', borderRadius:'20px', padding:'28px', maxWidth:'420px', width:'100%', border:'1px solid rgba(255,255,255,0.12)' }}>
        <p style={{ fontSize:'28px', textAlign:'center', marginBottom:'12px' }}>📄</p>
        <h2 style={{ fontSize:'17px', fontWeight:'800', color:'#F4F4F5', margin:'0 0 10px', textAlign:'center' }}>Carica i documenti aziendali</h2>
        <p style={{ fontSize:'14px', color:'#A1A1AA', lineHeight:1.7, margin:'0 0 6px' }}>
          Per una precompilazione accurata, carica nel tuo profilo:
        </p>
        <ul style={{ fontSize:'13px', color:'#D4D4D8', lineHeight:2, margin:'0 0 16px', paddingLeft:'20px' }}>
          <li><strong>Visura camerale</strong> — dati azienda, legale rappresentante, sede</li>
          <li><strong>Ultimo bilancio</strong> — dati finanziari per i requisiti economici</li>
          <li><strong>DURC</strong> — regolarità contributiva</li>
          <li>Altri documenti richiesti dal bando</li>
        </ul>
        <p style={{ fontSize:'12px', color:'#71717A', margin:'0 0 20px' }}>
          Più documenti carichi, più accurata sarà la precompilazione.
        </p>
        <div style={{ display:'flex', gap:'10px', flexDirection:'column' }}>
          <button onClick={() => { setShowGate(false); window.location.href='/dashboard/profilo' }}
            style={{ background:'linear-gradient(135deg,#3B82F6,#2563EB)', border:'none', color:'#fff', padding:'13px', borderRadius:'10px', cursor:'pointer', fontWeight:'700', fontSize:'14px' }}>
            📎 Carica documenti nel profilo
          </button>
          <button onClick={async () => { setShowGate(false); await new Promise(r=>setTimeout(r,50)); setPrecompiling(true); const res=await fetch('/api/precompile',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify({tender_id:match.tender_id})}); const d=await res.json(); if(d.job_id) router.push('/dashboard/precompila/'+d.job_id); else setPrecompiling(false); }}
            style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#A1A1AA', padding:'11px', borderRadius:'10px', cursor:'pointer', fontSize:'13px' }}>
            Procedi comunque (precompilazione parziale)
          </button>
        </div>
      </div>
    </div>
  )

  const { score, titolo, ente, tipo, source, importo, scadenza, regioni, sintesi, link } = match
  const ringColor = score >= 80 ? '#34C759' : score >= 65 ? '#3B82F6' : score >= 50 ? '#FF9F0A' : '#FF453A'
  const days = daysLeft(scadenza)
  const importoFmt = formatImporto(importo)
  const dateFmt = formatDate(scadenza)
  const sourceLabel = { TED: 'EU TED', MIMIT: 'MIMIT', INVITALIA: 'Invitalia', SIMEST: 'SIMEST', PNRR: 'PNRR', ANAC: 'ANAC' }[source] || source

  return (
    <div style={{ minHeight: '100vh', background: '#28282F', fontFamily: 'Inter, sans-serif', color: '#F4F4F5' }}>
      {GateModal}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(40,40,47,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '0 28px', height: '58px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#71717A', fontSize: '13px', fontWeight: '500', padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'inherit', borderRadius: '8px', transition: 'color .15s' }}>
          ← Dashboard
        </button>
        <div style={{ flex: 1 }} />
        {company && <span style={{ fontSize: '12px', color: '#71717A', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', padding: '5px 12px', borderRadius: '20px' }}>{company.ragione_sociale}</span>}
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* Deadline urgente */}
        {days !== null && days > 0 && days <= 20 && (
          <div style={{ background: 'rgba(255,159,10,.1)', border: '1px solid rgba(255,159,10,.25)', borderRadius: '10px', padding: '10px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#FF9F0A', fontWeight: '600' }}>
            ⏰ Scade tra {days} giorni — {dateFmt}
          </div>
        )}

        {/* Grid 2 colonne */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 270px', gap: '18px', alignItems: 'start' }}>

          {/* Colonna sinistra — hero + dettagli */}
          <div>
            <div style={{ background: '#32323C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '26px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '9px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: '5px', background: tipo === 'appalto' ? 'rgba(59,130,246,.12)' : 'rgba(52,199,89,.1)', color: tipo === 'appalto' ? '#3B82F6' : '#34C759', border: `1px solid ${tipo === 'appalto' ? 'rgba(59,130,246,.25)' : 'rgba(52,199,89,.25)'}` }}>
                  {tipo === 'appalto' ? '📋 Gara d'appalto' : '💰 Fondo / Agevolazione'}
                </span>
                {sourceLabel && <span style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: '5px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)', color: '#A1A1AA' }}>{sourceLabel}</span>}
              </div>
              <h1 style={{ fontSize: '21px', fontWeight: '800', color: '#F4F4F5', letterSpacing: '-0.7px', lineHeight: 1.3, margin: '0 0 8px' }}>{titolo}</h1>
              {ente && <p style={{ fontSize: '13px', color: '#71717A', margin: '0 0 18px' }}>{ente}</p>}
              {sintesi && (
                <div style={{ fontSize: '13px', color: '#A1A1AA', lineHeight: 1.7, padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {sintesi}
                </div>
              )}
            </div>
          </div>

          {/* Colonna destra — sidebar score */}
          <div style={{ background: '#32323C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '22px', textAlign: 'center', position: 'sticky', top: '78px' }}>
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', border: `3.5px solid ${ringColor}`, background: `${ringColor}15` }}>
              <span style={{ fontSize: '24px', fontWeight: '900', color: ringColor, letterSpacing: '-1px', lineHeight: 1 }}>{score}%</span>
              <span style={{ fontSize: '9px', color: ringColor, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>match</span>
            </div>
            <p style={{ fontSize: '12px', color: '#A1A1AA', lineHeight: 1.5, marginBottom: '16px' }}>
              {score >= 80 ? 'Alta compatibilità con il tuo profilo' : score >= 65 ? 'Buona compatibilità con il tuo profilo' : 'Compatibilità media'}
            </p>

            {[
              importoFmt && ['Importo', importoFmt, null],
              scadenza && ['Scadenza', dateFmt, days !== null && days <= 15 && days > 0 ? '#FF9F0A' : null],
              sourceLabel && ['Fonte', sourceLabel, null],
              regioni?.length > 0 && ['Regione', regioni.join(', '), null],
            ].filter(Boolean).map(([lbl, val, color], i, arr) => (
              <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', fontSize: '12px', textAlign: 'left' }}>
                <span style={{ color: '#71717A', fontWeight: '500' }}>{lbl}</span>
                <span style={{ color: color || '#F4F4F5', fontWeight: '600' }}>{val}</span>
              </div>
            ))}

            <button onClick={handlePrecompila} disabled={precompiling}
              style={{ width: '100%', padding: '13px', background: precompiling ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3B82F6, #2563EB)', border: 'none', borderRadius: '11px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: precompiling ? 'not-allowed' : 'pointer', marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontFamily: 'inherit', letterSpacing: '-0.2px' }}>
              {precompiling ? (<><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />Avvio...</>) : '⚡ Precompila documenti'}
            </button>

            {link && (
              <a href={link} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '9px', color: '#A1A1AA', fontSize: '12px', fontWeight: '600', marginTop: '8px', textDecoration: 'none' }}>
                ↗ Vai al bando originale
              </a>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
