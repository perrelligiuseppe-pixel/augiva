import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://izwpthubencimzsgervo.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6d3B0aHViZW5jaW16c2dlcnZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcxODIzMywiZXhwIjoyMDg4Mjk0MjMzfQ.TWSDql63NZ8Nt00Ii-zT-85kBJnki8AoQJZ98oD-Ios'

export async function GET(request, context) {
  try {
    // Next.js 14/15 compatible — await params
    const params = await context.params
    const job_id = params.job_id

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const { data: job, error: jobErr } = await supabase
      .from('precompile_jobs')
      .select('*, tenders(id, title, ente, tipo, url, estimated_value, deadline_date)')
      .eq('id', job_id).single()

    if (jobErr || !job) return NextResponse.json({ error: 'Job non trovato' }, { status: 404 })

    const { data: checklist } = await supabase
      .from('precompile_checklist').select('*').eq('job_id', job_id).order('sort_order')

    const { data: documents } = await supabase
      .from('precompile_documents').select('*').eq('job_id', job_id).order('sort_order')

    return NextResponse.json({
      job: {
        id: job.id, status: job.status,
        progress_step: job.progress_step,
        error_message: job.error_message,
        created_at: job.created_at, completed_at: job.completed_at,
        tender: job.tenders,
      },
      checklist: checklist || [],
      documents: (documents || []).map(d => ({
        id: d.id, name: d.name, category: d.category, status: d.status,
        file_url: d.file_url, download_url: d.download_url, notes: d.notes, sort_order: d.sort_order,
      }))
    })
  } catch (err) {
    console.error('GET /api/precompile/[job_id] error:', err)
    return NextResponse.json({ error: 'Errore interno: ' + err.message }, { status: 500 })
  }
}
