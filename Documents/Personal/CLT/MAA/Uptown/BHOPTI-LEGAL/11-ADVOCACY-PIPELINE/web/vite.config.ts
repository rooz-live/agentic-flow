import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Custom plugin to serve campaign state JSON
const serveCampaignState = () => {
  return {
    name: 'serve-campaign-state',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url === '/api/state') {
          const statePath = path.resolve(__dirname, '../tracking/daily-send-state.json')
          if (fs.existsSync(statePath)) {
            const data = fs.readFileSync(statePath, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(data)
          } else {
            res.statusCode = 404
            res.end(JSON.stringify({ error: 'State file not found' }))
          }
        } else {
          next()
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serveCampaignState()],
})
