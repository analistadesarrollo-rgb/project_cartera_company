import { DB_ORACLE_DIR, DB_ORACLE_DIR_TNS, DB_ORACLE_NAME, DB_ORACLE_PASS, DB_ORACLE_USER } from '../config'
import oracledb, { Pool } from 'oracledb';

oracledb.initOracleClient({ libDir: DB_ORACLE_DIR });

// Singleton: pool se crea una vez y se reutiliza
let oraclePool: Pool | null = null;

export async function getOraclePool(): Promise<Pool> {
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
      poolIncrement: 1
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
