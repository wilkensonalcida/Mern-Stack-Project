// Alex's Sprite class from her prototype (gameplay.js), ported to TypeScript as is.
// It steps through a sprite sheet that holds one animation per row.

export type SpriteAnimation = {
  row: number
  frames: number
  fps: number
  // An animation that doesn't loop goes back to idle when it ends.
  loop: boolean
}

export class Sprite {
  image: HTMLImageElement
  frameWidth: number
  frameHeight: number
  animations: Record<string, SpriteAnimation>
  currentAnimation = 'idle'
  frame = 0
  elapsedTime = 0

  constructor(imageSrc: string, frameWidth: number, frameHeight: number, animations: Record<string, SpriteAnimation>) {
    this.image = new Image()
    this.image.src = imageSrc
    this.frameWidth = frameWidth
    this.frameHeight = frameHeight
    this.animations = animations
  }

  setAnimation(name: string) {
    if (!this.animations[name]) return
    if (this.currentAnimation === name) return
    this.currentAnimation = name
    this.frame = 0
    this.elapsedTime = 0
  }

  // Moves the animation on by `time` milliseconds.
  update(time: number) {
    const animation = this.animations[this.currentAnimation]
    this.elapsedTime += time
    const frameDuration = 1000 / animation.fps
    while (this.elapsedTime >= frameDuration) {
      this.elapsedTime -= frameDuration
      this.frame++
      if (this.frame >= animation.frames) {
        if (animation.loop === false) {
          this.setAnimation('idle')
          break
        } else {
          this.frame = 0
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
    if (!this.image.complete || !this.image.naturalWidth) return
    const animation = this.animations[this.currentAnimation]

    const srcX = this.frame * this.frameWidth
    const srcY = animation.row * this.frameHeight
    if (srcX + this.frameWidth > this.image.width || srcY + this.frameHeight > this.image.height) {
      console.warn(`Frame outside sprite sheet: ${this.currentAnimation}`, this.frame, srcX, srcY)
      return
    }
    ctx.drawImage(this.image, srcX, srcY, this.frameWidth, this.frameHeight, x, y, this.frameWidth * scale, this.frameHeight * scale)
  }
}
