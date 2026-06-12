'use client'

import { motion, useReducedMotion, type Transition } from 'framer-motion'
import { UserPlus, Settings, Sparkles, Rocket, type LucideIcon } from 'lucide-react'

export type StepVariant = 'selection' | 'initiation' | 'expert' | 'fulfillment'

const ICONS: Record<StepVariant, LucideIcon> = {
  selection: UserPlus,
  initiation: Settings,
  expert: Sparkles,
  fulfillment: Rocket,
}

/**
 * Per-step idle micro-animation. Each loops gently with a rest between cycles,
 * offset by the step index so the icons never move in unison.
 */
const IDLE: Record<StepVariant, { animate: Record<string, number[]>; transition: Transition }> = {
  // A friendly "nod" — welcoming, like greeting a new client.
  selection: {
    animate: { rotate: [0, -10, 8, -4, 0] },
    transition: { duration: 0.9, ease: 'easeInOut', repeat: Infinity, repeatDelay: 3.4 },
  },
  // The gear turns a half revolution, then rests.
  initiation: {
    animate: { rotate: [0, 180] },
    transition: { duration: 1.1, ease: [0.45, 0, 0.25, 1], repeat: Infinity, repeatDelay: 2.8 },
  },
  // A twinkle — quick scale + tilt shimmer.
  expert: {
    animate: { scale: [1, 1.18, 0.94, 1.06, 1], rotate: [0, 6, -5, 2, 0] },
    transition: { duration: 1.0, ease: 'easeInOut', repeat: Infinity, repeatDelay: 3.0 },
  },
  // A weightless float, with the slightest banking tilt.
  fulfillment: {
    animate: { y: [0, -4, 0], rotate: [0, 2, -2, 0] },
    transition: { duration: 2.6, ease: 'easeInOut', repeat: Infinity },
  },
}

interface StepIconProps {
  variant: StepVariant
  /** Tailwind bg class for the tile, e.g. 'bg-blue-50'. */
  bg: string
  /** Step number shown in the badge. */
  n: number
}

/**
 * Animated icon tile for a process step: idle icon motion, spring badge pop-in
 * on scroll, hover lift. Falls back to a static tile under reduced motion.
 */
export function StepIcon({ variant, bg, n }: StepIconProps) {
  const reduce = useReducedMotion()
  const Icon = ICONS[variant]
  const idle = IDLE[variant]

  const tile = (
    <div
      className={`w-14 h-14 md:w-[88px] md:h-[88px] rounded-2xl md:rounded-3xl ${bg} flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]`}
    >
      {reduce ? (
        <Icon className="w-5 h-5 md:w-8 md:h-8 text-[#0B0B1A]" strokeWidth={1.5} />
      ) : (
        <motion.span
          className="inline-flex"
          animate={idle.animate}
          transition={{ ...idle.transition, delay: n * 0.45 }}
        >
          <Icon className="w-5 h-5 md:w-8 md:h-8 text-[#0B0B1A]" strokeWidth={1.5} />
        </motion.span>
      )}
    </div>
  )

  const badge = (
    <div className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 w-5 h-5 md:w-7 md:h-7 bg-[#0B0B1A] rounded-full flex items-center justify-center text-white text-[10px] md:text-xs font-bold border-2 border-white shadow-sm">
      {n}
    </div>
  )

  if (reduce) {
    return (
      <span className="relative inline-flex self-start">
        {tile}
        {badge}
      </span>
    )
  }

  return (
    <span className="relative inline-flex self-start">
      {tile}
      <motion.span
        className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2"
        initial={{ scale: 0, rotate: -90 }}
        whileInView={{ scale: 1, rotate: 0 }}
        viewport={{ once: true, margin: '0px 0px -60px 0px' }}
        transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.25 + n * 0.12 }}
      >
        <div className="w-5 h-5 md:w-7 md:h-7 bg-[#0B0B1A] rounded-full flex items-center justify-center text-white text-[10px] md:text-xs font-bold border-2 border-white shadow-sm">
          {n}
        </div>
      </motion.span>
    </span>
  )
}

/** The horizontal connector line, drawn left → right as the section scrolls in. */
export function StepConnector({ className = '' }: { className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={`${className} bg-gray-100`} />

  return (
    <motion.div
      className={`${className} bg-gray-200 origin-left`}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ duration: 1.4, ease: [0.22, 0.61, 0.36, 1], delay: 0.3 }}
    />
  )
}
