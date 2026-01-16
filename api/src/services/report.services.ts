import { getOraclePool } from '../connections/oracledb';
import { executeWithTimeout, getConnectionSafe } from '../utils/oracleHelper';
import { RowType } from '../types/interface';
import { Connection } from 'oracledb';

const FunBetweenDates = (startDate: string, endDate: string) => `tvn.fecha BETWEEN TO_DATE('${startDate}', 'DD/MM/YYYY') AND TO_DATE('${endDate}', 'DD/MM/YYYY')`;

/**
 * Ejecuta la consulta de consolidado de venta con timeouts robustos.
 * Ahora incluye logging extensivo para diagnóstico.
 */
export async function reportConsolidadoVenta(fecha1: string, fecha2: string, documento: number) {
  let connection: Connection | undefined;
  let connectionClosedByTimeout = false;
  let requestId = '';
  const datesString = FunBetweenDates(fecha1, fecha2);

  try {
    // Obtener conexión con timeout explícito de 15 segundos
    const connResult = await getConnectionSafe(getOraclePool, 'oracleMain');
    connection = connResult.connection;
    requestId = connResult.requestId;

    console.log(`[${requestId}] Ejecutando reportConsolidadoVenta para documento ${documento}`);

    // Ejecutar con timeout de 60 segundos
    const { result, connectionClosed } = await executeWithTimeout<RowType[]>(
      connection,
      `SELECT 
        tvn.fecha, 
        tvn.persona, 
        UPPER(pe.nombres || ' ' || pe.apellido1 || ' ' || pe.apellido2) AS nombres, 
        pro.razonsocial, 
        tvn.servicio, 
        se.nombre AS nombreservicio, 
        tvn.VENTABRUTA, 
        ROUND(tvn.VTABRUTASINIVA, 2) AS vtasiniva, 
        ROUND(tvn.IVA, 2) AS iva, 
        ROUND(tvn.COMISION, 2) AS comision, 
        ROUND(tvn.VENTANETA, 2) AS ventaneta, 
        tvn.FORMULARIOS, 
        tvn.sucursal, 
        ipv.NOMBRE_COMERCIAL 
      FROM 
        V_TOTALVENTASNEGOCIO tvn
      JOIN 
        proveedores pro ON tvn.PROVEEDOR = pro.nit
      JOIN 
        servicios se ON tvn.servicio = se.codigo
      JOIN 
        personas pe ON pe.documento = tvn.persona
      JOIN 
        info_puntosventa_cem ipv ON ipv.codigo = tvn.SUCURSAL
      WHERE 
        ${datesString}
        AND tvn.persona = :documento`,
      [documento],
      { timeout: 60000, requestId }
    );

    connectionClosedByTimeout = connectionClosed;
    const { rows, metaData } = result;

    if (!rows || !metaData) {
      throw new Error('No se encontraron datos');
    }

    console.log(`[${requestId}] reportConsolidadoVenta completado: ${rows.length} filas`);
    return { rows, metaData };
  } catch (error) {
    const enhancedError = error as Error & { connectionClosed?: boolean };
    if (enhancedError.connectionClosed) {
      connectionClosedByTimeout = true;
    }
    console.error(`[${requestId}] Error en reportConsolidadoVenta:`, error);
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
