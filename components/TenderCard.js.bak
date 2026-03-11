'use client'

import ScoreBadge from './ScoreBadge'

function formatImporto(importo) {
  if (!importo) return null
  const n = parseFloat(importo)
  if (isNaN(n)) return importo
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`
  return `€${n.toFixed(0)}`
}

function formatScadenza(scadenza, tipo) {
  if (!scadenza) return tipo === 'fondo' ? 'Sportello aperto' : null
  try {
    const d = new Date(scadenza)
    const today = new Date()
    const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24))
    const label = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
    return { label, urgent: diffDays <= 30 && diffDays > 0, expired: diffDays <= 0 }
  } catch {
    return scadenza
  }
}

export default function TenderCard({ tender }) {
  const { titolo, ente, score, importo, scadenza, link, tipo, sintesi, regioni } = tender

  const importoFmt = formatImporto(importo)
  const scadenzaFmt = formatScadenza(scadenza, tipo)
  const tipoLabel = tipo === 'appalto' ? '📋 Gara d\'appalto' : '💰 Fondo / Agevolazione'

  const scadenzaColor = typeof scadenzaFmt === 'object' && scadenzaFmt?.urgent
    ? '#FF9F0A'
    : scadenzaFmt === 'Sportello aperto'
    ? '#34C759'
    : 'var(--text-primary)'

  const scadenzaText = typeof scadenzaFmt === 'object'
    ? scadenzaFmt.label
    : scadenzaFmt

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-card)',
        padding: '22px 24px',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        marginBottom: '12px',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(37,99,235,0.4)'
        e.currentTarget.style.boxShadow = '0 4px 32px rgba(0,0,0,0.4)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = 'var(--shadow-card)'
      }}
    >
      {/* Header: tipo + titolo + score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: '11px', fontWeight: '600', color: 'var(--accent)',
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px'
          }}>
            {tipoLabel}
          </p>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: '1.4', margin: 0 }}>
            {titolo}
          </h3>
          {ente && (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{ente}</p>
          )}
        </div>
        <ScoreBadge score={score} />
      </div>

      {/* Sintesi */}
      {sintesi && (
        <p style={{
          fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6',
          borderLeft: '2px solid rgba(37,99,235,0.3)', paddingLeft: '12px',
        }}>
          {sintesi}
        </p>
      )}

      {/* Dati chiave: importo, scadenza, regioni */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {importoFmt && (
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Importo
            </p>
            <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {tipo === 'appalto' ? importoFmt : `Fino a ${importoFmt}`}
            </p>
          </div>
        )}
        {scadenzaText && (
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Scadenza
            </p>
            <p style={{ fontSize: '15px', fontWeight: '700', color: scadenzaColor }}>
              {typeof scadenzaFmt === 'object' && scadenzaFmt?.urgent && '⚠️ '}
              {scadenzaText}
            </p>
          </div>
        )}
        {regioni && (
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Zona
            </p>
            <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
              {Array.isArray(regioni) ? regioni.slice(0, 3).join(', ') + (regioni.length > 3 ? ` +${regioni.length - 3}` : '') : regioni}
            </p>
          </div>
        )}
      </div>

      {/* Footer: link + PRECOMPILA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" style={{
            fontSize: '13px', fontWeight: '600', color: 'var(--accent)',
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px'
          }}>
            Vedi bando originale →
          </a>
        )}
        <button
          onClick={() => alert('PRECOMPILA — prossimamente')}
          style={{
            background: 'var(--accent)', color: 'white',
            border: 'none', borderRadius: 'var(--radius-btn)',
            padding: '9px 18px', fontSize: '13px', fontWeight: '700',
            cursor: 'pointer', letterSpacing: '0.02em',
            transition: 'background 0.15s ease',
            marginLeft: 'auto',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
        >
          PRECOMPILA →
        </button>
      </div>
    </div>
  )
}
