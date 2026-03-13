'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const POLL_MS = 2500

function formatDate(d) {
  if (!d) return null
  try { return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return d }
}

function daysLeft(d) {
  if (!d) return null
  const diff = new Date(d) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
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
    return () => { if (pollingRef.current) clearTimeout(pollingRef.current) }
  }, [job_id])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#32323C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: '#A1A1AA', fontSize: 14 }}>Caricamento...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#32323C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ textAlign: 'center', color: '#F4F4F5' }}>
        <p style={{ fontSize: 32, marginBottom: 12 }}>⚠️</p>
        <p style={{ color: '#FF453A', marginBottom: 20 }}>{error}</p>
        <button onClick={() => router.back()} style={{ background: '#3B82F6', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: 14 }}>← Torna indietro</button>
      </div>
    </div>
  )

  const { job, checklist, documents } = data || {}
  const isProcessing = ['pending', 'analyzing', 'generating'].includes(job?.status)
  const isComplete = job?.status === 'complete'
  const isError = job?.status === 'error'

  const docsGenerated = documents?.filter(d => d.category === 'generated' && d.file_url) || []
  const docsMissing = documents?.filter(d => d.category === 'missing') || []
  const docsOfficial = documents?.filter(d => ['official', 'download'].includes(d.category)) || []

  const checkMissing = checklist?.filter(c => c.category === 'missing') || []
  const checkClientSpecific = checklist?.filter(c => c.category === 'client_specific') || []
  const checkReady = checklist?.filter(c => ['ready', 'generated', 'download'].includes(c.category)) || []

  const scadenza = job?.tender?.deadline_date
  const days = daysLeft(scadenza)
  const dateFmt = formatDate(scadenza)

  return (
    <div style={{ minHeight: '100vh', background: '#32323C', fontFamily: 'Inter, sans-serif', color: '#F4F4F5' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.5 } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {/* Navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(50,50,60,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#A1A1AA', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 0' }}>
          ← Torna al bando
        </button>
        <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
        <span style={{ color: '#F4F4F5', fontSize: '13px', fontWeight: '600' }}>
          {job?.tender?.title ? job.tender.title.slice(0, 50) + (job.tender.title.length > 50 ? '…' : '') : 'Precompilazione'}
        </span>
      </nav>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* ── ELABORAZIONE IN CORSO ── */}
        {isProcessing && (
          <div style={{ background: '#3A3A45', borderRadius: '20px', padding: '36px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)', animation: 'fadeIn .4s ease' }}>
            <div style={{ width: 48, height: 48, border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin .9s linear infinite', margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#F4F4F5', margin: '0 0 8px' }}>Sto preparando i tuoi documenti</h2>
            <p style={{ fontSize: '14px', color: '#A1A1AA', margin: '0 0 24px', lineHeight: 1.5 }}>
              {job?.progress_step || 'Analisi in corso...'}
            </p>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '60%', background: 'linear-gradient(90deg, #3B82F6, #60A5FA)', borderRadius: '2px', animation: 'pulse 1.5s ease infinite' }} />
            </div>
            <p style={{ fontSize: '11px', color: '#71717A', marginTop: '12px' }}>La pagina si aggiorna da sola, puoi aspettare qui</p>
          </div>
        )}

        {/* ── ERRORE ── */}
        {isError && (
          <div style={{ background: 'rgba(255,69,58,0.08)', borderRadius: '20px', padding: '32px', textAlign: 'center', border: '1px solid rgba(255,69,58,0.2)' }}>
            <p style={{ fontSize: 32, margin: '0 0 12px' }}>⚠️</p>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#FF453A', margin: '0 0 8px' }}>Qualcosa è andato storto</h2>
            <p style={{ fontSize: '13px', color: '#71717A', margin: '0 0 20px' }}>{job?.error_message || 'Errore generico. Riprova.'}</p>
            <button onClick={() => router.back()} style={{ background: '#3B82F6', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px' }}>
              ← Torna al bando
            </button>
          </div>
        )}

        {/* ── COMPLETO ── */}
        {isComplete && (
          <div style={{ animation: 'fadeIn .5s ease' }}>

            {/* BANNER COSA FARE ADESSO */}
            <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(37,99,235,0.08))', borderRadius: '20px', padding: '24px 28px', border: '1px solid rgba(59,130,246,0.25)', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <span style={{ fontSize: '28px', flexShrink: 0 }}>📋</span>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#F4F4F5', margin: '0 0 6px' }}>
                    Cosa fare adesso
                  </h2>
                  <ol style={{ margin: 0, padding: '0 0 0 18px', color: '#D4D4D8', fontSize: '14px', lineHeight: 1.8 }}>
                    <li><strong>Scarica</strong> i documenti generati qui sotto</li>
                    <li><strong>Completa</strong> i campi <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '4px', fontSize: '12px' }}>___</code> con i dati mancanti</li>
                    <li><strong>Firma</strong> ogni documento (manualmente o con firma digitale)</li>
                    {docsOfficial.length > 0 && <li><strong>Scarica</strong> anche i moduli ufficiali nella sezione in basso</li>}
                    {checkMissing.length > 0 && <li><strong>Procurati</strong> i {checkMissing.length} documenti nella sezione "Da procurarsi"</li>}
                    <li><strong>Invia</strong> tutto secondo le istruzioni del bando</li>
                  </ol>
                  {scadenza && days !== null && days > 0 && (
                    <div style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: days <= 15 ? 'rgba(255,159,10,0.12)' : 'rgba(255,255,255,0.06)', border: `1px solid ${days <= 15 ? 'rgba(255,159,10,0.3)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', padding: '8px 14px' }}>
                      <span style={{ fontSize: '13px' }}>{days <= 15 ? '⚠️' : '📅'}</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: days <= 15 ? '#FF9F0A' : '#A1A1AA' }}>
                        Scadenza: {dateFmt} — {days} giorni rimasti
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* DOCUMENTI GENERATI — sezione principale */}
            {docsGenerated.length > 0 && (
              <section style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#3B82F6', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✨ Documenti pronti da scaricare
                  <span style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '700' }}>{docsGenerated.length}</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {docsGenerated.map((doc, i) => (
                    <div key={doc.id} style={{ background: '#3A3A45', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: 36, height: 36, background: 'rgba(59,130,246,0.12)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>
                        📄
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#F4F4F5', marginBottom: '2px' }}>{doc.name}</div>
                        {doc.notes && <div style={{ fontSize: '12px', color: '#71717A' }}>{doc.notes}</div>}
                      </div>
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                        style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: '#fff', fontSize: '13px', fontWeight: '700', padding: '10px 18px', borderRadius: '10px', textDecoration: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        ⬇ Scarica
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* MODULI UFFICIALI */}
            {docsOfficial.length > 0 && (
              <section style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#FF9F0A', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📥 Moduli ufficiali del bando
                  <span style={{ background: 'rgba(255,159,10,0.12)', color: '#FF9F0A', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '700' }}>{docsOfficial.length}</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {docsOfficial.map((doc) => (
                    <div key={doc.id} style={{ background: '#3A3A45', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: 36, height: 36, background: 'rgba(255,159,10,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>
                        📎
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#F4F4F5', marginBottom: '2px' }}>{doc.name}</div>
                        <div style={{ fontSize: '12px', color: '#71717A' }}>Da scaricare, compilare e allegare alla domanda</div>
                      </div>
                      {doc.download_url && (
                        <a href={doc.download_url} target="_blank" rel="noopener noreferrer"
                          style={{ background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.25)', color: '#FF9F0A', fontSize: '13px', fontWeight: '700', padding: '10px 18px', borderRadius: '10px', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          🔗 Vai al modulo
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* DA PREPARARE DA TE */}
            {checkClientSpecific.length > 0 && (
              <section style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#A855F7', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✍️ Da preparare con i tuoi dati
                  <span style={{ background: 'rgba(168,85,247,0.12)', color: '#A855F7', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '700' }}>{checkClientSpecific.length}</span>
                </h3>
                <div style={{ background: 'rgba(168,85,247,0.05)', borderRadius: '14px', border: '1px solid rgba(168,85,247,0.15)', overflow: 'hidden' }}>
                  {checkClientSpecific.map((item, i) => (
                    <div key={i} style={{ padding: '14px 20px', borderBottom: i < checkClientSpecific.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>✍️</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#F4F4F5' }}>{item.item}</div>
                        <div style={{ fontSize: '12px', color: '#71717A', marginTop: '2px' }}>{item.notes || 'Da preparare in autonomia con i dati del tuo progetto'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* DA PROCURARSI */}
            {checkMissing.length > 0 && (
              <section style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#FF453A', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ❌ Da procurarsi
                  <span style={{ background: 'rgba(255,69,58,0.1)', color: '#FF453A', fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '700' }}>{checkMissing.length}</span>
                </h3>
                <div style={{ background: 'rgba(255,69,58,0.05)', borderRadius: '14px', border: '1px solid rgba(255,69,58,0.12)', overflow: 'hidden' }}>
                  {checkMissing.map((item, i) => (
                    <div key={i} style={{ padding: '14px 20px', borderBottom: i < checkMissing.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>❌</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#F4F4F5' }}>{item.item}</div>
                        {item.notes && <div style={{ fontSize: '12px', color: '#71717A', marginTop: '2px' }}>{item.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* CHECKLIST COMPLETA — collassabile */}
            {checklist && checklist.length > 0 && (
              <details style={{ marginBottom: '24px' }}>
                <summary style={{ fontSize: '12px', fontWeight: '700', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', userSelect: 'none' }}>
                  <span style={{ fontSize: '14px' }}>▸</span>
                  Checklist completa ({checklist.length} elementi)
                </summary>
                <div style={{ background: '#3A3A45', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: '12px' }}>
                  {checklist.map((item, i) => {
                    const icons = { ready:'✅', generated:'✨', missing:'❌', download:'📥' }
                    const colors = { ready:'#34C759', generated:'#3B82F6', missing:'#FF453A', download:'#FF9F0A' }
                    return (
                      <div key={i} style={{ padding: '12px 20px', borderBottom: i < checklist.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>{icons[item.category] || '•'}</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: colors[item.category] || '#A1A1AA' }}>{item.item}</div>
                          {item.notes && <div style={{ fontSize: '11px', color: '#71717A', marginTop: '1px' }}>{item.notes}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </details>
            )}

            {/* NOTA LEGALE — discreta, non invadente */}
            <p style={{ fontSize: '11px', color: '#52525B', textAlign: 'center', lineHeight: 1.6, marginTop: '8px' }}>
              I documenti generati sono bozze da verificare, completare e firmare prima dell'invio.<br />
              Augiva non invia documenti, non firma e non garantisce l'esito della domanda.
            </p>

          </div>
        )}
      </div>
    </div>
  )
}
