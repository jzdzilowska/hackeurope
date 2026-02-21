'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2, MessageSquare } from 'lucide-react'
import { cn, formatTimeAgo } from '@/lib/utils'
import { useDashboard } from '@/lib/dashboard-context'
import type { ChatMessage } from '@/lib/types'

const CANNED_RESPONSES: Record<string, string> = {
  default: "Based on your Plaid transaction data, **infrastructure costs** are your largest discretionary category at €4,380 this month — up 28% from the previous quarter. Your payroll is stable at €5,200.\n\nWould you like a detailed breakdown or a cost-reduction plan?",
  infra: "Your infrastructure spend this month is **€4,380**:\n\n• **AWS** — €2,100 (↑41% MoM) · Largest spike\n• **GCP** — €1,890 · Stable\n• **Vercel** — €89 · Stable\n\nThe AWS jump is unusual. Most likely cause: data transfer or a new EC2 instance. Worth checking your AWS Cost Explorer.",
  runway: "At your current burn of **€15,230/month**, here's your runway projection:\n\n• **6 months** → €98,991 remaining → €6,609 left\n• **12 months** → Deficit of €83,569\n\nYou'll drop below the 6-month threshold on approximately **March 14th**. I'd recommend either reducing burn by ~€2,000/mo or initiating a funding conversation now.",
  subscriptions: "Analysing 8 active subscriptions across your accounts:\n\n**Potentially unused:**\n• **Linear** — €80/mo · 2 seats idle 45+ days\n• **Notion** — €160/mo · 2 seats idle 6 weeks\n\n**Saving opportunity:** Downgrading these saves **€52/month** (€624/year). Want me to flag them in your payments queue?",
}

function getResponse(query: string): string {
  const q = query.toLowerCase()
  if (q.includes('infra') || q.includes('aws') || q.includes('cloud')) return CANNED_RESPONSES.infra
  if (q.includes('runway') || q.includes('long') || q.includes('last')) return CANNED_RESPONSES.runway
  if (q.includes('subscri') || q.includes('tool') || q.includes('saas') || q.includes('unused')) return CANNED_RESPONSES.subscriptions
  return CANNED_RESPONSES.default
}

function useStreamText(text: string, active: boolean) {
  const [displayed, setDisplayed] = useState('')
  useEffect(() => {
    if (!active) return
    setDisplayed('')
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) clearInterval(interval)
    }, 12)
    return () => clearInterval(interval)
  }, [text, active])
  return displayed
}

function BotMessage({ content, isStreaming }: { content: string; isStreaming: boolean }) {
  const displayed = useStreamText(content, isStreaming)
  const text = isStreaming ? displayed : content

  // Naive markdown: bold **text**
  const renderText = (t: string) =>
    t.split('\n').map((line, li) => {
      const parts = line.split(/\*\*(.*?)\*\*/g)
      return (
        <span key={li}>
          {parts.map((part, pi) =>
            pi % 2 === 1
              ? <strong key={pi} className="font-semibold text-text-primary">{part}</strong>
              : <span key={pi}>{part}</span>
          )}
          {li < t.split('\n').length - 1 && <br />}
        </span>
      )
    })

  return (
    <div className="flex gap-2.5">
      {/* Avatar */}
      <div className="w-6 h-6 rounded-md bg-aurora-card flex items-center justify-center flex-shrink-0 mt-0.5"
           style={{ background: 'linear-gradient(135deg, #00D4A0 0%, #7FEDD4 40%, #C0F5E8 70%, #F0FAF8 100%)' }}>
        <span className="text-2xs font-bold text-black">H</span>
      </div>
      <div className="flex-1 text-xs text-text-secondary leading-relaxed">
        {renderText(text)}
        {isStreaming && displayed.length < content.length && (
          <span className="inline-block w-0.5 h-3.5 bg-accent ml-0.5 animate-pulse" />
        )}
      </div>
    </div>
  )
}

interface AIChatProps {
  open: boolean
  onClose: () => void
}

export default function AIChat({ open, onClose }: AIChatProps) {
  const { chatHistory } = useDashboard()
  const [messages, setMessages]     = useState<ChatMessage[]>(chatHistory)
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = () => {
    if (!input.trim() || loading) return
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }
    const responseText = getResponse(input)
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
      setStreamingId(assistantMsg.id)
      setLoading(false)
      setTimeout(() => setStreamingId(null), responseText.length * 12 + 500)
    }, 800)
  }

  const suggestions = [
    'How long can we last?',
    'Unused subscriptions?',
    'Infra spend breakdown?',
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-30 backdrop-blur-[2px]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 h-full w-[380px] bg-surface border-l border-border z-40 flex flex-col"
            style={{ boxShadow: '-8px 0 40px rgba(0,0,0,0.5)' }}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md flex items-center justify-center"
                     style={{ background: 'linear-gradient(135deg, #00D4A0 0%, #7FEDD4 40%, #C0F5E8 70%, #F0FAF8 100%)' }}>
                  <span className="text-2xs font-bold text-black">H</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Ask HELM</p>
                  <p className="text-2xs text-text-muted">Powered by Claude · your data stays private</p>
                </div>
              </div>
              <button onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-secondary transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {messages.map(msg => (
                <div key={msg.id}>
                  {msg.role === 'user' ? (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] px-3 py-2 rounded-xl rounded-tr-sm bg-surface-high border border-border/60 text-xs text-text-primary">
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <BotMessage
                      content={msg.content}
                      isStreaming={msg.id === streamingId}
                    />
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                       style={{ background: 'linear-gradient(135deg, #00D4A0 0%, #7FEDD4 40%, #C0F5E8 70%, #F0FAF8 100%)' }}>
                    <span className="text-2xs font-bold text-black">H</span>
                  </div>
                  <div className="flex items-center gap-1 py-1">
                    {[0, 1, 2].map(i => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-text-muted"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions */}
            {messages.length <= 2 && (
              <div className="px-5 pb-2 flex gap-2 flex-wrap">
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); }}
                    className="text-2xs px-2.5 py-1.5 rounded-pill border border-border/60 text-text-muted hover:text-text-secondary hover:border-border-focus hover:bg-surface-raised transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-5 pt-3 border-t border-border/60 flex-shrink-0">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-raised border border-border/60 focus-within:border-accent/40 transition-colors">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="Ask anything about your finances..."
                  className="flex-1 bg-transparent text-xs text-text-primary placeholder:text-text-muted outline-none"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || loading}
                  className={cn(
                    'p-1.5 rounded-lg transition-all',
                    input.trim() && !loading
                      ? 'bg-accent text-black hover:bg-accent-hover'
                      : 'bg-surface-high text-text-disabled cursor-not-allowed'
                  )}
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
