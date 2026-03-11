'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TenderRow from '@/components/TenderRow'

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
    const { data } = await supabase
      .from('companies').select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1).single()

    if (!data) { setLoading(false); setCompany(null); return }

    setCompany(data)
    if (['active', 'matched'].includes(data.status)) await loadMatches(data.id)
    setLoading(false)
    if (['pending', 'processing'].includes(data.status)) setupRealtime(data)
  }

  const setupRealtime = (comp) => {
    const ch = supabase.channel(`co-${comp.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public',
        table: 'companies', filter: `id=eq.${comp.id}`,
      }, async (payload) => {
        setCompany(payload.new)
        if (['active', 'matched'].includes(payload.new.status)) {
          await loadMatches(comp.id)
          ch.unsubscribe()
        }
      }).subscribe()
  }

  const loadMatches = async (companyId) => {
    const { data } = await supabase
      .from('matches').select('*, tenders(*)')
      .eq('company_id', companyId)
      .order('score', { ascending: false })

    if (!data) return

    const mapped = data.filter(m => m.tenders).map(m => ({
      id: m.id,
      titolo: m.tenders.titolo || m.tenders.title || 'Opportunità',
      ente: m.tenders.ente || m.tenders.contracting_body || '',
      score: Math.round(m.score > 1 ? m.score : m.score * 100),
      importo: m.tenders.importo || m.tenders.estimated_value,
      scadenza: m.tenders.scadenza || m.tenders.deadline_date,
      tipo: m.tenders.tipo || 'appalto',
      source: m.tenders.source,
      link: m.tenders.link || m.tenders.url || '',
      sintesi: m.tenders.description || '',
      regioni: m.tenders.region ? [m.tenders.region] : [],
    }))

    setAppalti(mapped.filter(m => m.tipo === 'appalto'))
    setFondi(mapped.filter(m => m.tipo !== 'appalto'))
  }

  const totale = appalti.length + fondi.length
  const isPending = company && ['pending', 'processing'].includes(company?.status)

  if (!authChecked || loading) return (
    <div style={{ minHeight: '100vh', background: '#32323C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: '#A1A1AA', fontSize: 14 }}>{LOADING_MSGS[loadMsg]}</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#32323C', fontFamily: 'Inter, sans-serif', color: '#F4F4F5' }}>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(50,50,60,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 32px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, background: '#059669', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="17" viewBox="0 0 26 30" fill="none">
              <path d="M13 1 L25 29 H19.5 L13 12 L6.5 29 H1 L13 1Z" fill="white"/>
              <line x1="6" y1="21" x2="20" y2="21" stroke="#059669" strokeWidth="2.5"/>
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#F4F4F5' }}>Augiva</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#FF9F0A', background: 'rgba(255,159,10,0.15)', border: '1px solid rgba(255,159,10,0.3)', padding: '4px 10px', borderRadius: 20 }}>
            ✦ Prova gratuita
          </span>
          <button
            onClick={() => router.push('/dashboard/profilo')}
            style={{ fontSize: 13, fontWeight: 600, color: '#F4F4F5', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', cursor: 'pointer', padding: '7px 14px', fontFamily: 'inherit' }}>
            ⚙️ Profilo
          </button>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            style={{ fontSize: 14, color: '#A1A1AA', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 12px', fontFamily: 'inherit' }}>
            Esci
          </button>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Heading */}
        <div style={{ marginBottom: '32px' }}>
          {company?.ragione_sociale && (
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#059669', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {company.ragione_sociale}
            </p>
          )}
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#F4F4F5', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Le tue opportunità 🎯
          </h1>
          <p style={{ fontSize: '15px', color: '#A1A1AA', margin: 0 }}>
            {totale > 0
              ? `${totale} opportunità trovate per ${company?.ragione_sociale || 'la tua azienda'} — ordinate per compatibilità`
              : `Nessuna opportunità trovata ancora`}
          </p>
        </div>

        {/* Stato analisi in corso */}
        {isPending && (
          <div style={{ background: '#3A3A45', borderRadius: '14px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '28px', textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: '#A1A1AA', fontSize: '14px', margin: 0 }}>Analisi in corso... ti notificheremo quando i risultati sono pronti.</p>
          </div>
        )}

        {/* Gare d'appalto */}
        {appalti.length > 0 && (
          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span style={{ fontSize: '18px' }}>📋</span>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#F4F4F5', margin: 0 }}>Gare d&apos;appalto</h2>
              <span style={{ fontSize: '13px', color: '#A1A1AA', background: 'rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: '20px' }}>
                {appalti.length} match
              </span>
            </div>
            {appalti.map(t => <TenderRow key={t.id} tender={t} />)}
          </div>
        )}

        {/* Fondi e agevolazioni */}
        {fondi.length > 0 && (
          <div style={{ marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span style={{ fontSize: '18px' }}>💰</span>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#F4F4F5', margin: 0 }}>Fondi e agevolazioni</h2>
              <span style={{ fontSize: '13px', color: '#A1A1AA', background: 'rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: '20px' }}>
                {fondi.length} match
              </span>
            </div>
            {fondi.map(t => <TenderRow key={t.id} tender={t} />)}
          </div>
        )}

        {/* Nessun risultato */}
        {!isPending && totale === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#F4F4F5', marginBottom: '8px' }}>Nessun risultato ancora</h3>
            <p style={{ color: '#A1A1AA', fontSize: '15px' }}>Il sistema aggiornerà le opportunità ogni settimana.</p>
          </div>
        )}

      </div>
    </div>
  )
}
