export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const piva = searchParams.get('piva')?.replace(/\D/g, '')

  if (!piva || piva.length !== 11) {
    return Response.json({ error: 'P.IVA non valida (deve essere 11 cifre)' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/IT/vat/${piva}`,
      { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } }
    )
    const data = await res.json()

    if (!data.isValid || !data.name || data.name === '---' || data.name === '') {
      return Response.json({ error: 'P.IVA non trovata nel Registro Imprese europeo' }, { status: 404 })
    }

    // Estrai regione dalla sigla provincia nell'indirizzo
    let regione = ''
    let citta = ''
    if (data.address && data.address !== '---') {
      const lines = data.address.trim().split('\n').filter(Boolean)
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1].trim()
        // "CAP CITTÀ SIGLA" → prendi città e sigla
        const match = lastLine.match(/^\d{5}\s+(.+?)\s+([A-Z]{2})$/)
        if (match) {
          citta = match[1]
          regione = match[2]
        }
      }
    }

    return Response.json({
      ragioneSociale: data.name,
      indirizzo: data.address?.trim() || '',
      citta,
      regione,
      isValid: true,
    })
  } catch (e) {
    return Response.json({ error: 'Servizio temporaneamente non disponibile' }, { status: 503 })
  }
}
