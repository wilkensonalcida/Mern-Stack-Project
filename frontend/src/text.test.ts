import { describe, expect, it } from 'vitest'
import { sentence } from './text'

describe('sentence', () => {
  it('adds a period to a message without closing punctuation', () => {
    expect(sentence('Invalid login or password')).toBe('Invalid login or password.')
  })

  it('leaves a message that already ends a sentence as it is', () => {
    expect(sentence('Lobby not found.')).toBe('Lobby not found.')
    expect(sentence('Try again!')).toBe('Try again!')
    expect(sentence('Checking…')).toBe('Checking…')
  })

  it('trims stray spaces before deciding', () => {
    expect(sentence(' Player name required ')).toBe('Player name required.')
  })
})
