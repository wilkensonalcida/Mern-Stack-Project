import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  // The API takes its port from backend/.env, so the dev server reads the same file.
  // Builds skip it, since only the dev server forwards /api.
  const backendEnv: Record<string, string> =
    command === 'serve' ? loadEnv(mode, '../backend', 'PORT') : {}

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': `http://127.0.0.1:${backendEnv.PORT || 5001}`,
      },
    },
  }
})
