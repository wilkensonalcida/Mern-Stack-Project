import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { socket } from '../socket/socket'
import PhoneMessage from '../components/PhoneMessage'
import { sentence } from '../text'
// The logo is off until a new one is drawn. When it lands, put this import and both <Logo /> lines back.
// import Logo from '../components/Logo'
import '../game/Controller.css'
import type { LobbyResponse } from '../socket/lobby'

type CheckResponse = { success: boolean; code?: string; error?: string }
type CheckResult = { success: true } | { success: false; error: string }

// Errors that mean the code no longer names an open lobby, which send a phone back to the code step.
const codeErrors = ['Lobby not found', 'Game already started']
// The server's reasons, in the join screen's own words, with what to do next.
const friendlyErrors: Record<string, string> = {
  'Lobby not found': 'No game has that code. Check the code on the big screen.',
  'Game already started': 'That game already started. Join the next one.',
}
const friendly = (message: string) => friendlyErrors[message] ?? sentence(message)

// Sends a request once the socket is connected, connecting it first when it isn't.
function whenConnected(send: () => void, fail: () => void) {
  if (socket.connected) {
    send()
    return
  }
  const onConnect = () => {
    socket.off('connect_error', onError)
    send()
  }
  const onError = () => {
    socket.off('connect', onConnect)
    fail()
  }
  socket.once('connect', onConnect)
  socket.once('connect_error', onError)
  socket.connect()
}

// Asks the server whether a code names a lobby that's still open, without joining it.
function checkCode(sessionCode: string, done: (result: CheckResult) => void) {
  whenConnected(
    () => socket.timeout(5000).emit('game:check', { code: sessionCode }, (err: Error | null, response: CheckResponse) => {
      if (err) done({ success: false, error: 'Server not responding.' })
      else if (response?.success) done({ success: true })
      else done({ success: false, error: response?.error || 'Lobby not found' })
    }),
    () => done({ success: false, error: 'Unable to connect to server.' }),
  )
}

// Joining takes two steps: the game code, which the server checks, then a nickname, at /join?code=<code>.
// The host's QR code links straight to the second step.
export default function JoinPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const linkedCode = (searchParams.get('code') ?? '').trim().toUpperCase().slice(0, 6)
  // The first step checks the code before it moves here, so this page doesn't check it twice.
  const handedOver = (location.state as { checked?: string } | null)?.checked

  const [code, setCode] = useState(linkedCode)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checked, setChecked] = useState(handedOver ?? '')

  const onNicknameStep = Boolean(linkedCode) && (checked === linkedCode || handedOver === linkedCode)

  // A code the server turns down goes back to the code step, filled in, with the server's reason,
  // and leaves the address so the step can't check it again.
  const refuse = useCallback((sessionCode: string, message: string) => {
    setCode(sessionCode)
    setError(friendly(message))
    navigate('/join', { replace: true })
  }, [navigate])

  useEffect(() => {
    if (!linkedCode || checked === linkedCode || handedOver === linkedCode) return
    let live = true
    checkCode(linkedCode, (result) => {
      if (!live) return
      if (result.success) setChecked(linkedCode)
      else refuse(linkedCode, result.error)
    })
    return () => {
      live = false
    }
  }, [linkedCode, checked, handedOver, refuse])

  function submitCode(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const sessionCode = code.trim().toUpperCase()
    if (busy || sessionCode.length !== 6) return

    setBusy(true)
    setError('')
    checkCode(sessionCode, (result) => {
      setBusy(false)
      if (!result.success) {
        setError(friendly(result.error))
        return
      }
      setChecked(sessionCode)
      navigate(`/join?code=${sessionCode}`, { state: { checked: sessionCode } })
    })
  }

  function joinLobby(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const nickname = name.trim()
    if (busy || !nickname) return

    setBusy(true)
    setError('')
    whenConnected(
      () => socket.timeout(5000).emit(
        'game:join',
        { code: linkedCode, name: nickname },
        (err: Error | null, response: LobbyResponse) => {
          setBusy(false)
          if (err) {
            setError('Server not responding.')
            return
          }
          if (!response?.success || !response.lobby) {
            const message = response?.error || 'Unable to join the game.'
            // A lobby that closed or started since the check sends the phone back for another code.
            if (codeErrors.includes(message)) refuse(linkedCode, message)
            else setError(friendly(message))
            return
          }
          navigate(`/lobby/${response.lobby.code}`, { state: { rejoinKey: response.rejoinKey } })
        },
      ),
      () => {
        setBusy(false)
        setError('Unable to connect to server.')
      },
    )
  }

  if (linkedCode && !onNicknameStep) {
    return <PhoneMessage title="Checking the code…" live="status" />
  }

  if (onNicknameStep) {
    return (
      <div className="controller-page team-none is-form">
        <main className="controller">
          {/* <Logo /> */}
          <h1 className="phone-heading" id="nickname-heading">Pick a nickname</h1>
          <p className="phone-note">Game code <span className="phone-code">{linkedCode}</span></p>
          <form className="phone-form" onSubmit={joinLobby} aria-labelledby="nickname-heading">
            <input
              id="nickname"
              className="phone-input"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError('')
              }}
              maxLength={20}
              required
              disabled={busy}
              placeholder="Your nickname"
              aria-labelledby="nickname-heading"
              autoFocus
            />
            <button className="phone-button" type="submit" disabled={busy || !name.trim()}>{busy ? 'Joining…' : 'Join'}</button>
          </form>
          {error && <p className="phone-error" role="alert">{error}</p>}
          <p className="phone-switch">
            <Link to="/join" onClick={() => { setCode(''); setError('') }}>Enter a different code</Link>
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="controller-page team-none is-form">
      <main className="controller">
        {/* <Logo /> */}
        <h1 className="phone-heading" id="join-heading">Join a game</h1>
        <form className="phone-form" onSubmit={submitCode} aria-labelledby="join-heading">
          <label htmlFor="session-code" className="phone-label">Game code</label>
          <input
            className="phone-input is-code"
            type="text"
            id="session-code"
            name="sessionCode"
            placeholder="6 letters and numbers"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={6}
            value={code}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase())
              setError('')
            }}
            required
            autoFocus
            disabled={busy}
          />
          <button className="phone-button" type="submit" disabled={busy || code.trim().length !== 6}>{busy ? 'Checking…' : 'Next'}</button>
        </form>
        {error && <p className="phone-error" role="alert">{error}</p>}
      </main>
    </div>
  )
}
