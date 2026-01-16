import { Connection, Result, Pool } from 'oracledb';

const DEFAULT_QUERY_TIMEOUT = 60000; // 60 segundos
const CONNECTION_TIMEOUT = 15000;    // 15 segundos para obtener conexión

/**
 * Resultado de executeWithTimeout incluyendo flag de conexión cerrada
 */
export interface ExecuteResult<T> {
    result: Result<T>;
    connectionClosed: boolean;
}

/**
 * Genera un ID único para rastrear operaciones en logs
 */
function generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Ejecuta una query Oracle con timeout AGRESIVO.
 * Si la query tarda más del timeout, CANCELA la query y cierra la conexión SIN ESPERAR.
 */
export async function executeWithTimeout<T>(
    connection: Connection,
    sql: string,
    binds: any[] | Record<string, any> = [],
    options: { timeout?: number; fetchArraySize?: number; requestId?: string } = {}
): Promise<ExecuteResult<T>> {
    const timeout = options.timeout || DEFAULT_QUERY_TIMEOUT;
    const requestId = options.requestId || generateRequestId();

    let timeoutId: NodeJS.Timeout | undefined;
    let isTimedOut = false;
    let queryFinished = false;
    let connectionClosed = false;

    console.log(`[${requestId}] Ejecutando query con timeout de ${timeout}ms`);

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            if (queryFinished) return;

            isTimedOut = true;
            console.error(`[${requestId}] Query timeout después de ${timeout}ms - cancelando...`);

            // NO esperar a break() ni close() - hacerlo en background
            // Esto es crítico: si break() cuelga, no queremos quedarnos esperando
            setImmediate(async () => {
                try {
                    await Promise.race([
                        connection.break(),
                        new Promise((_, rej) => setTimeout(() => rej(new Error('break timeout')), 5000))
                    ]);
                    console.log(`[${requestId}] break() ejecutado`);
                } catch (e) {
                    console.error(`[${requestId}] break() falló o timeout:`, e);
                }

                try {
                    // Cerrar conexión sin esperar - marcar como dañada para que el pool no la reutilice
                    await Promise.race([
                        connection.close({ drop: true }),
                        new Promise((_, rej) => setTimeout(() => rej(new Error('close timeout')), 5000))
                    ]);
                    console.log(`[${requestId}] Conexión cerrada y descartada`);
                } catch (e) {
                    console.error(`[${requestId}] close() falló:`, e);
                }
            });

            reject(new Error(`Query timeout: La consulta excedió ${timeout}ms y fue cancelada`));
        }, timeout);
    });

    try {
        const queryPromise = connection.execute<T>(sql, binds, {
            fetchArraySize: options.fetchArraySize || 100,
        });

        const result = await Promise.race([queryPromise, timeoutPromise]);
        queryFinished = true;
        console.log(`[${requestId}] Query completada exitosamente`);

        return { result, connectionClosed: false };
    } catch (error) {
        if (isTimedOut) {
            connectionClosed = true; // Marcamos como cerrada porque se cerrará en background
        }
        const enhancedError = error as Error & { connectionClosed?: boolean };
        enhancedError.connectionClosed = connectionClosed;
        throw enhancedError;
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

/**
 * Wrapper seguro para obtener una conexión del pool CON TIMEOUT EXPLÍCITO.
 * Esto es crítico: si el pool está agotado, no esperar indefinidamente.
 */
export async function getConnectionSafe(
    getPool: () => Promise<Pool>,
    poolName: string,
    timeoutMs: number = CONNECTION_TIMEOUT
): Promise<{ connection: Connection; requestId: string }> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    console.log(`[${requestId}] Obteniendo conexión de pool ${poolName}...`);

    let pool: Pool;
    try {
        pool = await getPool();

        // Log estado del pool para diagnóstico
        console.log(`[${requestId}] Pool status: open=${pool.connectionsOpen}, inUse=${pool.connectionsInUse}, max=${pool.poolMax}`);

        // ALERTA si el pool está casi agotado
        if (pool.connectionsInUse >= pool.poolMax - 1) {
            console.warn(`[${requestId}] ⚠️ ALERTA: Pool casi agotado! ${pool.connectionsInUse}/${pool.poolMax} en uso`);
        }
    } catch (poolError) {
        console.error(`[${requestId}] Error obteniendo pool:`, poolError);
        throw poolError;
    }

    // Timeout EXPLÍCITO para getConnection
    let connection: Connection;
    try {
        const connectionPromise = pool.getConnection();
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Timeout de ${timeoutMs}ms obteniendo conexión - pool posiblemente agotado`));
            }, timeoutMs);
        });

        connection = await Promise.race([connectionPromise, timeoutPromise]);
    } catch (connError) {
        console.error(`[${requestId}] Error/timeout obteniendo conexión:`, connError);
        throw connError;
    }

    // Ping rápido para verificar que la conexión funciona
    try {
        await Promise.race([
            connection.execute('SELECT 1 FROM DUAL'),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Ping timeout')), 5000)
            )
        ]);
    } catch (pingError) {
        console.error(`[${requestId}] Conexión no responde al ping, descartando...`);
        try {
            await connection.close({ drop: true });
        } catch { }
        throw new Error(`Conexión ${poolName} no está activa`);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[${requestId}] Conexión obtenida en ${elapsed}ms`);
    if (elapsed > 2000) {
        console.warn(`[${requestId}] ⚠️ Obtener conexión tardó demasiado: ${elapsed}ms`);
    }

    return { connection, requestId };
}

/**
 * Ejecuta una query con reintentos automáticos
 */
export async function executeWithRetry<T>(
    connection: Connection,
    sql: string,
    binds: any[] | Record<string, any> = [],
    options: { timeout?: number; maxRetries?: number; requestId?: string } = {}
): Promise<ExecuteResult<T>> {
    const maxRetries = options.maxRetries || 2;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await executeWithTimeout<T>(connection, sql, binds, options);
        } catch (error) {
            lastError = error as Error;
            console.warn(`[Oracle] Intento ${attempt}/${maxRetries} falló:`, lastError.message);

            if (attempt < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    throw lastError;
}
