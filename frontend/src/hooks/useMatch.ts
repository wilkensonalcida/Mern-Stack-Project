import { useCallback, useEffect, useRef, useState } from 'react'
import { command, guestToken, loginToken, type Match, type MatchReply, type Identity } from '../api/matches'
import { socket } from '../socket/socket'

export function useMatch(code: string, host: boolean) {
  const [match, setMatch] = useState<Match | null>(null)
  const [you, setYou] = useState<Identity | null>(null)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(socket.connected)
  const [ready, setReady] = useState(false)
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  const sequence = useRef(0)
  const generation = useRef(0)
  const [retry, setRetry] = useState(0)
  const accept = useCallback((reply: MatchReply, expectedGeneration: number) => {
    if (generation.current !== expectedGeneration || reply.match.code !== code) return
    setMatch(old => !old || reply.match.revision >= old.revision ? reply.match : old)
    setYou(reply.you)
    sequence.current = reply.you.seq || 0
  }, [code])
  useEffect(() => {
    let active = true
    ++generation.current
    busy.current = false; sequence.current = 0
    setMatch(null); setYou(null); setReady(false); setPending(false)
    async function resume() {
      const current = ++generation.current
      busy.current = false; setPending(false); setConnected(true); setReady(false)
      try {
        const credentials = host ? { token: loginToken() } : { guestToken: guestToken(code) }
        const reply = await command('game:resume', { code, ...credentials })
        if (!active || generation.current !== current) return
        accept(reply, current); setReady(true); setError('')
      } catch (e) { if (active && generation.current === current) setError((e as Error).message) }
    }
    function update(next: Match) {
      if (active && next.code === code) setMatch(old => !old || next.revision >= old.revision ? next : old)
    }
    function disconnect() { ++generation.current; busy.current = false; setPending(false); setConnected(false); setReady(false) }
    socket.on('connect', resume); socket.on('disconnect', disconnect); socket.on('game:updated', update)
    if (socket.connected) void resume(); else socket.connect()
    return () => { active = false; ++generation.current; socket.off('connect', resume); socket.off('disconnect', disconnect); socket.off('game:updated', update) }
  }, [code, host, retry, accept])
  async function send(event: string, data: Record<string, unknown> = {}) {
    if (busy.current || !ready) return
    const current = generation.current
    busy.current = true; setPending(true); setError('')
    try {
      const payload = event === 'game:tap' ? { ...data, code, seq: sequence.current + 1 } : { ...data, code }
      accept(await command(event, payload), current)
    } catch (e) {
      if (generation.current === current) { setError((e as Error).message); setReady(false); setRetry(v => v + 1) }
    } finally { if (generation.current === current) { busy.current = false; setPending(false) } }
  }
  return { match, you, error, connected, ready, pending, send, reconnect: () => setRetry(v => v + 1) }
}
