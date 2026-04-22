import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `You are an expert in Arabic Islamic duas, Arabic linguistics, and transliteration. You have deep knowledge of authentic duas from Quran, Bukhari, Muslim, Tirmidhi, Abu Dawud, Ibn Majah. You check Arabic word order, diacritics, and transliteration errors. Respond ONLY with valid JSON. No markdown, no backticks.`

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let duaText = ''
    let imageBase64 = ''
    let imageMediaType = ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      duaText = formData.get('duaText') as string || ''
      const imageFile = formData.get('image') as File | null
      if (imageFile) {
        const bytes = await imageFile.arrayBuffer()
        imageBase64 = Buffer.from(bytes).toString('base64')
        imageMediaType = imageFile.type || 'image/jpeg'
      }
    } else {
      const body = await req.json()
      duaText = body.duaText || ''
    }

    if (!duaText?.trim() && !imageBase64) {
      return NextResponse.json({ error: 'Dua text or image is required' }, { status: 400 })
    }

    const prompt = imageBase64
      ? `Extract ALL text from this image then analyze the dua for errors. Check word order, Arabic accuracy, transliteration.${duaText ? ` Context: ${duaText}` : ''}`
      : `Analyze this dua text:\n"""\n${duaText}\n"""\nCheck for wrong word order vs authentic sources, wrong Arabic, wrong transliteration.`

    const jsonResponse = `Reply with ONLY this JSON (no markdown):
{
  "extracted_text": "all text from image if image provided, else empty",
  "dua_identified": "name of this dua e.g. Dua for sufficiency - Tirmidhi 3563",
  "status": "correct or has_errors or unknown_dua",
  "errors_found": ["Error 1 description", "Error 2 description"],
  "corrected_arabic": "full corrected Arabic with diacritics e.g. اللّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ",
  "transliterations": {
    "latin_uz": "Uzbek Latin e.g. Allohimma ikfiniy bihalolika an haromika, va agʻniniy bifazlika amman sivok",
    "cyrillic_uz": "Uzbek Cyrillic e.g. Аллоҳимма икфиний биҳалолика ан ҳаромика, ва ағниний бифазлика аммаан сивок",
    "cyrillic_ru": "Russian Cyrillic e.g. Аллахумма икфини бихалялика ан харамика, ва агнини бифадлика амман сивак",
    "english": "English e.g. Allahumma ikfinee bi-halaalika an haraamika wa aghnini bi-fadhlika amman siwak"
  },
  "translation": {
    "uz": "O Alloh, menga harolingdan halol narsalaringni kifoya qil va fazling bilan menni Sendan boshqaga muhtoj qilma",
    "ru": "О Аллах, огради меня дозволенным от запретного и обогати меня Своей милостью так, чтобы я не нуждался ни в ком кроме Тебя",
    "en": "O Allah, suffice me with what is lawful against what is prohibited, and make me independent of all others besides You"
  },
  "source": {
    "name": "source collection name",
    "reference": "hadith number",
    "url": "https://sunnah.com/tirmidhi:3563",
    "grade": "authenticity grade"
  },
  "suggested_comment": {
    "uz_latin": "correction comment in Uzbek Latin",
    "uz_cyrillic": "correction comment in Uzbek Cyrillic for older generation",
    "ru": "correction comment in Russian",
    "en": "correction comment in English",
    "tj":"correction in Tajik Cyrillic"
  }
}`

    let messageContent: any[]
    if (imageBase64) {
      messageContent = [
        { type: 'image', source: { type: 'base64', media_type: imageMediaType, data: imageBase64 } },
        { type: 'text', text: prompt + '\n' + jsonResponse }
      ]
    } else {
      messageContent = [{ type: 'text', text: prompt + '\n' + jsonResponse }]
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: messageContent }]
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
    let result
    try {
      result = JSON.parse(raw.replace(/```json|```/g, '').trim())
    } catch {
      return NextResponse.json({ error: 'Parse error' }, { status: 500 })
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Dua API error:', error?.message)
    return NextResponse.json({ error: 'Analysis failed: ' + (error?.message || 'unknown') }, { status: 500 })
  }
}
