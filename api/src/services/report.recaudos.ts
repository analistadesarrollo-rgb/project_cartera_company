import { getNaosPool } from '../connections/oracledb.naos';
import { executeWithTimeout, getConnectionSafe } from '../utils/oracleHelper';
import { RowType } from '../types/interface';
import { Connection } from 'oracledb';

const FunBetweenDates = (startDate: string, endDate: string) => `trunc (CJ.fechasys) between TO_DATE('${startDate}', 'DD/MM/YYYY') and TO_DATE('${endDate}', 'DD/MM/YYYY')`;

export async function reportRecaudo(fecha1: string, fecha2: string, zona: string) {
  let connection: Connection | undefined;
  const datesString = FunBetweenDates(fecha1, fecha2);

  try {
    // Obtener conexión con verificación
    connection = await getConnectionSafe(getNaosPool, 'oracleNaos');

    // Ejecutar con timeout de 60 segundos
    const { rows, metaData } = await executeWithTimeout<RowType[]>(
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
        ${datesString}
        and CJ.TRANS_CODIGO in (47, 49)
        and substr(cj.loginregistro, 3) in (
            select distinct
                usuadocu
            from cerberus.ms_usuario
            WHERE
                grupcodi in (16, 17)
        )
        and CJ.ZONA = ${zona}
        and CJ.VERSION = 0
      ORDER BY CJ.CCOSTO, CJ.fechasys, CJ.loginregistro, CJ.prs_documento`,
      [],
      { timeout: 60000 }
    );

    if (!rows || !metaData) {
      throw new Error('No se encontraron datos');
    }

    return { rows, metaData };
  } catch (error) {
    console.error('[Oracle] Error en reportRecaudo:', error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('[Oracle] Error closing connection:', closeError);
      }
    }
  }
}
