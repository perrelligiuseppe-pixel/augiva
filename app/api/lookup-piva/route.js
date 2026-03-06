// Validazione algoritmica checksum P.IVA italiana
function validaPIVA(piva) {
  if (piva.length !== 11 || !/^\d+$/.test(piva)) return false
  let s = 0
  for (let i = 0; i < 10; i++) {
    let n = parseInt(piva[i])
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9 }
    s += n
  }
  return (10 - s % 10) % 10 === parseInt(piva[10])
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const piva = searchParams.get('piva')?.replace(/\D/g, '')

  if (!piva || piva.length !== 11) {
    return Response.json({ error: 'Inserisci 11 cifre' }, { status: 400 })
  }

  // 1. Valida formato con algoritmo
  if (!validaPIVA(piva)) {
    return Response.json({ error: 'P.IVA non valida (codice errato)' }, { status: 400 })
  }

  // 2. Prova VIES per aziende con partita IVA europea attiva
  try {
    const res = await fetch(
      `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/IT/vat/${piva}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(4000) }
    )
    if (res.ok) {
      const data = await res.json()
      if (data.isValid && data.name && data.name !== '---' && data.name !== '') {
        let regione = '', citta = ''
        if (data.address && data.address !== '---') {
          const lines = data.address.trim().split('\n').filter(Boolean)
          if (lines.length > 0) {
            const lastLine = lines[lines.length - 1].trim()
            const match = lastLine.match(/^\d{5}\s+(.+?)\s+([A-Z]{2})$/)
            if (match) { citta = match[1]; regione = match[2] }
          }
        }
        return Response.json({ ragioneSociale: data.name, citta, regione, fonte: 'VIES', isValid: true })
      }
    }
  } catch {}

  // 3. P.IVA valida ma non trovata in VIES — comune per PMI italiane
  return Response.json({
    isValid: true,
    found: false,
    message: 'P.IVA valida — completa i dati aziendali manualmente'
  })
}
