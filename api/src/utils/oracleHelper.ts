import { Connection, Result } from 'oracledb';

const DEFAULT_QUERY_TIMEOUT = 30000; // 30 segundos (reducido para respuesta más rápida)

/**
 * Ejecuta una query Oracle con timeout ACTIVO usando connection.break().
 * Si la query tarda más del timeout, CANCELA la query en Oracle y libera la conexión.
 */
export async function executeWithTimeout<T>(
    connection: Connection,
    sql: string,
    binds: any[] | Record<string, any> = [],
    options: { timeout?: number; fetchArraySize?: number } = {}
): Promise<Result<T>> {
    const timeout = options.timeout || DEFAULT_QUERY_TIMEOUT;

    let timeoutId: NodeJS.Timeout | undefined;
    let isTimedOut = false;
    let queryFinished = false;

    // Crear promise que cancelará activamente la query después del timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(async () => {
            if (queryFinished) return; // Query ya terminó, no hacer nada

            isTimedOut = true;
            console.error(`[Oracle] Query timeout después de ${timeout}ms - cancelando query...`);

            try {
                // CRÍTICO: break() cancela la query activa en Oracle
                await connection.break();
                console.log('[Oracle] Query cancelada exitosamente con break()');
            } catch (breakError) {
                console.error('[Oracle] Error al cancelar query:', breakError);
            }

            reject(new Error(`Query timeout: La consulta excedió ${timeout}ms y fue cancelada`));
        }, timeout);
    });

    try {
        const queryPromise = connection.execute<T>(sql, binds, {
            fetchArraySize: options.fetchArraySize || 100,
        });

        const result = await Promise.race([queryPromise, timeoutPromise]);
        queryFinished = true;

        return result;
    } catch (error) {
        // Si fue timeout, cerrar la conexión para liberarla al pool
        if (isTimedOut) {
            try {
                await connection.close();
                console.log('[Oracle] Conexión cerrada después de timeout');
            } catch (closeError) {
                console.error('[Oracle] Error cerrando conexión:', closeError);
            }
        }
        throw error;
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

/**
 * Wrapper seguro para obtener una conexión del pool con verificación rápida
 */
export async function getConnectionSafe(
    getPool: () => Promise<any>,
    poolName: string
): Promise<Connection> {
    const startTime = Date.now();

    try {
        const pool = await getPool();
        const connection = await pool.getConnection();

        // Ping rápido para verificar que la conexión funciona
        try {
            await Promise.race([
                connection.execute('SELECT 1 FROM DUAL'),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Ping timeout')), 5000)
                )
            ]);
        } catch (pingError) {
            console.error(`[Oracle] Conexión ${poolName} no responde, cerrando...`);
            try { await connection.close(); } catch { }
            throw new Error(`Conexión ${poolName} no está activa`);
        }

        const elapsed = Date.now() - startTime;
        if (elapsed > 1000) {
            console.warn(`[Oracle] Obtener conexión ${poolName} tardó ${elapsed}ms`);
        }

        return connection;
    } catch (error) {
        console.error(`[Oracle] Error obteniendo conexión de ${poolName}:`, error);
        throw error;
    }
}

/**
 * Ejecuta una query con reintentos automáticos
 */
export async function executeWithRetry<T>(
    connection: Connection,
    sql: string,
    binds: any[] | Record<string, any> = [],
    options: { timeout?: number; maxRetries?: number } = {}
): Promise<Result<T>> {
    const maxRetries = options.maxRetries || 2;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await executeWithTimeout<T>(connection, sql, binds, options);
        } catch (error) {
            lastError = error as Error;
            console.warn(`[Oracle] Intento ${attempt}/${maxRetries} falló:`, lastError.message);

            if (attempt < maxRetries) {
                // Esperar antes de reintentar (backoff exponencial)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    throw lastError;
}
