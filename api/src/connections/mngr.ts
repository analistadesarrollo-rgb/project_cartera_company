import { DB_ORACLE_DIR, DB_ORACLE_DIR_TNS, DB_ORACLE_NAME, DB_MNG_USER, DB_MNG_PASS } from '../config'
import oracledb, { Pool } from 'oracledb';

oracledb.initOracleClient({ libDir: DB_ORACLE_DIR });

// Singleton: pool Manager se crea una vez y se reutiliza
let mngrPool: Pool | null = null;

export async function getMngrPool(): Promise<Pool> {
  // Si el pool existe pero está cerrado, recrearlo
  if (mngrPool) {
    try {
      if (mngrPool.status === oracledb.POOL_STATUS_DRAINING ||
        mngrPool.status === oracledb.POOL_STATUS_CLOSED) {
        console.log('[Oracle] Pool Manager cerrado, recreando...');
        mngrPool = null;
      }
    } catch {
      mngrPool = null;
    }
  }

  if (!mngrPool) {
    console.log('[Oracle] Creando pool de conexiones Manager...');
    mngrPool = await oracledb.createPool({
      user: DB_MNG_USER,
      password: DB_MNG_PASS,
      configDir: DB_ORACLE_DIR_TNS,
      connectString: DB_ORACLE_NAME,
      poolAlias: 'oracleMngr',
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1,
      poolTimeout: 60,
      queueTimeout: 30000,
      poolPingInterval: 60,
    });
    console.log('[Oracle] Pool Manager creado exitosamente');
  }
  return mngrPool;
}

// Mantener función legacy por compatibilidad (deprecated)
/** @deprecated Use getMngrPool() instead */
export async function connMngrOra(): Promise<Pool | Error> {
  try {
    return await getMngrPool();
  } catch (error) {
    console.error('Error connecting to Oracle database', error);
    return error as Error;
  }
}
