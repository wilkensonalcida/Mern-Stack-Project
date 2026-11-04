import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import 'bootstrap/dist/css/bootstrap.min.css'
import App from './App'

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root element was not found')
}

const root = createRoot(container)

root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
)
