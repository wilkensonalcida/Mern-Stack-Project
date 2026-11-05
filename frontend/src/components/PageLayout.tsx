import type { ReactNode } from 'react'

// Stacks a page's cards in one column, centered on the screen: full width on a phone, narrower on wider screens.
// Content taller than the screen starts at the top and scrolls.
export default function PageLayout({ children }: { children: ReactNode }) {
  return (
    <main className="container">
      <div className="row justify-content-center align-items-center min-vh-100 py-4">
        <div className="col-12 col-sm-9 col-md-7 col-lg-5 col-xl-4">{children}</div>
      </div>
    </main>
  )
}
