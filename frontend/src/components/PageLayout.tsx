import type { ReactNode } from 'react'

type PageLayoutProps = {
  children: ReactNode
  // Wide pages, such as the host's lobby, are made for a desktop screen and start at the top of it.
  wide?: boolean
}

// Stacks a page's cards in one column, centered on the screen: full width on a phone, narrower on wider screens.
// Content taller than the screen starts at the top and scrolls.
export default function PageLayout({ children, wide = false }: PageLayoutProps) {
  const column = wide ? 'col-12 col-xl-10' : 'col-12 col-sm-9 col-md-7 col-lg-5 col-xl-4'
  const rows = wide ? 'py-4' : 'align-items-center min-vh-100 py-4'
  return (
    <main className="container">
      <div className={`row justify-content-center ${rows}`}>
        <div className={column}>{children}</div>
      </div>
    </main>
  )
}
