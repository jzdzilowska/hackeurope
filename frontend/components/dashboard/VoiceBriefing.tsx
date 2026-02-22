'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, VolumeX, Loader2 } from 'lucide-react'
import { useDashboard } from '@/lib/dashboard-context'
import {
  generateBriefingScript,
  type FixedCostsData,
  type SurplusSummary,
  type RestockData,
} from '@/lib/voice-briefing'
import { cn } from '@/lib/utils'

const USER_ID = 'c5cbf7bd-2801-407e-9efe-222d8e93fddc'

type BriefingState = 'idle' | 'loading' | 'playing' | 'error'

// Animated waveform shown while audio plays — matches the Runwave design language
function WaveformIcon() {
  return (
    <span className="flex items-center gap-[2px]" style={{ height: 11 }}>
      {[0.5, 1, 0.7, 1, 0.4].map((scale, i) => (
        <motion.span
          key={i}
          className="w-[2px] rounded-full bg-current"
          style={{ height: 10, transformOrigin: 'center' }}
          animate={{ scaleY: [scale, 1, scale * 0.4, 1, scale] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}

// Fetch the same endpoints that RecurringCosts, SurplusChart, and RestockForecast each use
async function fetchExtraData(): Promise<{
  fixedCosts: FixedCostsData | null
  surplusSummary: SurplusSummary | null
  restockData: RestockData | null
}> {
  const [insightsRes, surplusRes, restockRes] = await Promise.allSettled([
    fetch(`/api/dashboard/insights?user_id=${USER_ID}`).then(r => r.json()),
    fetch(`/api/dashboard/surplus?user_id=${USER_ID}`).then(r => r.json()),
    fetch(`/api/dashboard/restock-forecast?user_id=${USER_ID}`).then(r => r.json()),
  ])

  const fixedCosts: FixedCostsData | null =
    insightsRes.status === 'fulfilled' ? (insightsRes.value?.fixedCosts ?? null) : null

  const surplusSummary: SurplusSummary | null =
    surplusRes.status === 'fulfilled' ? (surplusRes.value?.summary ?? null) : null

  const restockData: RestockData | null =
    restockRes.status === 'fulfilled' ? restockRes.value ?? null : null

  return { fixedCosts, surplusSummary, restockData }
}

export default function VoiceBriefing({ onBriefingEnd }: { onBriefingEnd?: () => void } = {}) {
  const { org, accounts, kpis, burnData, categories, insights, approvals, recurring } = useDashboard()

  const [state, setState]       = useState<BriefingState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const audioRef   = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  // Revoke blob URL on unmount to avoid memory leaks
  useEffect(() => () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
  }, [])

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setState('idle')
  }

  async function play() {
    if (state === 'playing') { stop(); return }
    if (state === 'loading') return

    setState('loading')
    setErrorMsg(null)

    try {
      // Fetch the extra data that each component fetches independently,
      // so the briefing script covers every number visible on screen
      const { fixedCosts, surplusSummary, restockData } = await fetchExtraData()

      const script = generateBriefingScript({
        org, accounts, kpis, burnData, categories, insights, approvals, recurring,
        fixedCosts, surplusSummary, restockData,
      })

      const res = await fetch('/api/elevenlabs/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: script }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }

      const blob = await res.blob()

      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
      const url = URL.createObjectURL(blob)
      blobUrlRef.current = url

      const audio = new Audio(url)
      audioRef.current  = audio
      audio.onended     = () => { setState('idle'); onBriefingEnd?.() }
      audio.onerror     = () => { setState('error'); setErrorMsg('Playback failed') }

      setState('playing')
      await audio.play()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate audio'
      console.error('Voice briefing error:', err)
      setState('error')
      setErrorMsg(msg)
      setTimeout(() => { setState('idle'); setErrorMsg(null) }, 4000)
    }
  }

  const isPlaying = state === 'playing'
  const isLoading = state === 'loading'
  const isError   = state === 'error'

  return (
    <div className="relative">
      <motion.button
        onClick={play}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        title={isPlaying ? 'Stop briefing' : 'Play daily voice briefing'}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold transition-all border',
          isPlaying
            ? 'bg-accent/10 border-accent/25 text-accent'
            : isError
            ? 'bg-danger/10 border-danger/25 text-danger'
            : 'bg-surface-raised border-border/60 text-text-secondary hover:text-text-primary hover:border-border-focus'
        )}
      >
        {isLoading ? (
          <Loader2 size={11} className="animate-spin" />
        ) : isPlaying ? (
          <WaveformIcon />
        ) : isError ? (
          <VolumeX size={11} />
        ) : (
          <Volume2 size={11} />
        )}

        <span>
          {isLoading ? 'Generating…' : isPlaying ? 'Stop' : isError ? 'Error' : 'Briefing'}
        </span>
      </motion.button>

      {/* Error tooltip */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute top-full right-0 mt-1.5 px-2.5 py-1.5 rounded-lg bg-surface-raised border border-border/60 text-2xs text-danger whitespace-nowrap z-50 shadow-lg"
          >
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
