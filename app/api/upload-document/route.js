import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://izwpthubencimzsgervo.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6d3B0aHViZW5jaW16c2dlcnZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcxODIzMywiZXhwIjoyMDg4Mjk0MjMzfQ.TWSDql63NZ8Nt00Ii-zT-85kBJnki8AoQJZ98oD-Ios'

function getAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

export async function POST(request) {
  try {
    const supabaseAdmin = getAdmin()
    const formData = await request.formData()
    const file = formData.get('file')
    const companyId = formData.get('company_id')
    const docType = formData.get('doc_type') || 'documento'

    if (!file || !companyId) {
      return NextResponse.json({ error: 'Missing file or company_id' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()
    const safeName = docType.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '')
    const path = `${companyId}/${safeName}_${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error } = await supabaseAdmin.storage
      .from('company-docs')
      .upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const publicUrl = supabaseAdmin.storage
      .from('company-docs')
      .getPublicUrl(path).data.publicUrl

    return NextResponse.json({ success: true, path, url: publicUrl })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const supabaseAdmin = getAdmin()
    const { path } = await request.json()
    if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 })
    const { error } = await supabaseAdmin.storage.from('company-docs').remove([path])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
