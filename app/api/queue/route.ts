import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET — fetch all unreviewed flagged posts
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('flagged_posts')
      .select('*')
      .eq('reviewed', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 })
  }
}

// PATCH — mark post as reviewed (dismiss from queue)
export async function PATCH(req: NextRequest) {
  try {
    const { id } = await req.json()
    const { error } = await supabase
      .from('flagged_posts')
      .update({ reviewed: true })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

// DELETE — remove post from queue entirely
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    const { error } = await supabase
      .from('flagged_posts')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
