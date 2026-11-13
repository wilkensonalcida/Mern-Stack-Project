import type { ReactNode } from 'react'
import '../game/Controller.css'

type PhoneMessageProps = {
  title: string
  children?: ReactNode
  // One way onward, such as a link back to /join.
  action?: ReactNode
  // Loading screens announce themselves politely, and errors at once.
  live?: 'status' | 'alert'
}

// A phone screen outside the game: the game's name on top, one message, and at most one way onward.
export default function PhoneMessage({ title, children, action, live }: PhoneMessageProps) {
  return (
    <div className="controller-page team-none">
      <main className="controller">
        <header className="controller-header">
          <span className="controller-team">Fight Me Bro</span>
        </header>
        <div className="phone-center" role={live}>
          <h1 className="phone-title">{title}</h1>
          {children && <p className="phone-body">{children}</p>}
        </div>
        {action && <div className="phone-actions">{action}</div>}
      </main>
    </div>
  )
}
