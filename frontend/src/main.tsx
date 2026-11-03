import { createRoot } from 'react-dom/client'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root element was not found')
}

const root = createRoot(container)

root.render(<h1>Fight Me Bro</h1>)
