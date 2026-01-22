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
import { requestTimeout } from './middleware/requestTimeout'
import { getOraclePool } from './connections/oracledb'
import { getNaosPool } from './connections/oracledb.naos'

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

// ======== TIMEOUT HTTP ========
// Middleware que garantiza respuesta en 90 segundos máximo
app.use(requestTimeout(90000))

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

// ======== HEALTH CHECK (MySQL + Oracle AMBOS POOLS) ========
// Este endpoint es usado por Docker para determinar si el contenedor está saludable
// IMPORTANTE: Prueba AMBOS pools de Oracle (Main y Naos)
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  const status: Record<string, any> = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  let isHealthy = true;

  // Verificar MySQL
  try {
    await conection.authenticate();
    status.mysql = 'connected';
  } catch (error) {
    status.mysql = 'disconnected';
    isHealthy = false;
  }

  // Función helper para probar un pool
  async function testPool(getPoolFn: () => Promise<any>, poolName: string): Promise<{ success: boolean; info: any }> {
    try {
      const pool = await getPoolFn();
      const info: any = {
        connectionsOpen: pool.connectionsOpen,
        connectionsInUse: pool.connectionsInUse,
        poolMax: pool.poolMax,
      };

      // Intentar obtener conexión con timeout de 8 segundos
      const connection = await Promise.race([
        pool.getConnection(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('getConnection timeout 8s')), 8000)
        )
      ]) as any;

      // Hacer un ping rápido
      await Promise.race([
        connection.execute('SELECT 1 FROM DUAL'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('ping timeout')), 3000)
        )
      ]);

      await connection.close();
      info.connectionTest = 'ok';
      return { success: true, info };
    } catch (e) {
      console.error(`[HEALTH] ❌ ${poolName} falló:`, (e as Error).message);
      return {
        success: false,
        info: { connectionTest: 'failed', error: (e as Error).message }
      };
    }
  }

  // Probar AMBOS pools Oracle en paralelo
  const [mainResult, naosResult] = await Promise.all([
    testPool(getOraclePool, 'oracleMain'),
    testPool(getNaosPool, 'oracleNaos')
  ]);

  status.oracleMain = mainResult.info;
  status.oracleNaos = naosResult.info;

  // Si CUALQUIERA de los pools falla, marcar como no saludable
  if (!mainResult.success || !naosResult.success) {
    isHealthy = false;
  }

  status.status = isHealthy ? 'ok' : 'unhealthy';
  status.responseTime = `${Date.now() - startTime}ms`;

  // Si no es saludable, Docker reiniciará el contenedor
  res.status(isHealthy ? 200 : 503).json(status);
})

// ======== HEALTH CHECK ORACLE (para Docker) ========
// Endpoint específico que verifica Oracle con timeout estricto
app.get('/health/oracle', async (req, res) => {
  const timeout = 10000; // 10 segundos máximo

  try {
    const result = await Promise.race([
      (async () => {
        const pool = await getOraclePool();

        // Si el pool está agotado, fallar inmediatamente
        if (pool.connectionsInUse >= pool.poolMax) {
          throw new Error('Pool agotado');
        }

        // Intentar obtener una conexión con timeout
        const connection = await Promise.race([
          pool.getConnection(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('getConnection timeout')), 5000))
        ]) as any;

        // Hacer un ping rápido
        await Promise.race([
          connection.execute('SELECT 1 FROM DUAL'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('ping timeout')), 3000))
        ]);

        await connection.close();
        return { status: 'ok', pool: { open: pool.connectionsOpen, inUse: pool.connectionsInUse } };
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), timeout))
    ]);

    res.status(200).json(result);
  } catch (error) {
    console.error('[HEALTH/ORACLE] Falló:', (error as Error).message);
    res.status(503).json({ status: 'error', error: (error as Error).message });
  }
})

// ======== WATCHDOG: Auto-terminación si hay problemas irrecuperables ========
// Este watchdog PRUEBA la conexión real, no solo lee estadísticas del pool
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

async function testPoolConnection(getPoolFn: () => Promise<any>, poolName: string): Promise<boolean> {
  try {
    const pool = await getPoolFn();

    // Intentar obtener conexión con timeout de 5 segundos
    const connection = await Promise.race([
      pool.getConnection(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('getConnection timeout 5s')), 5000)
      )
    ]) as any;

    // Hacer ping rápido
    await Promise.race([
      connection.execute('SELECT 1 FROM DUAL'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('ping timeout')), 3000)
      )
    ]);

    await connection.close();
    return true;
  } catch (e) {
    console.error(`[WATCHDOG] ❌ ${poolName} falló:`, (e as Error).message);
    return false;
  }
}

setInterval(async () => {
  try {
    // Probar AMBOS pools
    const [mainOk, naosOk] = await Promise.all([
      testPoolConnection(getOraclePool, 'oracleMain'),
      testPoolConnection(getNaosPool, 'oracleNaos')
    ]);

    if (!mainOk || !naosOk) {
      consecutiveFailures++;
      console.warn(`[WATCHDOG] ⚠️ Fallo de pool (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);
      console.warn(`[WATCHDOG] oracleMain: ${mainOk ? 'OK' : 'FALLO'}, oracleNaos: ${naosOk ? 'OK' : 'FALLO'}`);

      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error('[WATCHDOG] 🔴 TERMINANDO PROCESO - Pools fallando por demasiado tiempo');
        console.error('[WATCHDOG] Docker reiniciará el contenedor automáticamente');

        // Dar tiempo para que los logs se escriban
        setTimeout(() => {
          process.exit(1);
        }, 1000);
      }
    } else {
      if (consecutiveFailures > 0) {
        console.log('[WATCHDOG] ✅ Pools recuperados');
      }
      consecutiveFailures = 0; // Reset si ambos pools funcionan
    }
  } catch (e) {
    console.error('[WATCHDOG] Error crítico:', (e as Error).message);
    consecutiveFailures++;
  }
}, 30000); // Verificar cada 30 segundos

// ======== DEBUG: POOL STATUS ========
app.get('/debug/pool-status', async (req, res) => {
  try {
    const pools: Record<string, any> = {};

    try {
      const mainPool = await getOraclePool();
      pools.oracleMain = {
        connectionsOpen: mainPool.connectionsOpen,
        connectionsInUse: mainPool.connectionsInUse,
        poolMax: mainPool.poolMax,
        poolMin: mainPool.poolMin,
        status: mainPool.status,
        isHealthy: mainPool.connectionsInUse < mainPool.poolMax,
        usage: `${Math.round((mainPool.connectionsInUse / mainPool.poolMax) * 100)}%`
      };
    } catch (e) {
      pools.oracleMain = { error: (e as Error).message };
    }

    try {
      const naosPool = await getNaosPool();
      pools.oracleNaos = {
        connectionsOpen: naosPool.connectionsOpen,
        connectionsInUse: naosPool.connectionsInUse,
        poolMax: naosPool.poolMax,
        poolMin: naosPool.poolMin,
        status: naosPool.status,
        isHealthy: naosPool.connectionsInUse < naosPool.poolMax,
        usage: `${Math.round((naosPool.connectionsInUse / naosPool.poolMax) * 100)}%`
      };
    } catch (e) {
      pools.oracleNaos = { error: (e as Error).message };
    }

    res.json({
      timestamp: new Date().toISOString(),
      consecutiveFailures,
      maxBeforeRestart: MAX_CONSECUTIVE_FAILURES,
      pools,
      warning: Object.values(pools).some((p: any) => p.connectionsInUse >= p.poolMax - 1)
        ? '⚠️ ALERTA: Uno o más pools están casi agotados!'
        : null
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
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
  console.log(`[API] Request timeout: 90s`)
})

// Configurar timeouts del servidor
server.timeout = 95000          // 95s - timeout general del servidor
server.keepAliveTimeout = 65000 // 65s - timeout para conexiones keep-alive

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

