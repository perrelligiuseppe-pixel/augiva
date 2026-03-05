'use client'

import ScoreBadge from './ScoreBadge'

export default function TenderCard({ tender }) {
  const { titolo, ente, score, importo, scadenza, link, tipo } = tender

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'box-shadow 0.2s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 32px rgba(0,0,0,0.10)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 20px rgba(0,0,0,0.06)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
            {tipo === 'appalto' ? '📋 Gara d\'appalto' : '💰 Fondo / Agevolazione'}
          </p>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1D1D1F', lineHeight: '1.4', margin: 0 }}>
            {titolo}
          </h3>
          {ente && (
            <p style={{ fontSize: '13px', color: '#6E6E73', marginTop: '4px' }}>{ente}</p>
          )}
        </div>
        <ScoreBadge score={score} />
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {importo && (
          <div>
            <p style={{ fontSize: '11px', color: '#6E6E73', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Importo</p>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#1D1D1F' }}>{importo}</p>
          </div>
        )}
        {scadenza && (
          <div>
            <p style={{ fontSize: '11px', color: '#6E6E73', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Scadenza</p>
            <p style={{ fontSize: '15px', fontWeight: '600', color: scadenza === 'Sempre aperto' ? '#34C759' : '#1D1D1F' }}>
              {scadenza}
            </p>
          </div>
        )}
      </div>

      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: '600',
            color: '#2563EB',
            textDecoration: 'none',
            marginTop: '4px',
          }}
        >
          Approfondisci →
        </a>
      )}
    </div>
  )
}
