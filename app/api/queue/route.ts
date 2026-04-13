import { NextRequest, NextResponse } from 'next/server'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (!url.startsWith('https://') || key.length < 20) return null
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

export async function GET() {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      return NextResponse.json([])
    }
    const { data, error } = await supabase
      .from('flagged_posts')
      .select('*')
      .eq('reviewed', false)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    return NextResponse.json([])
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id } = await req.json()
    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ success: true })
    await supabase.from('flagged_posts').update({ reviewed: true }).eq('id', id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const supabase = getSupabase()
    if (!supabase) return NextResponse.json({ success: true })
    await supabase.from('flagged_posts').delete().eq('id', id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
