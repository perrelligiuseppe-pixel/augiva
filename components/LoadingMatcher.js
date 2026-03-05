'use client'

import { useState, useEffect } from 'react'

const messages = [
  "Analizziamo il tuo profilo aziendale...",
  "Confrontiamo con 50+ gare d'appalto...",
  "Valutiamo 35+ fondi e agevolazioni...",
  "Calcoliamo il tuo score di compatibilità...",
  "Quasi pronti..."
]

export default function LoadingMatcher() {
  const [msgIndex, setMsgIndex] = useState(0)
  const [dots, setDots] = useState(0)

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % messages.length)
    }, 2000)
    const dotsTimer = setInterval(() => {
      setDots(prev => (prev + 1) % 4)
    }, 500)
    return () => {
      clearInterval(msgTimer)
      clearInterval(dotsTimer)
    }
  }, [])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 24px',
      gap: '32px',
    }}>
      {/* Spinner */}
      <div style={{ position: 'relative', width: '64px', height: '64px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          border: '3px solid #E5E5EA',
          borderTopColor: '#2563EB',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>

      {/* Message */}
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontSize: '18px',
          fontWeight: '500',
          color: '#1D1D1F',
          minHeight: '28px',
          transition: 'opacity 0.3s ease',
        }}>
          {messages[msgIndex]}
        </p>
        <p style={{ fontSize: '14px', color: '#6E6E73', marginTop: '8px' }}>
          Questo richiede solo qualche secondo
        </p>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {messages.map((_, i) => (
          <div
            key={i}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: i <= msgIndex ? '#2563EB' : '#E5E5EA',
              transition: 'background-color 0.3s ease',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
