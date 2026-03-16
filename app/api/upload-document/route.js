import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Client creato DENTRO le funzioni — non a livello modulo
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
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
      console.error('[upload-document] Storage error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const publicUrl = supabaseAdmin.storage
      .from('company-docs')
      .getPublicUrl(path).data.publicUrl

    return NextResponse.json({ success: true, path, url: publicUrl })
  } catch (err) {
    console.error('[upload-document] Error:', err)
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
