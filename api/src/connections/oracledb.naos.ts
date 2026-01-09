import { DB_ORACLE_DIR, DB_ORACLE_DIR_TNS, DB_ORACLE_NAME_NAOS, DB_ORACLE_PASS, DB_ORACLE_USER } from '../config'
import oracledb, { Pool } from 'oracledb';

oracledb.initOracleClient({ libDir: DB_ORACLE_DIR });

// Singleton: pool NAOS se crea una vez y se reutiliza
let naosPool: Pool | null = null;

export async function getNaosPool(): Promise<Pool> {
  if (!naosPool) {
    console.log('[Oracle] Creando pool de conexiones NAOS...');
    naosPool = await oracledb.createPool({
      user: DB_ORACLE_USER,
      password: DB_ORACLE_PASS,
      configDir: DB_ORACLE_DIR_TNS,
      connectString: DB_ORACLE_NAME_NAOS,
      poolAlias: 'oracleNaos',
      poolMin: 2,
      poolMax: 10,
      poolIncrement: 1
    });
    console.log('[Oracle] Pool NAOS creado exitosamente');
  }
  return naosPool;
}

// Mantener función legacy por compatibilidad (deprecated)
/** @deprecated Use getNaosPool() instead */
export async function connOracle_naos(): Promise<Pool | Error> {
  try {
    return await getNaosPool();
  } catch (error) {
    console.error('Error connecting to Oracle database', error);
    return error as Error;
  }
}
