import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

function slimContext(ctx: Record<string, unknown> | null): string {
  if (!ctx) return 'No data available.'
  // Only send the fields the voice agent actually needs — keeps the prompt small and fast
  const slim: Record<string, unknown> = {}
  const keep = ['org', 'kpis', 'accounts', 'insights', 'recurring', 'approvals']
  for (const k of keep) if (ctx[k] !== undefined) slim[k] = ctx[k]
  return JSON.stringify(slim)
}

function buildSystemPrompt(ctx: Record<string, unknown> | null): string {
  const data = slimContext(ctx)
  return `You are Runwave, a financial AI assistant built into a voice-enabled business dashboard. You're answering spoken questions out loud — so your responses must sound completely natural when read aloud by a voice assistant.

Strict rules:
- Keep responses under 70 words. Be direct and concise.
- No markdown whatsoever. No asterisks, no bullet points, no numbered lists, no headers.
- Use natural spoken language — say "around twelve thousand euros" or "roughly €12k", not "€12,000.00".
- Lead with the actual answer, then briefly explain context if needed.
- Be conversational. You're a sharp, friendly colleague — not a report generator.
- If the user says "thanks", "bye", "stop", "that's all" or similar, respond with a short friendly sign-off.

Current financial data:
${data}`
}

export async function POST(req: Request) {
  try {
    const { history, dashboardContext } = await req.json()

    if (!history?.length) {
      return NextResponse.json({ error: 'No history provided' }, { status: 400 })
    }

    const systemPrompt = buildSystemPrompt(dashboardContext ?? null)
    const messages = history.map((m: { role: string; content: string }) => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }))

    // ── Groq first (fast, free tier) ──────────────────────────────────────
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      try {
        const groq = new Groq({ apiKey: groqKey })
        const result = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: systemPrompt }, ...messages],
          max_tokens: 120,
          temperature: 0.5,
        })
        const reply = result.choices[0].message.content ?? ''
        return NextResponse.json({ reply, model: 'groq' })
      } catch (err) {
        console.warn('[voice-chat] Groq failed, falling back to Gemini:', err)
      }
    }

    // ── Gemini fallback ───────────────────────────────────────────────────
    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: systemPrompt,
      })
      const geminiHistory = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
        role: m.role === 'user' ? 'user' : ('model' as 'user' | 'model'),
        parts: [{ text: m.content }],
      }))
      const chat = model.startChat({ history: geminiHistory })
      const last = messages[messages.length - 1]
      const result = await chat.sendMessage(last.content)
      return NextResponse.json({ reply: result.response.text(), model: 'gemini' })
    }

    return NextResponse.json(
      { error: 'No LLM API key configured. Add GROQ_API_KEY or GEMINI_API_KEY to .env.local.' },
      { status: 500 }
    )
  } catch (err) {
    console.error('[voice-chat] Route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
