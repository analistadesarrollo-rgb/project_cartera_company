import { DB_ORACLE_DIR, DB_ORACLE_DIR_TNS, DB_ORACLE_NAME, DB_ORACLE_PASS, DB_ORACLE_USER } from '../config'
import oracledb, { Pool } from 'oracledb';

oracledb.initOracleClient({ libDir: DB_ORACLE_DIR });

// Configuración global de timeout para queries (30 segundos)
oracledb.fetchAsString = [oracledb.CLOB];

// Singleton: pool se crea una vez y se reutiliza
let oraclePool: Pool | null = null;

export async function getOraclePool(): Promise<Pool> {
  // Si el pool existe pero está cerrado, recrearlo
  if (oraclePool) {
    try {
      // Verificar si el pool sigue activo
      if (oraclePool.status === oracledb.POOL_STATUS_DRAINING ||
        oraclePool.status === oracledb.POOL_STATUS_CLOSED) {
        console.log('[Oracle] Pool cerrado, recreando...');
        oraclePool = null;
      }
    } catch {
      oraclePool = null;
    }
  }

  if (!oraclePool) {
    console.log('[Oracle] Creando pool de conexiones principal...');
    oraclePool = await oracledb.createPool({
      user: DB_ORACLE_USER,
      password: DB_ORACLE_PASS,
      configDir: DB_ORACLE_DIR_TNS,
      connectString: DB_ORACLE_NAME,
      poolAlias: 'oracleMain',
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1,
      poolTimeout: 60,           // Cerrar conexiones inactivas después de 60s
      queueTimeout: 30000,       // Timeout de 30s esperando conexión disponible
      poolPingInterval: 60,      // Verificar conexiones cada 60s
    });
    console.log('[Oracle] Pool principal creado exitosamente');
  }
  return oraclePool;
}

// Mantener función legacy por compatibilidad (deprecated)
/** @deprecated Use getOraclePool() instead */
export async function connOracle(): Promise<Pool | Error> {
  try {
    return await getOraclePool();
  } catch (error) {
    console.error('Error connecting to Oracle database', error);
    return error as Error;
  }
}
