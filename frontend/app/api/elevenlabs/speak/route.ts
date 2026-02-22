import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Default to "Rachel" — a clear, professional English voice
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? '21m00Tcm4TlvDq8ikWAM'

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ElevenLabs API key not configured. Set ELEVENLABS_API_KEY in .env.local.' },
        { status: 500 }
      )
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_flash_v2_5',
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.75,
            use_speaker_boost: false,
          },
        }),
        signal: AbortSignal.timeout(20000),
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      console.error('ElevenLabs API error:', response.status, errText)
      return NextResponse.json(
        { error: `ElevenLabs returned ${response.status}` },
        { status: response.status }
      )
    }

    // Stream audio directly — no need to buffer the full file first
    return new Response(response.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('ElevenLabs speak route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
