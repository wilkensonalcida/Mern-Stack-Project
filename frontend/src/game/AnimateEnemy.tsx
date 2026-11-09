import { useEffect, useRef, useState } from 'react'
import { Sprite } from './Sprite'

export type EnemyAnimation = 'idle' | 'attack' | 'hit'
type Props = { sheet: string; frameSize: number; animation: EnemyAnimation; label: string; mirrored?: boolean }

// Exactly the same canvas + Sprite lifecycle used by Knight.tsx.
export default function AnimatedEnemy({ sheet, frameSize, animation, label, mirrored = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [sprite] = useState(() => new Sprite(sheet, frameSize, frameSize, {
    idle: { row: 0, frames: 3, fps: 4, loop: true },
    hit: { row: 1, frames: 4, fps: 4, loop: false },
    attack: { row: 2, frames: 4, fps: 4, loop: false },
  }))
  useEffect(() => { sprite.setAnimation(animation) }, [animation, sprite])
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    let frame = 0
    let last = 0
    const draw = (timestamp: number) => {
      const dt = last ? Math.min(timestamp - last, 50) : 0
      last = timestamp
      sprite.update(dt)
      ctx.clearRect(0, 0, frameSize, frameSize)
      sprite.draw(ctx, 0, 0)
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [sprite, frameSize])
  return <canvas ref={canvasRef} width={frameSize} height={frameSize} role="img" aria-label={label}
    style={{ width: `min(250px, 40vw)`, aspectRatio: '1 / 1', transform: mirrored ? 'scaleX(-1)' : undefined }} />
}
