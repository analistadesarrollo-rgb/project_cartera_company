import { Connection, Result } from 'oracledb';

const DEFAULT_QUERY_TIMEOUT = 60000; // 60 segundos

/**
 * Ejecuta una query Oracle con timeout.
 * Si la query tarda más del timeout, lanza un error y cierra la conexión.
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

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            isTimedOut = true;
            console.error(`[Oracle] Query timeout después de ${timeout}ms`);
            reject(new Error(`Query timeout: La consulta excedió ${timeout}ms`));
        }, timeout);
    });

    try {
        const result = await Promise.race([
            connection.execute<T>(sql, binds, {
                fetchArraySize: options.fetchArraySize || 100,
            }),
            timeoutPromise
        ]);

        return result;
    } catch (error) {
        // Si fue timeout, intentar cerrar la conexión de forma forzada
        if (isTimedOut) {
            try {
                await connection.close();
                console.log('[Oracle] Conexión cerrada después de timeout');
            } catch (closeError) {
                console.error('[Oracle] Error cerrando conexión después de timeout:', closeError);
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
 * Wrapper seguro para obtener una conexión del pool con verificación
 */
export async function getConnectionSafe(
    getPool: () => Promise<any>,
    poolName: string
): Promise<Connection> {
    try {
        const pool = await getPool();
        const connection = await pool.getConnection();

        // Verificar que la conexión está activa con una query simple
        try {
            await connection.execute('SELECT 1 FROM DUAL');
        } catch (pingError) {
            console.error(`[Oracle] Conexión ${poolName} no responde, cerrando...`);
            try { await connection.close(); } catch { }
            throw new Error(`Conexión ${poolName} no está activa`);
        }

        return connection;
    } catch (error) {
        console.error(`[Oracle] Error obteniendo conexión de ${poolName}:`, error);
        throw error;
    }
}
