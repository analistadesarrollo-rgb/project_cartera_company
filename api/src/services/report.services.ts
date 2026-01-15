import { getOraclePool } from '../connections/oracledb';
import { executeWithTimeout, getConnectionSafe } from '../utils/oracleHelper';
import { RowType } from '../types/interface';
import { Connection } from 'oracledb';

const FunBetweenDates = (startDate: string, endDate: string) => `tvn.fecha BETWEEN TO_DATE('${startDate}', 'DD/MM/YYYY') AND TO_DATE('${endDate}', 'DD/MM/YYYY')`;

export async function reportConsolidadoVenta(fecha1: string, fecha2: string, documento: number) {
  let connection: Connection | undefined;
  let connectionClosedByTimeout = false;
  const datesString = FunBetweenDates(fecha1, fecha2);

  try {
    // Obtener conexión con verificación
    connection = await getConnectionSafe(getOraclePool, 'oracleMain');

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
      { timeout: 60000 }
    );

    connectionClosedByTimeout = connectionClosed;
    const { rows, metaData } = result;

    if (!rows || !metaData) {
      throw new Error('No se encontraron datos');
    }

    return { rows, metaData };
  } catch (error) {
    // Verificar si el error ya cerró la conexión (timeout)
    const enhancedError = error as Error & { connectionClosed?: boolean };
    if (enhancedError.connectionClosed) {
      connectionClosedByTimeout = true;
    }
    console.error('[Oracle] Error en reportConsolidadoVenta:', error);
    throw error;
  } finally {
    // Solo cerrar si la conexión existe y NO fue cerrada por timeout
    if (connection && !connectionClosedByTimeout) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('[Oracle] Error closing connection:', closeError);
      }
    }
  }
}

