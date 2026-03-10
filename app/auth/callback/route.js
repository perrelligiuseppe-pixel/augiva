import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = 'https://izwpthubencimzsgervo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6d3B0aHViZW5jaW16c2dlcnZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTgyMzMsImV4cCI6MjA4ODI5NDIzM30.KIJHWcgwLGTSUa6qSJoh2tPMrzkdO9jVe87BOF-7Ey4'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/dashboard'

  if (code) {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session) {
      // Redirect con token nella URL per il client-side pickup
      const redirectUrl = new URL('/auth/confirm', request.url)
      redirectUrl.searchParams.set('access_token', data.session.access_token)
      redirectUrl.searchParams.set('refresh_token', data.session.refresh_token)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.redirect(new URL('/auth/login?error=confirmation_failed', request.url))
}
