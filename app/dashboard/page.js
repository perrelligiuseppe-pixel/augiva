'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import TenderCard from '@/components/TenderCard'
import LoadingMatcher from '@/components/LoadingMatcher'

export default function DashboardPage() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [company, setCompany] = useState(null)
  const [appalti, setAppalti] = useState([])
  const [fondi, setFondi] = useState([])
  const [loading, setLoading] = useState(true)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) {
        router.push('/auth/login')
        return
      }
      setSession(s)
      setAuthChecked(true)
      await loadCompany(s.user.id)
    }
    init()
  }, [router])

  const loadCompany = async (userId) => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      // Primo accesso post-conferma email: crea company dal localStorage
      await createCompanyFromDraft(userId)
      return
    }

    setCompany(data)
    if (data.status === 'matched' || data.status === 'active') {
      await loadMatches(data.id)
    }
    setLoading(false)
    setupRealtime(data, userId)
  }

  const createCompanyFromDraft = async (userId) => {
    let draft = null
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('augiva_company_draft')
        if (raw) draft = JSON.parse(raw)
      } catch {}
    }

    const newCompany = {
      user_id: userId,
      piva: draft?.piva || null,
      ragione_sociale: draft?.ragione_sociale || null,
      forma_giuridica: draft?.forma_giuridica || null,
      ateco: draft?.ateco || null,
      ateco_desc: draft?.ateco_desc || null,
      pec: draft?.pec || null,
      regione: draft?.regione || null,
      settori: draft?.settori || [],
      status: 'pending',
      trial_ends_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    }

    const { data, error } = await supabase.from('companies').insert(newCompany).select().single()
    if (!error && data) {
      if (typeof window !== 'undefined') localStorage.removeItem('augiva_company_draft')
      setCompany(data)
      setupRealtime(data, userId)
    }
    setLoading(false)
  }

  const setupRealtime = (comp, userId) => {
    if (comp.status === 'pending' || comp.status === 'matching') {
      const channel = supabase
        .channel(`company-${comp.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'companies',
          filter: `id=eq.${comp.id}`,
        }, async (payload) => {
          const updated = payload.new
          setCompany(updated)
          if (updated.status === 'matched') {
            await loadMatches(updated.id)
            channel.unsubscribe()
          }
        })
        .subscribe()
    }
  }

  const loadMatches = async (companyId) => {
    const { data: matchData } = await supabase
      .from('matches')
      .select('*, tenders(*)')
      .eq('company_id', companyId)
      .order('score', { ascending: false })

    if (matchData) {
      const mapped = matchData
        .filter(m => m.tenders)
        .map(m => ({
          id: m.id,
          titolo: m.tenders.titolo || m.tenders.title,
          ente: m.tenders.ente || m.tenders.contracting_body,
          score: Math.round(m.score * 100),
          importo: m.tenders.importo || m.tenders.estimated_value,
          scadenza: m.tenders.scadenza || m.tenders.deadline_date,
          tipo: m.tenders.tipo || m.tenders.type,
          source: m.tenders.source,
          link: m.tenders.link || m.tenders.url,
          sintesi: m.tenders.description,
          regioni: m.tenders.region ? m.tenders.region.split(', ') : null,
        }))
      setAppalti(mapped.filter(m => m.tipo === 'appalto'))
      setFondi(mapped.filter(m => m.tipo !== 'appalto'))
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!authChecked || loading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Caricamento...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <nav className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="auth-logo-mark">A</div>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            {company?.ragione_sociale || 'Augiva'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 12, fontWeight: 600, color: 'var(--yellow)',
            background: 'rgba(255,159,10,0.15)', border: '1px solid rgba(255,159,10,0.3)',
            padding: '4px 10px', borderRadius: 20,
          }}>
            ✦ Prova gratuita
          </span>
          <button onClick={handleLogout} style={{
            fontSize: 14, color: 'var(--text-secondary)', background: 'transparent',
            border: 'none', cursor: 'pointer', padding: '8px 12px', fontFamily: 'inherit',
          }}>
            Esci
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="dashboard-content">
        {(!company || company.status === 'pending' || company.status === 'matching') ? (
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              Analisi in corso...
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 40 }}>
              Stiamo analizzando{company?.ragione_sociale ? ` ${company.ragione_sociale}` : ' la tua azienda'} e trovando le migliori opportunità.
            </p>
            <div style={{
              background: 'var(--bg-card)', borderRadius: 20,
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)',
            }}>
              <LoadingMatcher />
            </div>
          </div>
        ) : (
          <>
            {/* Welcome */}
            <div style={{ marginBottom: 40 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                Le tue opportunità 🎯
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Ecco i migliori match per <strong style={{ color: 'var(--text-primary)' }}>{company.ragione_sociale}</strong> — aggiornati in tempo reale.
              </p>
            </div>

            {/* Summary bar */}
            <div style={{
              background: 'var(--bg-card)', borderRadius: 16, padding: '20px 28px',
              border: '1px solid var(--border)', marginBottom: 36,
              display: 'flex', gap: 32, flexWrap: 'wrap',
            }}>
              <div>
                <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{appalti.length}</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Gare d&apos;appalto</p>
              </div>
              <div>
                <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)' }}>{fondi.length}</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Fondi e agevolazioni</p>
              </div>
              {company.ateco && (
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{company.ateco}</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Codice ATECO</p>
                </div>
              )}
            </div>

            {/* Gare d'appalto */}
            {appalti.length > 0 && (
              <div style={{ marginBottom: 48 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <span style={{ fontSize: 22 }}>📋</span>
                  <h2 className="section-title" style={{ marginBottom: 0 }}>Gare d&apos;appalto</h2>
                  <span style={{
                    background: 'rgba(37,99,235,0.15)', color: 'var(--accent)',
                    padding: '3px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                  }}>
                    {appalti.length} match
                  </span>
                </div>
                {appalti.map(tender => <TenderCard key={tender.id} tender={tender} />)}
              </div>
            )}

            {/* Fondi e agevolazioni */}
            {fondi.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <span style={{ fontSize: 22 }}>💰</span>
                  <h2 className="section-title" style={{ marginBottom: 0 }}>Fondi e agevolazioni</h2>
                  <span style={{
                    background: 'rgba(37,99,235,0.15)', color: 'var(--accent)',
                    padding: '3px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                  }}>
                    {fondi.length} match
                  </span>
                </div>
                {fondi.map(tender => <TenderCard key={tender.id} tender={tender} />)}
              </div>
            )}

            {appalti.length === 0 && fondi.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>🔍</p>
                <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Nessun risultato ancora
                </p>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Il matching è ancora in corso o non sono stati trovati match. Riprova tra poco.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
