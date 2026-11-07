import { useEffect, useRef, useState } from 'react'
// Imported from where Alex keeps her sprites, so the build includes the sheet, and a missing sheet fails the build.
import knightSheet from '../../sprites/playersheet.png'
import { Sprite } from './Sprite'

export type KnightAnimation = 'idle' | 'attack' | 'victory'

// Alex's knight sheet has 250 pixel frames, one animation per row.
const FRAME_SIZE = 250
const animations = {
  walk: { row: 0, frames: 4, fps: 4, loop: true },
  idle: { row: 1, frames: 4, fps: 4, loop: true },
  attack: { row: 2, frames: 6, fps: 4, loop: false },
  victory: { row: 3, frames: 2, fps: 4, loop: true },
}

type KnightProps = {
  animation: KnightAnimation
  // The sheet's knight faces right, so the knight on the right is mirrored to face the other.
  mirrored?: boolean
  label: string
}

// Draws one knight from Alex's sheet and plays the animation the fight asks for.
export default function Knight({ animation, mirrored = false, label }: KnightProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [sprite] = useState(() => new Sprite(knightSheet, FRAME_SIZE, FRAME_SIZE, animations))

  // An attack plays once, then the sprite goes back to idle on its own.
  useEffect(() => {
    sprite.setAnimation(animation)
  }, [sprite, animation])

  // Draws the knight on every screen refresh.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    let last = 0
    let frameId = 0
    const draw = (timestamp: number) => {
      // A tab in the background skips refreshes, so one step moves the animation on by 50 milliseconds at most.
      const elapsed = last ? Math.min(timestamp - last, 50) : 0
      last = timestamp
      sprite.update(elapsed)
      ctx.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE)
      sprite.draw(ctx, 0, 0)
      frameId = requestAnimationFrame(draw)
    }
    frameId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameId)
  }, [sprite])

  return (
    <canvas
      ref={canvasRef}
      width={FRAME_SIZE}
      height={FRAME_SIZE}
      role="img"
      aria-label={label}
      style={{ width: `min(${FRAME_SIZE}px, 40vw)`, aspectRatio: '1 / 1', transform: mirrored ? 'scaleX(-1)' : undefined }}
    />
  )
}
