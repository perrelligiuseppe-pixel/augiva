'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

function daysLeft(scadenza) {
  if (!scadenza) return null
  try {
    const diff = new Date(scadenza) - new Date()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  } catch { return null }
}

function formatDate(scadenza) {
  if (!scadenza) return null
  try {
    return new Date(scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return scadenza }
}

function formatImporto(val) {
  if (!val) return null
  const n = parseFloat(val)
  if (isNaN(n)) return null
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `€${Math.round(n / 1_000)}K`
  return `€${n.toFixed(0)}`
}

export default function TenderRow({ tender }) {
  const router = useRouter()
  const { id, titolo, ente, score, importo, scadenza, tipo } = tender
  const days = useMemo(() => daysLeft(scadenza), [scadenza])
  const importoFmt = formatImporto(importo)
  const dateFmt = formatDate(scadenza)

  // Colore pallino score
  const ringColor = score >= 80 ? '#34C759'
    : score >= 65 ? '#3B82F6'
    : score >= 50 ? '#FF9F0A'
    : '#FF453A'

  const tipoIcon = tipo === 'appalto' ? '📋' : '💰'

  return (
    <div
      onClick={() => router.push(`/dashboard/bando/${id}`)}
      style={{
        background: '#3A3A45',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '8px',
        cursor: 'pointer',
        transition: 'background .15s, border-color .15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = '#404050'
        e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = '#3A3A45'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
      }}
    >
      {/* Pallino score */}
      <div style={{
        width: '52px', height: '52px', borderRadius: '50%',
        border: `3px solid ${ringColor}`,
        background: `${ringColor}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, flexDirection: 'column', gap: '1px',
      }}>
        <span style={{ fontSize: '13px', fontWeight: '800', color: ringColor, lineHeight: 1 }}>
          {score}%
        </span>
      </div>

      {/* Titolo + ente */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', color: '#71717A', marginBottom: '3px' }}>
          {tipoIcon} {tipo === 'appalto' ? 'Gara d\'appalto' : 'Fondo / Agevolazione'}
        </div>
        <div style={{
          fontSize: '15px', fontWeight: '600', color: '#F4F4F5',
          lineHeight: 1.35, marginBottom: '3px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {titolo}
        </div>
        <div style={{ fontSize: '12px', color: '#A1A1AA', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {ente && <span>{ente}</span>}
          {ente && dateFmt && <span style={{ opacity: .4 }}>·</span>}
          {dateFmt && (
            <span style={{ color: days !== null && days <= 15 && days > 0 ? '#FF9F0A' : '#A1A1AA' }}>
              Scade {dateFmt}
              {days !== null && days > 0 && days <= 30 && ` (${days}gg)`}
            </span>
          )}
        </div>
      </div>

      {/* Importo */}
      {importoFmt && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#F4F4F5' }}>{importoFmt}</div>
        </div>
      )}

      {/* Tasto Vedi */}
      <div style={{
        fontSize: '13px', fontWeight: '600', color: '#F4F4F5',
        background: 'rgba(255,255,255,0.08)',
        padding: '8px 16px', borderRadius: '9px',
        flexShrink: 0, whiteSpace: 'nowrap',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        Vedi →
      </div>
    </div>
  )
}
