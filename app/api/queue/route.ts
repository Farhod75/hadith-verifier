// app/api/queue/route.ts
// Admin review queue for flagged posts (rows written by /api/analyze).
//
// P364: every method now calls requireAdmin() first. Before, all three answered
// anyone, through the service-role key: GET listed every flagged post, PATCH
// marked any id reviewed, DELETE removed any id. GET also logged the key's
// length and the Supabase URL prefix on every call; those lines are gone.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-session'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (!url.startsWith('https://') || key.length < 20) return null
  const { createClient } = require('@supabase/supabase-js')
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied
  try {
    const supabase = getSupabase()
    if (!supabase) {
      console.error('Queue GET: Supabase is not configured')
      return NextResponse.json([])
    }

    const { data, error } = await supabase
      .from('flagged_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Queue GET error:', error)
    return NextResponse.json([])
  }
}

export async function PATCH(req: NextRequest) {
  const denied = requireAdmin(req)
  if (denied) return denied
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
  const denied = requireAdmin(req)
  if (denied) return denied
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
