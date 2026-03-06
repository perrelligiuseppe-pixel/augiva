'use client'

import { useMemo } from 'react'

function daysLeft(scadenza) {
  if (!scadenza || scadenza === 'Sempre aperto') return null
  try {
    const diff = new Date(scadenza) - new Date()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  } catch { return null }
}

function formatDate(scadenza) {
  if (!scadenza || scadenza === 'Sempre aperto') return 'Sempre aperto'
  try {
    return new Date(scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return scadenza }
}

export default function TenderCard({ tender }) {
  const { titolo, ente, score, importo, scadenza, link, tipo } = tender
  const days = useMemo(() => daysLeft(scadenza), [scadenza])

  const ringColor = score >= 80 ? '#34C759' : score >= 65 ? '#3B82F6' : '#FF9F0A'
  const ringLabel = score >= 80 ? 'Alta' : score >= 65 ? 'Media' : 'Buona'

  return (
    <div style={{
      background: '#3A3A45',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.09)',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      marginBottom: '8px',
      transition: 'background .15s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = '#404050'}
    onMouseLeave={e => e.currentTarget.style.background = '#3A3A45'}
    >
      {/* Score ring */}
      <div style={{
        width: '52px', height: '52px', borderRadius: '50%',
        border: `3px solid ${ringColor}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, flexDirection: 'column',
        background: `${ringColor}18`,
      }}>
        <span style={{ fontSize: '13px', fontWeight: '800', color: ringColor, lineHeight: 1 }}>{score}%</span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#F4F4F5', lineHeight: 1.35, marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {titolo}
        </div>
        <div style={{ fontSize: '12px', color: '#A1A1AA' }}>
          {ente && <span>{ente}</span>}
          {ente && scadenza && <span style={{ margin: '0 6px', opacity: .4 }}>·</span>}
          {scadenza && <span>Scadenza {formatDate(scadenza)}</span>}
        </div>
      </div>

      {/* Importo + giorni */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {importo && (
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#F4F4F5', marginBottom: '2px' }}>{importo}</div>
        )}
        {days !== null && (
          <div style={{ fontSize: '12px', fontWeight: '600', color: days <= 15 ? '#FF9F0A' : '#A1A1AA' }}>
            {days > 0 ? `${days} giorni` : 'Scaduto'}
          </div>
        )}
      </div>

      {/* CTA */}
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: '13px', fontWeight: '600', color: '#F4F4F5', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.08)', padding: '7px 12px', borderRadius: '8px', flexShrink: 0, textDecoration: 'none' }}>
          Vedi →
        </a>
      )}
    </div>
  )
}
