'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TenderCard from '@/components/TenderCard'

const LOADING_MSGS = [
  'Analisi del profilo aziendale...',
  'Scansione appalti TED e ANAC...',
  'Scansione fondi Invitalia e MIMIT...',
  'Calcolo compatibilità con il tuo ATECO...',
  'Ranking opportunità per rilevanza...',
  'Quasi pronto...',
]

export default function DashboardPage() {
  const router = useRouter()
  const [company, setCompany] = useState(null)
  const [appalti, setAppalti] = useState([])
  const [fondi, setFondi] = useState([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)
  const [loadMsg, setLoadMsg] = useState(0)

  useEffect(() => {
    let msgInterval
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      setAuthChecked(true)
      await loadCompany(session.user.id)
    }
    msgInterval = setInterval(() => setLoadMsg(m => (m + 1) % LOADING_MSGS.length), 2200)
    init()
    return () => clearInterval(msgInterval)
  }, [router])

  const loadCompany = async (userId) => {
    const { data } = await supabase.from('companies').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).single()
    if (!data) { setLoading(false); setCompany(null); return }
    setCompany(data)
    if (['active', 'matched'].includes(data.status)) await loadMatches(data.id)
    setLoading(false)
    if (['pending', 'processing'].includes(data.status)) setupRealtime(data)
  }

  const setupRealtime = (comp) => {
    const ch = supabase.channel(`co-${comp.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'companies', filter: `id=eq.${comp.id}` },
        async (payload) => {
          setCompany(payload.new)
          if (['active', 'matched'].includes(payload.new.status)) {
            await loadMatches(comp.id)
            ch.unsubscribe()
          }
        })
      .subscribe()
  }

  const loadMatches = async (companyId) => {
    const { data } = await supabase.from('matches').select('*, tenders(*)').eq('company_id', companyId).order('score', { ascending: false })
    if (!data) return
    const mapped = data.filter(m => m.tenders).map(m => ({
      id: m.id,
      titolo: m.tenders.titolo || m.tenders.title || 'Opportunità',
      ente: m.tenders.ente || m.tenders.entity || '',
      score: Math.round((m.score > 1 ? m.score : m.score * 100)),
      importo: m.tenders.importo || m.tenders.amount || '',
      scadenza: m.tenders.scadenza || m.tenders.deadline || '',
      tipo: m.tenders.tipo || m.tenders.type || 'appalto',
      link: m.tenders.link || m.tenders.url || '',
    }))
    setAppalti(mapped.filter(m => ['appalto', 'gara', 'tender'].includes(m.tipo?.toLowerCase())))
    setFondi(mapped.filter(m => ['fondo', 'contributo', 'finanziamento', 'grant'].includes(m.tipo?.toLowerCase())))
  }

  const isPending = company && ['pending', 'processing'].includes(company?.status)
  const totale = appalti.length + fondi.length
  const avgScore = totale > 0 ? Math.round([...appalti, ...fondi].reduce((s, m) => s + m.score, 0) / totale) : 0
  const weekNum = Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / (7 * 86400000))

  if (!authChecked || loading) return (
    <div style={{ minHeight: '100vh', background: '#32323C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: '#A1A1AA', fontSize: '14px' }}>Caricamento...</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#32323C', fontFamily: 'Inter, sans-serif' }}>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(50,50,60,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 32px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: '#059669', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="16" viewBox="0 0 26 30" fill="none">
              <path d="M13 1 L25 29 H19.5 L13 12 L6.5 29 H1 L13 1Z" fill="white"/>
              <line x1="6" y1="21" x2="20" y2="21" stroke="#059669" strokeWidth="2.5"/>
            </svg>
          </div>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#F4F4F5' }}>Augiva</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {company?.ragione_sociale && (
            <span style={{ fontSize: '13px', color: '#A1A1AA' }}>{company.ragione_sociale}</span>
          )}
          <span style={{ fontSize: '11px', fontWeight: '700', color: '#FF9F0A', background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.25)', padding: '3px 10px', borderRadius: '20px' }}>
            Prova gratuita
          </span>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            style={{ fontSize: '13px', color: '#71717A', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            Esci
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Stato PENDING — loader */}
        {isPending ? (
          <div style={{ background: '#3A3A45', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.09)', padding: '48px 40px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', border: '3px solid rgba(255,255,255,0.08)', borderTopColor: '#059669', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 24px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#F4F4F5', marginBottom: '8px' }}>Stiamo creando la tua posizione</h2>
            <p style={{ fontSize: '14px', color: '#A1A1AA', marginBottom: '32px' }}>{LOADING_MSGS[loadMsg]}</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
              {LOADING_MSGS.map((_, i) => (
                <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === loadMsg ? '#059669' : 'rgba(255,255,255,0.15)', transition: 'background .3s' }} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Header settimana */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', color: '#71717A', marginBottom: '6px' }}>
                Settimana {weekNum} · {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })} · 07:00
              </div>
              <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#F4F4F5', letterSpacing: '-0.5px' }}>
                {totale > 0 ? `${totale} opportunità trovate` : 'Le tue opportunità'} 🎯
              </h1>
            </div>

            {/* Stats bar */}
            {totale > 0 && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Appalti & Gare', value: appalti.length, color: '#3B82F6' },
                  { label: 'Contributi & Fondi', value: fondi.length, color: '#34C759' },
                  { label: 'Score medio', value: `${avgScore}%`, color: '#FF9F0A' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#3A3A45', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.09)', padding: '14px 20px', flex: '1', minWidth: '120px' }}>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
                    <div style={{ fontSize: '11px', color: '#71717A', marginTop: '2px', fontWeight: '500' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ⚖️ Appalti & Gare */}
            {appalti.length > 0 && (
              <div style={{ marginBottom: '36px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#71717A', textTransform: 'uppercase', letterSpacing: '.8px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '12px' }}>
                  ⚖️ Appalti & Gare · {appalti.length}
                </div>
                {appalti.map(t => <TenderCard key={t.id} tender={t} />)}
              </div>
            )}

            {/* 💰 Contributi & Finanziamenti */}
            {fondi.length > 0 && (
              <div style={{ marginBottom: '36px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#71717A', textTransform: 'uppercase', letterSpacing: '.8px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '12px' }}>
                  💰 Contributi & Finanziamenti · {fondi.length}
                </div>
                {fondi.map(t => <TenderCard key={t.id} tender={t} />)}
              </div>
            )}

            {totale === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 24px', background: '#3A3A45', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.09)' }}>
                <p style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</p>
                <p style={{ fontSize: '18px', fontWeight: '600', color: '#F4F4F5', marginBottom: '8px' }}>Matching in corso</p>
                <p style={{ color: '#71717A', fontSize: '14px' }}>Le opportunità appariranno qui entro pochi minuti.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
