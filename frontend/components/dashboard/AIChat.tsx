'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2, MessageSquare } from 'lucide-react'
import { cn, formatTimeAgo } from '@/lib/utils'
import { useDashboard } from '@/lib/dashboard-context'
import type { ChatMessage } from '@/lib/types'

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
           style={{ background: 'linear-gradient(135deg, #2C2926 0%, #6A6662 40%, #9A9692 70%, #D8D4D0 100%)' }}>
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
  const { chatHistory, kpis, burnData, categories, insights, approvals, recurring, accounts, org } = useDashboard()
  const [messages, setMessages]     = useState<ChatMessage[]>(chatHistory)
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }
    const allMessages = [...messages, userMsg]
    setMessages(allMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: allMessages.map(m => ({ role: m.role, content: m.content })),
          dashboardContext: { org, accounts, kpis, burnData, categories, insights, approvals, recurring },
        }),
      })
      const data = await res.json()
      const responseText = data.reply ?? data.error ?? 'Something went wrong.'
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])
      setStreamingId(assistantMsg.id)
      setTimeout(() => setStreamingId(null), responseText.length * 12 + 500)
    } catch {
      const errMsg: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: 'Sorry, I couldn\'t reach the server. Please try again.',
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  const suggestions = [
    'How long can we last?',
    'Unused subscriptions?',
    'Supplier cost breakdown?',
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
            style={{ boxShadow: 'var(--panel-shadow)' }}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md flex items-center justify-center"
                     style={{ background: 'linear-gradient(135deg, #2C2926 0%, #6A6662 40%, #9A9692 70%, #D8D4D0 100%)' }}>
                  <span className="text-2xs font-bold text-black">H</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Ask Runwave</p>
                  <p className="text-2xs text-text-muted">Powered by Gemini · your data stays private</p>
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
                       style={{ background: 'linear-gradient(135deg, #2C2926 0%, #6A6662 40%, #9A9692 70%, #D8D4D0 100%)' }}>
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
