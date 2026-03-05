'use client'

export default function ScoreBadge({ score }) {
  const getColor = (score) => {
    if (score >= 80) return { bg: '#E8F8ED', text: '#34C759', border: '#34C759' }
    if (score >= 65) return { bg: '#FFF8EC', text: '#FF9F0A', border: '#FF9F0A' }
    return { bg: '#FFF3EE', text: '#FF6B35', border: '#FF6B35' }
  }

  const colors = getColor(score)

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '20px',
        fontSize: '13px',
        fontWeight: '700',
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1.5px solid ${colors.border}`,
        letterSpacing: '0.01em',
      }}
    >
      <span style={{ fontSize: '11px' }}>●</span>
      {score}%
    </span>
  )
}
