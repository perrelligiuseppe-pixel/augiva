import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://izwpthubencimzsgervo.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6d3B0aHViZW5jaW16c2dlcnZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcxODIzMywiZXhwIjoyMDg4Mjk0MjMzfQ.TWSDql63NZ8Nt00Ii-zT-85kBJnki8AoQJZ98oD-Ios'

export async function POST(request) {
  try {
    const { tender_id } = await request.json()
    if (!tender_id) return NextResponse.json({ error: 'tender_id richiesto' }, { status: 400 })

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { data: company } = await supabase
      .from('companies').select('id').eq('user_id', user.id).single()
    if (!company) return NextResponse.json({ error: 'Profilo azienda non trovato' }, { status: 404 })

    const company_id = company.id

    // Controlla se esiste già un job recente o completato
    const { data: existing } = await supabase
      .from('precompile_jobs').select('id, status, created_at')
      .eq('company_id', company_id).eq('tender_id', tender_id)
      .in('status', ['complete', 'analyzing', 'generating', 'pending'])
      .order('created_at', { ascending: false }).limit(1).single()

    if (existing) {
      const ageHours = (Date.now() - new Date(existing.created_at).getTime()) / 3600000
      if (ageHours < 24 || existing.status === 'complete') {
        return NextResponse.json({ job_id: existing.id, status: existing.status, existing: true })
      }
    }

    // Crea il job — il daemon su Hetzner lo eseguirà automaticamente entro 30s
    const { data: job, error: jobErr } = await supabase
      .from('precompile_jobs')
      .insert({ company_id, tender_id, status: 'pending', progress_step: 'In coda, avvio imminente...' })
      .select('id').single()
    if (jobErr) throw jobErr

    return NextResponse.json({ job_id: job.id, status: 'pending' })
  } catch (err) {
    console.error('POST /api/precompile error:', err)
    return NextResponse.json({ error: 'Errore interno: ' + err.message }, { status: 500 })
  }
}
