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
    const hasLR = company?.legale_rappresentante
    if (!hasLR) { setShowGate(true); return }
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
        <p style={{ fontSize:'24px', textAlign:'center', marginBottom:'12px' }}>📋</p>
        <h2 style={{ fontSize:'17px', fontWeight:'800', color:'#F4F4F5', margin:'0 0 10px', textAlign:'center' }}>Profilo incompleto</h2>
        <p style={{ fontSize:'14px', color:'#A1A1AA', lineHeight:1.6, margin:'0 0 20px', textAlign:'center' }}>
          Per una precompilazione accurata, aggiungi il <strong style={{color:'#F4F4F5'}}>Legale Rappresentante</strong> e i dati completi nel tuo profilo.<br/><br/>
          Senza questi dati i documenti avranno campi vuoti da completare manualmente.
        </p>
        <div style={{ display:'flex', gap:'10px', flexDirection:'column' }}>
          <button onClick={() => { setShowGate(false); window.location.href='/dashboard/profilo' }}
            style={{ background:'linear-gradient(135deg,#3B82F6,#2563EB)', border:'none', color:'#fff', padding:'13px', borderRadius:'10px', cursor:'pointer', fontWeight:'700', fontSize:'14px' }}>
            ✏️ Completa il profilo ora
          </button>
          <button onClick={() => { setShowGate(false); setPrecompiling(true); handlePrecompila() }}
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
    <div style={{ minHeight: '100vh', background: '#32323C', fontFamily: 'Inter, sans-serif', color: '#F4F4F5' }}>
      {GateModal}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(50,50,60,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 32px', height: '60px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => router.back()}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', color: '#F4F4F5', fontSize: '13px', fontWeight: '600', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ← Torna alle opportunità
        </button>
        <span style={{ color: '#71717A', fontSize: '13px' }}>Dettaglio opportunità</span>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '32px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', border: `4px solid ${ringColor}`, background: `${ringColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '18px', fontWeight: '900', color: ringColor }}>{score}%</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: '#71717A', marginBottom: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span>{tipo === 'appalto' ? '📋 Gara d\'appalto' : '💰 Fondo / Agevolazione'}</span>
              {sourceLabel && <span style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '6px' }}>{sourceLabel}</span>}
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#F4F4F5', lineHeight: 1.3, margin: '0 0 8px' }}>{titolo}</h1>
            {ente && <p style={{ fontSize: '14px', color: '#A1A1AA', margin: 0 }}>{ente}</p>}
          </div>
        </div>

        {/* Dati chiave */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          {importoFmt && (
            <div style={{ background: '#3A3A45', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '11px', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Importo</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#F4F4F5' }}>{importoFmt}</div>
            </div>
          )}
          {scadenza && (
            <div style={{ background: '#3A3A45', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '11px', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Scadenza</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: days !== null && days <= 15 && days > 0 ? '#FF9F0A' : '#F4F4F5' }}>{dateFmt}</div>
              {days !== null && days > 0 && (
                <div style={{ fontSize: '12px', color: days <= 15 ? '#FF9F0A' : '#A1A1AA', marginTop: '4px' }}>{days} giorni rimasti</div>
              )}
            </div>
          )}
          {regioni?.length > 0 && (
            <div style={{ background: '#3A3A45', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '11px', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Regione</div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#F4F4F5' }}>{regioni.join(', ')}</div>
            </div>
          )}
          <div style={{ background: '#3A3A45', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '11px', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Compatibilità</div>
            <div style={{ fontSize: '20px', fontWeight: '800', color: ringColor }}>{score}%</div>
          </div>
        </div>

        {/* Sintesi */}
        {sintesi && (
          <div style={{ background: '#3A3A45', borderRadius: '14px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '28px' }}>
            <div style={{ fontSize: '12px', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>📄 Descrizione</div>
            <p style={{ fontSize: '15px', color: '#D4D4D8', lineHeight: 1.6, margin: 0 }}>{sintesi}</p>
          </div>
        )}

        {/* CTA */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#F4F4F5', fontSize: '15px', fontWeight: '600', padding: '16px 24px', borderRadius: '12px', textDecoration: 'none' }}>
              🔗 Vai al bando originale
            </a>
          )}
          <button
            onClick={handlePrecompila}
            disabled={precompiling}
            style={{
              flex: 1, minWidth: '180px',
              background: precompiling ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3B82F6, #2563EB)',
              border: 'none', color: '#fff', fontSize: '15px', fontWeight: '700',
              padding: '16px 24px', borderRadius: '12px', cursor: precompiling ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              letterSpacing: '-0.01em',
            }}>
            {precompiling ? (
              <>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                Avvio in corso...
              </>
            ) : '✨ Precompila domanda'}
          </button>
        </div>

      </div>
    </div>
  )
}
