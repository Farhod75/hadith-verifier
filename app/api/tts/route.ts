import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || !body.text || !body.voiceId) {
    return NextResponse.json({ error: 'text and voiceId are required' }, { status: 400 })
  }

  const { text, voiceId } = body as { text: string; voiceId: string }
  const apiKey = process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'TTS service not configured. Using browser fallback.' },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text.slice(0, 500),
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.80,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    )

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.error('ElevenLabs error:', res.status, errBody)
      return NextResponse.json({ error: `ElevenLabs returned ${res.status}` }, { status: 502 })
    }

    const audioBuffer = await res.arrayBuffer()
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': String(audioBuffer.byteLength),
      },
    })
  } catch (err: any) {
    console.error('TTS route error:', err?.message)
    return NextResponse.json({ error: 'TTS request failed' }, { status: 500 })
  }
}