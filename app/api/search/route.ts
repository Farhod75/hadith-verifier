import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q    = searchParams.get('q')?.trim() || ''
  const tag  = searchParams.get('tag') || ''
  const grade = searchParams.get('grade') || ''
  const lang  = searchParams.get('lang') || 'en'

  if (!q && !tag) {
    return NextResponse.json({ error: 'q or tag required' }, { status: 400 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = sb
    .from('hadith_library')
    .select('id, text_arabic, text_english, text_uzbek, text_russian, narrator, collection, hadith_number, grade, tags, source_url, authority')
    .order('collection')
    .limit(20)

  if (q) {
    query = query.or(
      `text_english.ilike.%${q}%,text_arabic.ilike.%${q}%,narrator.ilike.%${q}%,collection.ilike.%${q}%`
    )
  }

  if (tag) {
    query = query.contains('tags', [tag])
  }

  if (grade) {
    query = query.eq('grade', grade)
  }

  const { data, error } = await query

  if (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return translation based on requested lang
  // Change the text_display mapping:
    const results = (data || []).map(h => ({
    ...h,
    text_display: lang === 'uz_latin' || lang === 'uz_cyrillic' 
        ? (h.text_uzbek || h.text_english)
        : lang === 'ru' 
        ? (h.text_russian || h.text_english)
        : lang === 'tj'
        ? (h.text_russian || h.text_english)  // use Russian as fallback for Tajik
        : lang === 'ar'
        ? h.text_english  // Arabic users read the Arabic text directly
        : h.text_english,
    }))

  return NextResponse.json(results)
}