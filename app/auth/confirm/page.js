'use client'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Suspense } from 'react'

function ConfirmContent() {
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(() => {
        router.replace('/dashboard')
      })
    } else {
      router.replace('/auth/login')
    }
  }, [params, router])

  return (
    <div style={{ minHeight: '100vh', background: '#32323C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ color: '#A1A1AA', fontSize: '14px' }}>Accesso in corso...</div>
    </div>
  )
}

export default function ConfirmPage() {
  return <Suspense><ConfirmContent /></Suspense>
}
