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
      setLoading(false)
      return
    }

    setCompany(data)

    if (data.status === 'matched') {
      await loadMatches(data.id)
    }

    setLoading(false)

    // Realtime subscription for status changes
    if (data.status === 'pending' || data.status === 'matching') {
      const channel = supabase
        .channel(`company-${data.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'companies',
          filter: `id=eq.${data.id}`,
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
    // Load appalti matches
    const { data: appaltiData } = await supabase
      .from('matches')
      .select('*, tenders(*)')
      .eq('company_id', companyId)
      .order('score', { ascending: false })

    if (appaltiData) {
      const mapped = appaltiData
        .filter(m => m.tenders)
        .map(m => ({
          id: m.id,
          titolo: m.tenders.titolo || m.tenders.title,
          ente: m.tenders.ente || m.tenders.entity,
          score: Math.round(m.score * 100),
          importo: m.tenders.importo || m.tenders.amount,
          scadenza: m.tenders.scadenza || m.tenders.deadline,
          tipo: m.tenders.tipo || m.tenders.type,
          link: m.tenders.link || m.tenders.url,
        }))

      setAppalti(mapped.filter(m => m.tipo === 'appalto'))
      setFondi(mapped.filter(m => m.tipo === 'fondo'))
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!authChecked || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F5F7' }}>
        <div style={{
          width: '40px', height: '40px',
          border: '3px solid #E5E5EA',
          borderTopColor: '#2563EB',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!company) {
    return (
      <div style={{ minHeight: '100vh', background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '20px', fontWeight: '600', color: '#1D1D1F', marginBottom: '8px' }}>
            Nessuna azienda configurata
          </p>
          <p style={{ color: '#6E6E73', marginBottom: '24px' }}>Completa l'onboarding per vedere i tuoi match.</p>
          <Link
            href="/onboarding"
            style={{
              padding: '14px 28px',
              background: '#2563EB',
              color: 'white',
              borderRadius: '12px',
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            Vai all'onboarding →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F7' }}>
      {/* Header */}
      <nav style={{
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', background: '#2563EB', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: '16px', fontWeight: '800' }}>A</span>
            </div>
            <div>
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#1D1D1F' }}>
                {company.ragione_sociale || 'La tua azienda'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#FF9F0A',
              background: '#FFF8EC',
              border: '1px solid #FF9F0A',
              padding: '4px 10px',
              borderRadius: '20px',
            }}>
              ✦ Prova gratuita
            </span>
            <button
              onClick={handleLogout}
              style={{
                fontSize: '14px',
                color: '#6E6E73',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px 12px',
              }}
            >
              Esci
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px' }}>
        {(company.status === 'pending' || company.status === 'matching') ? (
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1D1D1F', marginBottom: '8px' }}>
              Analisi in corso...
            </h1>
            <p style={{ color: '#6E6E73', marginBottom: '40px' }}>
              Stiamo analizzando {company.ragione_sociale} e trovando le migliori opportunità.
            </p>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
            }}>
              <LoadingMatcher />
            </div>
          </div>
        ) : (
          <>
            {/* Welcome */}
            <div style={{ marginBottom: '40px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1D1D1F', marginBottom: '8px' }}>
                Le tue opportunità 🎯
              </h1>
              <p style={{ color: '#6E6E73' }}>
                Ecco i migliori match per <strong>{company.ragione_sociale}</strong> — aggiornati in tempo reale.
              </p>
            </div>

            {/* Summary bar */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '20px 28px',
              boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
              marginBottom: '36px',
              display: 'flex',
              gap: '32px',
              flexWrap: 'wrap',
            }}>
              <div>
                <p style={{ fontSize: '24px', fontWeight: '800', color: '#2563EB' }}>{appalti.length}</p>
                <p style={{ fontSize: '13px', color: '#6E6E73' }}>Gare d'appalto</p>
              </div>
              <div>
                <p style={{ fontSize: '24px', fontWeight: '800', color: '#34C759' }}>{fondi.length}</p>
                <p style={{ fontSize: '13px', color: '#6E6E73' }}>Fondi e agevolazioni</p>
              </div>
              {company.ateco && (
                <div>
                  <p style={{ fontSize: '15px', fontWeight: '700', color: '#1D1D1F' }}>{company.ateco}</p>
                  <p style={{ fontSize: '13px', color: '#6E6E73' }}>Codice ATECO</p>
                </div>
              )}
            </div>

            {/* Appalti section */}
            {appalti.length > 0 && (
              <div style={{ marginBottom: '48px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '22px' }}>📋</span>
                  <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1D1D1F' }}>Gare d'appalto</h2>
                  <span style={{
                    background: '#EEF4FF',
                    color: '#2563EB',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}>
                    {appalti.length} match
                  </span>
                </div>
                <div className="grid-cards">
                  {appalti.map(tender => (
                    <TenderCard key={tender.id} tender={tender} />
                  ))}
                </div>
              </div>
            )}

            {/* Fondi section */}
            {fondi.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '22px' }}>💰</span>
                  <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#1D1D1F' }}>Fondi e agevolazioni</h2>
                  <span style={{
                    background: '#EEF4FF',
                    color: '#2563EB',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}>
                    {fondi.length} match
                  </span>
                </div>
                <div className="grid-cards">
                  {fondi.map(tender => (
                    <TenderCard key={tender.id} tender={tender} />
                  ))}
                </div>
              </div>
            )}

            {appalti.length === 0 && fondi.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 24px' }}>
                <p style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</p>
                <p style={{ fontSize: '20px', fontWeight: '600', color: '#1D1D1F', marginBottom: '8px' }}>
                  Nessun risultato ancora
                </p>
                <p style={{ color: '#6E6E73' }}>
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
