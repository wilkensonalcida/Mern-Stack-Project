import { socket } from '../socket/socket'
export type Team = 'red' | 'blue'
export type Action = 'attack' | 'heal' | 'block'
export type Clicks = Record<Action, number>
export type Item = { name: string; slot: string; action: Action; multiplier: number; earnedStage: number }
export type Character = { hp: number; maxHp: number; enemyHp: number; buffs: Clicks; items: Item[] }
export type Participant = { id: string; name: string; team: Team | null; clicks: Clicks; roundClicks: Clicks; vote: Action | null }
export type Match = {
  code: string; status: 'lobby' | 'playing' | 'finished'; revision: number; createdAt: string;
  phase: 'lobby' | 'combat' | 'pause' | 'selection' | 'finished'; mode: 'npc' | 'pvp'; stage: number;
  round: number; deadline: number | null; startedAt: number | null; endedAt: number | null;
  players: Participant[]; characters: Partial<Record<Team, Character>>;
  result: { reason: string; winner: Team | null } | null;
}
export type Identity = { role: 'host' | 'player'; id?: string; seq?: number }
export type MatchReply = { match: Match; you: Identity }
export type Summary = Pick<Match, 'code' | 'status' | 'createdAt' | 'startedAt' | 'endedAt' | 'result'> & { playerCount: number }
export function loginToken() {
  return sessionStorage.getItem('token') || localStorage.getItem('token') || ''
}
export function guestToken(code: string, create = false) {
  const key = `match-guest:${code}`
  let token = sessionStorage.getItem(key)
  if (!token && create) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('')
    sessionStorage.setItem(key, token)
  }
  return token
}
export function command(event: string, data: unknown): Promise<MatchReply> {
  return new Promise((resolve, reject) => {
    if (!socket.connected) return reject(new Error('Disconnected. Wait for the connection to return.'))
    socket.timeout(10000).emit(event, data, (error: Error | null, response: MatchReply & { success: boolean; error?: string }) => {
      if (error) reject(new Error('Server did not confirm the action. Reconnect to check saved progress.'))
      else if (!response?.success) reject(new Error(response?.error || 'Request failed.'))
      else resolve(response)
    })
  })
}
async function request<T>(path: string): Promise<T> {
  const response = await fetch(`/api/matches${path}`, {
    headers: { Authorization: `Bearer ${loginToken()}` }, signal: AbortSignal.timeout(10000),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Unable to load match history.')
  return data
}
export const getHistory = (page: number) => request<{ matches: Summary[]; hasMore: boolean }>(`?page=${page}`)
export const getMatchHistory = (code: string) => request<MatchReply>(`/${encodeURIComponent(code)}`)
