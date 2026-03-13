/**
 * POST /api/precompile
 * Avvia un job di precompilazione per un bando.
 * Body: { tender_id: string }
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(request) {
  try {
    const { tender_id } = await request.json()
    if (!tender_id) return NextResponse.json({ error: 'tender_id richiesto' }, { status: 400 })

    // Recupera sessione utente dal cookie
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    // Trova l'azienda dell'utente
    const { data: company, error: compErr } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (compErr || !company) {
      return NextResponse.json({ error: 'Profilo azienda non trovato' }, { status: 404 })
    }

    const company_id = company.id

    // Controlla se esiste già un job recente (< 24h) per questo bando
    const { data: existing } = await supabase
      .from('precompile_jobs')
      .select('id, status, created_at')
      .eq('company_id', company_id)
      .eq('tender_id', tender_id)
      .in('status', ['complete', 'analyzing', 'generating', 'pending'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existing) {
      const ageHours = (Date.now() - new Date(existing.created_at).getTime()) / 3600000
      if (ageHours < 24 || existing.status === 'complete') {
        return NextResponse.json({ job_id: existing.id, status: existing.status, existing: true })
      }
    }

    // Crea nuovo job
    const { data: job, error: jobErr } = await supabase
      .from('precompile_jobs')
      .insert({
        company_id,
        tender_id,
        status: 'pending',
        progress_step: 'In attesa di avvio...'
      })
      .select('id')
      .single()

    if (jobErr) throw jobErr

    const job_id = job.id

    // Lancia precompiler.py in background (non-blocking)
    const scriptPath = path.join('/root/augiva-backend', 'precompiler.py')
    const child = spawn('python3', [scriptPath, job_id, company_id, tender_id], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env }
    })
    child.unref()

    return NextResponse.json({ job_id, status: 'pending' })

  } catch (err) {
    console.error('POST /api/precompile error:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
