'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

interface ParallaxImageProps {
  src: string
  alt: string
  sizes?: string
  /**
   * Max vertical drift as a percentage of card height (default 12).
   * The inner image is oversized by `strength + 2`% on each side, so the
   * drift never reveals the image edges.
   */
  strength?: number
}

/**
 * Fill-image for an `overflow-hidden` card that drifts subtly against scroll:
 * the card moves at normal scroll speed while the image inside lags slightly,
 * creating a gentle depth (parallax) effect. Static under reduced motion.
 */
export function ParallaxImage({ src, alt, sizes, strength = 12 }: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()

  // 0 when the card enters the viewport bottom, 1 when it leaves the top.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], [`-${strength}%`, `${strength}%`])

  if (reduce) {
    return <Image src={src} alt={alt} fill className="object-cover" sizes={sizes} />
  }

  const overscan = strength + 2

  return (
    // rounded-[inherit] + isolate: a GPU-promoted (will-change-transform) child
    // can escape the parent card's border-radius clip; clipping here with the
    // card's own radius keeps the corners rounded in all browsers.
    <div ref={ref} className="absolute inset-0 overflow-hidden rounded-[inherit] isolate">
      <motion.div
        style={{ y, top: `-${overscan}%`, bottom: `-${overscan}%` }}
        className="absolute inset-x-0 will-change-transform"
      >
        <Image src={src} alt={alt} fill className="object-cover" sizes={sizes} />
      </motion.div>
    </div>
  )
}
