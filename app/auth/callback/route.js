import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://izwpthubencimzsgervo.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6d3B0aHViZW5jaW16c2dlcnZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTgyMzMsImV4cCI6MjA4ODI5NDIzM30.KIJHWcgwLGTSUa6qSJoh2tPMrzkdO9jVe87BOF-7Ey4'
    )
    await supabase.auth.exchangeCodeForSession(code)
    // I dati azienda (salvati in localStorage durante la registrazione)
    // vengono letti e scritti nel DB dalla dashboard al primo accesso.
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
