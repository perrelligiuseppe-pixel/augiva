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

const OPENAPI_TOKEN = '69aaf0133d71430e710bc757'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const piva = searchParams.get('piva')?.replace(/\D/g, '')

  if (!piva || piva.length !== 11) {
    return Response.json({ error: 'Inserisci 11 cifre' }, { status: 400 })
  }

  if (!validaPIVA(piva)) {
    return Response.json({ error: 'P.IVA non valida (codice di controllo errato)' }, { status: 400 })
  }

  // 1. openapi.com Company API — copre tutte le P.IVA italiane
  try {
    const res = await fetch(
      `https://company.openapi.com/IT-start/${piva}`,
      { headers: { Authorization: `Bearer ${OPENAPI_TOKEN}` }, signal: AbortSignal.timeout(6000) }
    )
    if (res.ok) {
      const json = await res.json()
      // Prende la prima azienda ATTIVA
      const aziende = json.data || []
      const azienda = aziende.find(a => a.activityStatus === 'ATTIVA') || aziende[0]
      if (azienda) {
        const addr = azienda.address?.registeredOffice || {}
        const regione = addr.region?.description || ''
        const citta = addr.town || ''
        const provincia = addr.province || ''
        const cap = addr.zipCode || ''
        return Response.json({
          ragioneSociale: azienda.companyName || '',
          regione,
          citta,
          provincia,
          cap,
          sdiCode: azienda.sdiCode || '',
          status: azienda.activityStatus,
          fonte: 'openapi.com',
          isValid: true,
        })
      }
    }
  } catch {}

  // 2. Fallback VIES per aziende EU non nel registro italiano
  try {
    const res = await fetch(
      `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/IT/vat/${piva}`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(4000) }
    )
    if (res.ok) {
      const data = await res.json()
      if (data.isValid && data.name && data.name !== '---') {
        let regione = '', citta = ''
        if (data.address && data.address !== '---') {
          const lines = data.address.trim().split('\n').filter(Boolean)
          const lastLine = lines[lines.length - 1]?.trim()
          const match = lastLine?.match(/^\d{5}\s+(.+?)\s+([A-Z]{2})$/)
          if (match) { citta = match[1]; regione = match[2] }
        }
        return Response.json({ ragioneSociale: data.name, citta, regione, fonte: 'VIES', isValid: true })
      }
    }
  } catch {}

  // 3. P.IVA valida ma non trovata
  return Response.json({ isValid: true, found: false, message: 'P.IVA valida — completa i dati manualmente' })
}
