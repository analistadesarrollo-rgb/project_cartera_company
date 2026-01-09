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

app.listen(PORT, () => {
  console.log(`[API] Server is running at http://localhost:${PORT}`)
  console.log(`[API] Version: ${VERSION}`)
  console.log(`[API] Health check: http://localhost:${PORT}/health`)
})
