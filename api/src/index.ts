import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'

import { BasesRouter, CarteraRouter, SellersRouter, recaudoRouter } from './routes'
import { routerResumen } from './routes/resumen.routes'
import { CARTERA_FRONTEND, PORT, VERSION } from './config'
import { conection } from './connections'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'

const app = express()

// ======== SEGURIDAD ========
// Helmet: headers de seguridad HTTP
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

// Rate limiting: máximo 200 requests por IP cada 15 minutos
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Demasiadas peticiones, intente más tarde' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use(limiter)

// ======== PERFORMANCE ========
// Compresión de respuestas
app.use(compression())

// ======== MIDDLEWARE BÁSICO ========
app.disable('x-powered-by')
  .use(express.json({ limit: '10mb' }))
  .use(morgan('combined'))
  .use(express.urlencoded({ extended: true }))
  .use(cors({
    origin: CARTERA_FRONTEND,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }))

// ======== HEALTH CHECK ========
app.get('/health', async (req, res) => {
  try {
    await conection.authenticate()
    res.status(200).json({
      status: 'ok',
      mysql: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  } catch (error) {
    res.status(503).json({ status: 'error', mysql: 'disconnected' })
  }
})

// ======== RUTAS ========
app.use(VERSION, CarteraRouter)
  .use(VERSION, BasesRouter)
  .use(VERSION, SellersRouter)
  .use(VERSION, routerResumen)
  .use(VERSION, recaudoRouter)

// ======== MANEJO DE ERRORES ========
app.use(notFoundHandler)
app.use(errorHandler)

// ======== SERVIDOR ========
const server = app.listen(PORT, () => {
  console.log(`[API] Server is running at http://localhost:${PORT}`)
  console.log(`[API] Version: ${VERSION}`)
  console.log(`[API] Health check: http://localhost:${PORT}/health`)
  console.log(`[API] Security: helmet, rate-limit (200/15min), compression enabled`)
})

// ======== GRACEFUL SHUTDOWN ========
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

