import { getNaosPool } from '../connections/oracledb.naos';
import { executeWithTimeout, getConnectionSafe } from '../utils/oracleHelper';
import { RowType } from '../types/interface';
import { Connection } from 'oracledb';

/**
 * Ejecuta la consulta de recaudo con timeouts robustos.
 * Ahora incluye logging extensivo para diagnóstico.
 */
export async function reportRecaudo(fecha1: string, fecha2: string, zona: string) {
  let connection: Connection | undefined;
  let connectionClosedByTimeout = false;
  let requestId = '';

  try {
    // Obtener conexión con timeout explícito de 15 segundos
    const connResult = await getConnectionSafe(getNaosPool, 'oracleNaos');
    connection = connResult.connection;
    requestId = connResult.requestId;

    console.log(`[${requestId}] Ejecutando reportRecaudo para zona ${zona}`);

    // Ejecutar con timeout de 60 segundos - usando parámetros bind para seguridad
    const { result, connectionClosed } = await executeWithTimeout<RowType[]>(
      connection,
      `SELECT 
        CJ.FECHA,
        decode (
            CJ.CCOSTO,
            39629,
            'YUMBO',
            39630,
            'VIJES',
            39631,
            'CUMBRE',
            39632,
            'JAMUNDI'
        ) MUNICIPIO,
        CJ.prs_documento vendedor,
        upper(
            pe.nombres || ' ' || pe.apellido1 || ' ' || pe.apellido2
        ) nombre_vendedor,
        to_char (
            cj.fechasys,
            'Dd/MM/YYYY HH24:MI:SS'
        ) hora_recaudo,
        CJ.valor,
        substr(CJ.loginregistro, 4) cajero,
        upper(
            pe2.nombres || ' ' || pe2.apellido1 || ' ' || pe2.apellido2
        ) nombre_cajero,
        CJ.descripcion
      from
        cajasdiarias @consultas CJ
        left join personas pe on (
            pe.documento = CJ.prs_documento
        )
        left join personas pe2 on (
            pe2.documento = substr(CJ.loginregistro, 4)
        )
      WHERE
        trunc(CJ.fechasys) between TO_DATE(:fecha1, 'DD/MM/YYYY') and TO_DATE(:fecha2, 'DD/MM/YYYY')
        and CJ.TRANS_CODIGO in (47, 49)
        and substr(cj.loginregistro, 3) in (
            select distinct
                usuadocu
            from cerberus.ms_usuario
            WHERE
                grupcodi in (16, 17)
        )
        and CJ.ZONA = :zona
        and CJ.VERSION = 0
      ORDER BY CJ.CCOSTO, CJ.fechasys, CJ.loginregistro, CJ.prs_documento`,
      { fecha1, fecha2, zona },
      { timeout: 60000, requestId }
    );

    connectionClosedByTimeout = connectionClosed;
    const { rows, metaData } = result;

    if (!rows || !metaData) {
      throw new Error('No se encontraron datos');
    }

    console.log(`[${requestId}] reportRecaudo completado: ${rows.length} filas`);
    return { rows, metaData };
  } catch (error) {
    const enhancedError = error as Error & { connectionClosed?: boolean };
    if (enhancedError.connectionClosed) {
      connectionClosedByTimeout = true;
    }
    console.error(`[${requestId}] Error en reportRecaudo:`, error);
    throw error;
  } finally {
    // Solo cerrar si la conexión existe y NO fue cerrada por timeout
    if (connection && !connectionClosedByTimeout) {
      try {
        await connection.close();
        console.log(`[${requestId}] Conexión cerrada normalmente`);
      } catch (closeError) {
        console.error(`[${requestId}] Error closing connection:`, closeError);
      }
    }
  }
}
