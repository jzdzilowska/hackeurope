import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { messages, dashboardContext } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured.' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: buildSystemPrompt(dashboardContext),
    })

    // Build history for multi-turn (all messages except the last user one)
    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    const chat = model.startChat({ history })
    const lastMessage = messages[messages.length - 1].content
    const result = await chat.sendMessage(lastMessage)
    const text = result.response.text()

    return NextResponse.json({ reply: text })
  } catch (err) {
    console.error('Chat route error:', err)
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 })
  }
}

function buildSystemPrompt(ctx: Record<string, unknown> | null): string {
  const data = ctx ? JSON.stringify(ctx, null, 2) : 'No data available yet.'
  return `You are Runwave, a sharp and friendly AI financial assistant built into a business finance dashboard. You have access to real-time financial data for this business.

Keep responses concise and conversational — you're talking to a busy founder or finance manager, not writing a report. Use bullet points sparingly and only when listing more than 3 items. Be direct, give actual numbers, and flag anything urgent.

Never say you "don't have access" to data — if it's in the context below, use it. If it genuinely isn't there, say so briefly and move on.

Current dashboard data:
${data}`
}
