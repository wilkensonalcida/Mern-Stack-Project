import { createRoot } from 'react-dom/client'
import LoginPage from './pages/LoginPage'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root element was not found')
}

const root = createRoot(container)

root.render(<LoginPage />)
