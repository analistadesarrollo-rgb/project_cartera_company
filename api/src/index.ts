import express from 'express'
import morgan from 'morgan'
import cors from 'cors'

import { BasesRouter, CarteraRouter, SellersRouter, recaudoRouter } from './routes'
import { routerResumen } from './routes/resumen.routes'
import { CARTERA_FRONTEND, PORT, VERSION } from './config'
import { conection } from './connections'

const app = express()

app.disable('x-powered-by')
  .use(express.json())
  .use(morgan('dev'))
  .use(express.urlencoded({ extended: true }))
  .use(cors({
    origin: CARTERA_FRONTEND,
    credentials: true,
  }))

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await conection.authenticate()
    res.status(200).json({ status: 'ok', mysql: 'connected', timestamp: new Date().toISOString() })
  } catch (error) {
    res.status(503).json({ status: 'error', mysql: 'disconnected', error: String(error) })
  }
})

app.use(VERSION, CarteraRouter)
  .use(VERSION, BasesRouter)
  .use(VERSION, SellersRouter)
  .use(VERSION, routerResumen)
  .use(VERSION, recaudoRouter)

const server = app.listen(PORT, () => {
  console.log(`[API] Server is running at http://localhost:${PORT}`)
  console.log(`[API] Version: ${VERSION}`)
  console.log(`[API] Health check: http://localhost:${PORT}/health`)
})

// Graceful shutdown - cerrar conexiones correctamente
const gracefulShutdown = async (signal: string) => {
  console.log(`[API] ${signal} recibido. Cerrando conexiones...`)

  server.close(async () => {
    try {
      await conection.close()
      console.log('[MySQL] Conexión cerrada correctamente')
    } catch (error) {
      console.error('[MySQL] Error al cerrar conexión:', error)
    }
    process.exit(0)
  })

  // Si no cierra en 10s, forzar salida
  setTimeout(() => {
    console.error('[API] Forzando cierre después de timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
