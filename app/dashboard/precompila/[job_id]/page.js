'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const POLL_MS = 2500 // polling ogni 2.5s durante elaborazione

function CategoryBadge({ category }) {
  const map = {
    generated: { label: '✨ Generato da Augiva', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    ready:     { label: '✅ Nel tuo profilo',   color: '#34C759', bg: 'rgba(52,199,89,0.12)' },
    missing:   { label: '❌ Da procurarsi',      color: '#FF453A', bg: 'rgba(255,69,58,0.12)' },
    download:  { label: '📥 Da scaricare',       color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)' },
    official:  { label: '📄 Modulo ufficiale',   color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)' },
  }
  const s = map[category] || map.missing
  return (
    <span style={{
      fontSize: '11px', fontWeight: '700', padding: '3px 9px',
      borderRadius: '20px', color: s.color, background: s.bg,
      letterSpacing: '0.02em', whiteSpace: 'nowrap'
    }}>{s.label}</span>
  )
}

function DocumentCard({ doc }) {
  return (
    <div style={{
      background: '#3A3A45', borderRadius: '14px',
      border: '1px solid rgba(255,255,255,0.08)',
      padding: '16px 20px',
      display: 'flex', alignItems: 'center', gap: '14px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#F4F4F5' }}>{doc.name}</span>
          <CategoryBadge category={doc.category} />
        </div>
        {doc.notes && (
          <p style={{ fontSize: '12px', color: '#71717A', margin: 0, lineHeight: 1.4 }}>{doc.notes}</p>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        {doc.file_url && (
          <a
            href={doc.file_url}
            target="_blank" rel="noopener noreferrer"
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
              color: '#fff', fontSize: '13px', fontWeight: '700',
              padding: '9px 16px', borderRadius: '10px',
              textDecoration: 'none', display: 'inline-flex',
              alignItems: 'center', gap: '5px', whiteSpace: 'nowrap'
            }}>
            ⬇ Scarica PDF
          </a>
        )}
        {doc.download_url && !doc.file_url && (
          <a
            href={doc.download_url}
            target="_blank" rel="noopener noreferrer"
            style={{
              background: 'rgba(255,159,10,0.15)', border: '1px solid rgba(255,159,10,0.3)',
              color: '#FF9F0A', fontSize: '13px', fontWeight: '700',
              padding: '9px 16px', borderRadius: '10px',
              textDecoration: 'none', display: 'inline-flex',
              alignItems: 'center', gap: '5px', whiteSpace: 'nowrap'
            }}>
            🔗 Vai al modulo
          </a>
        )}
      </div>
    </div>
  )
}

function ChecklistItem({ item }) {
  const icons = {
    ready:     '✅',
    generated: '✨',
    missing:   '❌',
    download:  '📥',
  }
  const colors = {
    ready:     '#34C759',
    generated: '#3B82F6',
    missing:   '#FF453A',
    download:  '#FF9F0A',
  }
  const icon = icons[item.category] || '•'
  const color = colors[item.category] || '#A1A1AA'

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)'
    }}>
      <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color, lineHeight: 1.3 }}>{item.item}</div>
        {item.notes && (
          <div style={{ fontSize: '11px', color: '#71717A', marginTop: '2px' }}>{item.notes}</div>
        )}
      </div>
    </div>
  )
}

function ProgressBar({ status, step }) {
  const steps = ['pending', 'analyzing', 'generating', 'complete']
  const idx = steps.indexOf(status)
  const pct = status === 'complete' ? 100 : Math.max(10, (idx / (steps.length - 1)) * 100)

  return (
    <div>
      <div style={{
        height: '6px', background: 'rgba(255,255,255,0.1)',
        borderRadius: '3px', overflow: 'hidden', marginBottom: '10px'
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: status === 'complete'
            ? 'linear-gradient(90deg, #34C759, #059669)'
            : 'linear-gradient(90deg, #3B82F6, #60A5FA)',
          borderRadius: '3px',
          transition: 'width 0.6s ease',
        }} />
      </div>
      <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0 }}>
        {status === 'complete' ? '✅ Precompilazione completata!' : step || 'Elaborazione in corso...'}
      </p>
    </div>
  )
}

export default function PrecompilaPage() {
  const router = useRouter()
  const { job_id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const pollingRef = useRef(null)

  const fetchData = async (token) => {
    const res = await fetch(`/api/precompile/${job_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) throw new Error('Errore caricamento dati')
    return res.json()
  }

  useEffect(() => {
    let token = null

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      token = session.access_token

      const poll = async () => {
        try {
          const d = await fetchData(token)
          setData(d)
          setLoading(false)
          // Continua polling se in elaborazione
          if (['pending', 'analyzing', 'generating'].includes(d.job?.status)) {
            pollingRef.current = setTimeout(poll, POLL_MS)
          }
        } catch (e) {
          setError(e.message)
          setLoading(false)
        }
      }

      poll()
    }

    init()

    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current)
    }
  }, [job_id])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#32323C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: '#A1A1AA', fontSize: 14 }}>Caricamento precompilazione...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#32323C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', color: '#F4F4F5' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>⚠️</p>
        <p style={{ color: '#FF453A', marginBottom: 16 }}>{error}</p>
        <button onClick={() => router.back()} style={{ background: '#3B82F6', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}>← Torna indietro</button>
      </div>
    </div>
  )

  const { job, checklist, documents } = data || {}
  const isProcessing = ['pending', 'analyzing', 'generating'].includes(job?.status)
  const isComplete = job?.status === 'complete'
  const isError = job?.status === 'error'

  const docsGenerated = documents?.filter(d => d.category === 'generated') || []
  const docsMissing = documents?.filter(d => d.category === 'missing') || []
  const docsOfficial = documents?.filter(d => ['official', 'download'].includes(d.category)) || []

  const checkReady = checklist?.filter(c => c.category === 'ready') || []
  const checkGenerated = checklist?.filter(c => c.category === 'generated') || []
  const checkMissing = checklist?.filter(c => c.category === 'missing') || []
  const checkDownload = checklist?.filter(c => c.category === 'download') || []

  const totalItems = checklist?.length || 0
  const readyItems = checkReady.length + checkGenerated.length + checkDownload.length
  const completionPct = totalItems > 0 ? Math.round((readyItems / totalItems) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: '#32323C', fontFamily: 'Inter, sans-serif', color: '#F4F4F5' }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(50,50,60,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 32px', height: '60px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => router.back()}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px', color: '#F4F4F5', fontSize: '13px', fontWeight: '600', padding: '8px 14px', cursor: 'pointer' }}>
          ← Indietro
        </button>
        <span style={{ color: '#71717A', fontSize: '13px' }}>Precompilazione</span>
        {isProcessing && (
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#3B82F6', animation: 'pulse 1.5s infinite' }}>
            ⚙️ Elaborazione in corso...
          </span>
        )}
      </nav>

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Header bando */}
        {job?.tender && (
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#F4F4F5', margin: '0 0 6px', lineHeight: 1.3 }}>
              {job.tender.title || 'Bando'}
            </h1>
            {job.tender.ente && (
              <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0 }}>{job.tender.ente}</p>
            )}
          </div>
        )}

        {/* Status / Progress */}
        <div style={{ background: '#3A3A45', borderRadius: '16px', padding: '20px 24px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
          {isError ? (
            <div>
              <p style={{ color: '#FF453A', fontWeight: '700', marginBottom: '8px' }}>⚠️ Errore durante la precompilazione</p>
              <p style={{ color: '#71717A', fontSize: '13px', margin: 0 }}>{job.error_message || 'Errore generico. Riprova.'}</p>
            </div>
          ) : (
            <ProgressBar status={job?.status} step={job?.progress_step} />
          )}
        </div>

        {/* Completamento summary — solo se completo */}
        {isComplete && totalItems > 0 && (
          <div style={{ background: 'rgba(52,199,89,0.08)', borderRadius: '16px', padding: '18px 24px', border: '1px solid rgba(52,199,89,0.2)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', border: '3px solid #34C759', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '16px', fontWeight: '900', color: '#34C759' }}>{completionPct}%</span>
            </div>
            <div>
              <p style={{ fontWeight: '700', color: '#34C759', margin: '0 0 4px' }}>Documenti pronti</p>
              <p style={{ fontSize: '13px', color: '#A1A1AA', margin: 0 }}>
                {readyItems} su {totalItems} elementi della checklist sono pronti o generati.
                {checkMissing.length > 0 && ` ${checkMissing.length} da procurarsi.`}
              </p>
            </div>
          </div>
        )}

        {/* DOCUMENTI GENERATI */}
        {docsGenerated.length > 0 && (
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
              ✨ Documenti generati da Augiva
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {docsGenerated.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
            </div>
          </section>
        )}

        {/* MODULI UFFICIALI */}
        {docsOfficial.length > 0 && (
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#FF9F0A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
              📥 Moduli ufficiali da scaricare
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {docsOfficial.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
            </div>
          </section>
        )}

        {/* CHECKLIST COMPLETA */}
        {checklist && checklist.length > 0 && (
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
              📋 Checklist documenti
            </h2>
            <div style={{ background: '#3A3A45', borderRadius: '14px', padding: '4px 20px 8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              {checklist.map((item, i) => <ChecklistItem key={i} item={item} />)}
            </div>
          </section>
        )}

        {/* DA PROCURARSI */}
        {docsMissing.length > 0 && (
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '700', color: '#FF453A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
              ❌ Documenti da procurarsi
            </h2>
            <div style={{ background: 'rgba(255,69,58,0.06)', borderRadius: '14px', padding: '4px 20px 8px', border: '1px solid rgba(255,69,58,0.15)' }}>
              {docsMissing.map((item, i) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: i < docsMissing.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#FF453A' }}>{item.name}</div>
                  {item.notes && <div style={{ fontSize: '11px', color: '#71717A', marginTop: '2px' }}>{item.notes}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Nota modale su elaborazione */}
        {isProcessing && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#71717A', fontSize: '13px' }}>
            <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 10px' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Augiva sta analizzando il bando e generando i documenti...<br />
            <span style={{ fontSize: '11px' }}>La pagina si aggiorna automaticamente.</span>
          </div>
        )}

      </div>
    </div>
  )
}
