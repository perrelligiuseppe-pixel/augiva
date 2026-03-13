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

  const ringColor = score >= 80 ? '#34C759' : score >= 65 ? '#3B82F6' : score >= 50 ? '#FF9F0A' : '#FF453A'
  const borderColor = score >= 80 ? '#34C759' : score >= 65 ? '#3B82F6' : score >= 50 ? '#FF9F0A' : '#FF453A'
  const isAppalto = tipo === 'appalto'
  const isUrgent = days !== null && days > 0 && days <= 15

  return (
    <div
      onClick={() => router.push(`/dashboard/bando/${id}`)}
      style={{
        background: '#32323C',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.07)',
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '8px',
        cursor: 'pointer',
        transition: 'background .15s, border-color .15s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = '#3A3A45'
        e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = '#32323C'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
      }}
    >
      {/* Bordo sinistra colorato */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', background: borderColor, borderRadius: '3px 0 0 3px' }} />

      {/* Score ring */}
      <div style={{
        width: '54px', height: '54px', borderRadius: '50%', flexShrink: 0,
        border: `2.5px solid ${ringColor}`,
        background: `${ringColor}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '1px',
      }}>
        <span style={{ fontSize: '13px', fontWeight: '800', color: ringColor, lineHeight: 1 }}>{score}%</span>
        <span style={{ fontSize: '8px', fontWeight: '700', color: ringColor, opacity: .7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>match</span>
      </div>

      {/* Contenuto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Badge tipo */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '3px',
          fontSize: '9px', fontWeight: '700', letterSpacing: '0.07em', textTransform: 'uppercase',
          padding: '2px 7px', borderRadius: '5px', marginBottom: '5px',
          background: isAppalto ? 'rgba(59,130,246,.12)' : 'rgba(52,199,89,.1)',
          color: isAppalto ? '#3B82F6' : '#34C759',
          border: `1px solid ${isAppalto ? 'rgba(59,130,246,.25)' : 'rgba(52,199,89,.25)'}`,
        }}>
          {isAppalto ? '📋 Appalto' : '💰 Fondo'}
        </div>

        <div style={{
          fontSize: '14px', fontWeight: '600', color: '#F4F4F5',
          lineHeight: 1.35, marginBottom: '5px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {titolo}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', fontSize: '11px', color: '#71717A' }}>
          {ente && <span>{ente}</span>}
          {ente && dateFmt && <span style={{ opacity: .3 }}>·</span>}
          {dateFmt && (
            <span style={{ color: isUrgent ? '#FF9F0A' : '#71717A', fontWeight: isUrgent ? '600' : '400' }}>
              {isUrgent ? `⏰ Scade ${dateFmt} (${days}gg)` : `Scade ${dateFmt}`}
            </span>
          )}
          {!dateFmt && <span>Sportello aperto</span>}
        </div>
      </div>

      {/* Importo */}
      {importoFmt && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#F4F4F5', letterSpacing: '-0.3px' }}>{importoFmt}</div>
          <div style={{ fontSize: '10px', color: '#71717A', textTransform: 'uppercase', fontWeight: '500' }}>importo</div>
        </div>
      )}
    </div>
  )
}
