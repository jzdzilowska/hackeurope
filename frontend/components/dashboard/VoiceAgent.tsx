'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mic, MicOff } from 'lucide-react'
import { useDashboard } from '@/lib/dashboard-context'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
type AgentState = 'listening' | 'thinking' | 'speaking'

interface Turn {
  role: 'user' | 'assistant'
  content: string
}

export interface VoiceAgentProps {
  open: boolean
  onClose: () => void
  /** If true, HELM speaks a greeting then starts listening automatically */
  autoGreet?: boolean
}

// ─── Canvas waveform ──────────────────────────────────────────────────────────
const NUM_BARS = 28

function Waveform({
  state,
  analyserRef,
}: {
  state: AgentState
  analyserRef: React.MutableRefObject<AnalyserNode | null>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>()
  const phaseRef  = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const draw = () => {
      const W = canvas.width
      const H = canvas.height
      ctx.clearRect(0, 0, W, H)

      const slotW = W / NUM_BARS
      const barW  = slotW * 0.52
      const gap   = (slotW - barW) / 2

      let heights: number[]

      if (state === 'listening' && analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(data)
        // Focus on voice-frequency range (roughly first 60% of bins)
        heights = Array.from({ length: NUM_BARS }, (_, i) => {
          const idx = Math.floor((i / NUM_BARS) * data.length * 0.6)
          return Math.max(2, (data[idx] / 255) * H * 0.88)
        })
      } else if (state === 'speaking') {
        phaseRef.current += 0.09
        heights = Array.from({ length: NUM_BARS }, (_, i) => {
          const a = Math.sin(i * 0.42 + phaseRef.current) * 0.5 + 0.5
          const b = Math.sin(i * 0.27 + phaseRef.current * 0.65) * 0.35 + 0.35
          return Math.max(3, (a * 0.62 + b * 0.38) * H * 0.78)
        })
      } else {
        // thinking — slow uniform pulse
        phaseRef.current += 0.04
        const pulse = (Math.sin(phaseRef.current) + 1) / 2
        heights = Array(NUM_BARS).fill(3 + pulse * 5)
      }

      heights.forEach((h, i) => {
        const x = i * slotW + gap
        const y = (H - h) / 2
        const r = Math.min(barW / 2, 3)

        if (state === 'listening')     ctx.fillStyle = 'rgba(52,211,153,0.9)'
        else if (state === 'speaking') ctx.fillStyle = 'rgba(185,181,177,0.85)'
        else                           ctx.fillStyle = 'rgba(100,96,92,0.55)'

        ctx.beginPath()
        ctx.roundRect(x, y, barW, h, r)
        ctx.fill()
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [state, analyserRef])

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={52}
      className="w-full"
      style={{ height: 52 }}
    />
  )
}

// ─── VoiceAgent ───────────────────────────────────────────────────────────────
export default function VoiceAgent({ open, onClose, autoGreet = false }: VoiceAgentProps) {
  const {
    chatHistory, org, accounts, kpis, burnData,
    categories, insights, approvals, recurring,
  } = useDashboard()

  const [agentState, setAgentState] = useState<AgentState>('listening')
  const [turns,      setTurns]      = useState<Turn[]>([])
  const [liveText,   setLiveText]   = useState('')
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)
  const [muted,      setMuted]      = useState(false)

  // ── Stable refs (don't trigger re-renders) ─────────────────────────────
  const activeRef      = useRef(false)
  const recognitionRef = useRef<any>(null)
  const audioRef       = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef     = useRef<string | null>(null)
  const analyserRef    = useRef<AnalyserNode | null>(null)
  const micStreamRef   = useRef<MediaStream | null>(null)
  const audioCtxRef    = useRef<AudioContext | null>(null)
  const turnsRef       = useRef<Turn[]>([])
  const mutedRef       = useRef(false)
  const bottomRef      = useRef<HTMLDivElement>(null)

  // Keep refs current with state
  useEffect(() => { turnsRef.current = turns },  [turns])
  useEffect(() => { mutedRef.current = muted },  [muted])

  // Dashboard context ref (avoids stale closures in async callbacks)
  const dashCtxRef = useRef({ org, accounts, kpis, burnData, categories, insights, approvals, recurring })
  useEffect(() => {
    dashCtxRef.current = { org, accounts, kpis, burnData, categories, insights, approvals, recurring }
  }, [org, accounts, kpis, burnData, categories, insights, approvals, recurring])

  const chatHistoryRef = useRef(chatHistory)
  useEffect(() => { chatHistoryRef.current = chatHistory }, [chatHistory])

  // Scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns, liveText, agentState])

  // ── Mic + analyser setup ────────────────────────────────────────────────
  const setupMic = useCallback(async () => {
    if (micStreamRef.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      micStreamRef.current = stream
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      analyserRef.current = analyser
      ctx.createMediaStreamSource(stream).connect(analyser)
    } catch {
      // Mic denied — waveform won't visualise but speech recognition still works
    }
  }, [])

  // ── "Latest ref" pattern to break circular dep between speak ↔ startListening ──
  const startListeningFn = useRef<() => void>(() => {})
  const speakFn          = useRef<(text: string) => void>(() => {})

  // Assigned on every render so callbacks always use the latest version
  speakFn.current = (text: string) => {
    if (!activeRef.current) return
    setAgentState('speaking')

    fetch('/api/elevenlabs/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
      .then(r => { if (!r.ok) throw new Error('TTS failed'); return r.blob() })
      .then(blob => {
        if (!activeRef.current) return
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
        const url = URL.createObjectURL(blob)
        blobUrlRef.current = url

        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => { if (activeRef.current) startListeningFn.current() }
        audio.onerror = () => { if (activeRef.current) startListeningFn.current() }
        audio.play()
      })
      .catch(() => { if (activeRef.current) startListeningFn.current() })
  }

  // ── Process transcript ──────────────────────────────────────────────────
  const handleTranscript = useCallback((transcript: string) => {
    if (!activeRef.current || !transcript.trim()) return

    setAgentState('thinking')
    setLiveText('')

    const userTurn: Turn = { role: 'user', content: transcript }
    setTurns(prev => [...prev, userTurn])

    // Build full history for context
    const history = [
      ...chatHistoryRef.current.map(m => ({ role: m.role, content: m.content })),
      ...turnsRef.current,
      userTurn,
    ]

    fetch('/api/voice-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history, dashboardContext: dashCtxRef.current }),
    })
      .then(r => r.json())
      .then(data => {
        if (!activeRef.current) return
        const reply = (data.reply as string) ?? "Sorry, I couldn't process that."
        setTurns(prev => [...prev, { role: 'assistant', content: reply }])
        if (!mutedRef.current) {
          speakFn.current(reply)
        } else {
          startListeningFn.current()
        }
      })
      .catch(() => {
        if (!activeRef.current) return
        const errReply = "Sorry, something went wrong. Please try again."
        setTurns(prev => [...prev, { role: 'assistant', content: errReply }])
        startListeningFn.current()
      })
  }, [])

  // ── Start listening ─────────────────────────────────────────────────────
  startListeningFn.current = () => {
    if (!activeRef.current || mutedRef.current) return
    setupMic().then(() => {
      if (!activeRef.current) return
      setAgentState('listening')
      setLiveText('')

      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SR) {
        setErrorMsg('Voice input requires Chrome or Edge.')
        return
      }

      const r = new SR()
      r.continuous      = false
      r.interimResults  = true
      r.lang            = 'en-US'
      recognitionRef.current = r

      let didProcess = false

      r.onresult = (e: any) => {
        let interim = '', final = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript
          if (e.results[i].isFinal) final += t
          else interim += t
        }
        setLiveText(final || interim)
        if (final && !didProcess) {
          didProcess = true
          handleTranscript(final)
        }
      }

      r.onerror = (e: any) => {
        if (e.error !== 'aborted' && activeRef.current && !mutedRef.current) {
          setTimeout(() => startListeningFn.current(), 500)
        }
      }

      r.onend = () => {
        if (!didProcess && activeRef.current && !mutedRef.current) {
          setTimeout(() => startListeningFn.current(), 300)
        }
      }

      try { r.start() } catch { /* recognition already started */ }
    })
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    activeRef.current = true
    setTurns([])
    setLiveText('')
    setErrorMsg(null)
    setMuted(false)
    mutedRef.current = false

    if (autoGreet) {
      const greeting = "I'm here — what would you like to know about your finances?"
      setTurns([{ role: 'assistant', content: greeting }])
      speakFn.current(greeting)
    } else {
      startListeningFn.current()
    }

    return () => {
      activeRef.current = false
      recognitionRef.current?.abort()
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
      micStreamRef.current?.getTracks().forEach(t => t.stop())
      micStreamRef.current = null
      if (audioCtxRef.current?.state !== 'closed') audioCtxRef.current?.close().catch(() => {})
      audioCtxRef.current = null
      analyserRef.current = null
    }
  }, [open, autoGreet]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mute toggle ─────────────────────────────────────────────────────────
  const toggleMute = () => {
    const next = !mutedRef.current
    setMuted(next)
    mutedRef.current = next
    if (next) {
      recognitionRef.current?.abort()
    } else {
      setTimeout(() => startListeningFn.current(), 200)
    }
  }

  const handleClose = () => {
    activeRef.current = false
    recognitionRef.current?.abort()
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    onClose()
  }

  const statusText =
    errorMsg                   ? errorMsg :
    muted                      ? 'Microphone muted — tap mic to resume' :
    agentState === 'listening' ? 'Listening…' :
    agentState === 'thinking'  ? 'Thinking…' :
                                 'Speaking…'

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/45 z-40 backdrop-blur-[4px]"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 18 }}
            transition={{ type: 'spring', stiffness: 290, damping: 27 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div
              className="w-[460px] max-h-[600px] bg-surface border border-border rounded-2xl flex flex-col pointer-events-auto overflow-hidden"
              style={{ boxShadow: 'var(--panel-shadow)' }}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #2C2926 0%, #6A6662 40%, #9A9692 70%, #D8D4D0 100%)' }}
                  >
                    <span className="text-2xs font-bold text-black">R</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Runwave Voice</p>
                    <p className="text-2xs text-text-muted">Powered by Groq · {org.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={toggleMute}
                    title={muted ? 'Unmute microphone' : 'Mute microphone'}
                    className={cn(
                      'p-1.5 rounded-lg transition-colors',
                      muted
                        ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                        : 'hover:bg-surface-raised text-text-muted hover:text-text-secondary'
                    )}
                  >
                    {muted ? <MicOff size={14} /> : <Mic size={14} />}
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-1.5 rounded-lg hover:bg-surface-raised text-text-muted hover:text-text-secondary transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Conversation scroll area */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
                {turns.length === 0 && !liveText && (
                  <p className="text-xs text-text-disabled text-center mt-6 select-none">
                    {agentState === 'listening' ? 'Go ahead — I\'m listening' : '…'}
                  </p>
                )}

                {turns.map((turn, i) => (
                  <div key={i}>
                    {turn.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-[82%] px-3 py-2 rounded-xl rounded-tr-sm bg-surface-high border border-border/60 text-xs text-text-primary leading-relaxed">
                          {turn.content}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2.5">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: 'linear-gradient(135deg, #2C2926 0%, #6A6662 40%, #9A9692 70%, #D8D4D0 100%)' }}
                        >
                          <span className="text-[9px] font-bold text-black">H</span>
                        </div>
                        <p className="text-xs text-text-secondary leading-relaxed">{turn.content}</p>
                      </div>
                    )}
                  </div>
                ))}

                {/* Live interim transcript (dimmed italic) */}
                {liveText && agentState === 'listening' && (
                  <div className="flex justify-end">
                    <span className="inline-block max-w-[82%] px-3 py-2 rounded-xl rounded-tr-sm bg-surface-raised border border-border/40 text-xs text-text-disabled italic">
                      {liveText}
                    </span>
                  </div>
                )}

                {/* Thinking dots */}
                {agentState === 'thinking' && (
                  <div className="flex gap-2.5">
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #2C2926 0%, #6A6662 40%, #9A9692 70%, #D8D4D0 100%)' }}
                    >
                      <span className="text-[9px] font-bold text-black">H</span>
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

              {/* Waveform + status */}
              <div className="px-5 pt-3 pb-5 border-t border-border/60 flex-shrink-0">
                <Waveform state={agentState} analyserRef={analyserRef} />
                <p className="text-center text-[10px] text-text-muted mt-2 tracking-wide">
                  {statusText}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
