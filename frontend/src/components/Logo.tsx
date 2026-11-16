import Knight from '../game/Knight'
import './Logo.css'

// The game's logo: Alex's knight beside the name, centered at the top of a page.
// No page shows it yet. PageLayout and JoinPage keep it commented out until a new logo is drawn,
// and the new logo replaces what's inside here.
export default function Logo() {
  return (
    <header className="logo">
      <Knight animation="idle" label="Fight Me Bro's knight" size="64px" />
      <p className="logo-name">Fight Me Bro</p>
    </header>
  )
}
