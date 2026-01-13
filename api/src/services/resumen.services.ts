import { Bases, Cartera, Recaudo, Sellers, Carteraxhoras } from "../model"
import { col, fn, Op } from "sequelize"

// * Constantes para códigos de empresa
const EMPRESAS_INCLUIDAS = ['101', '102']

/**
 * Obtiene un resumen de la cartera para las empresas especificadas.
 * El resumen incluye el saldo anterior, crédito y débito.
 * @returns {Promise<Cartera[]>} Resultados de la consulta.
 */

interface CarteraIR extends Cartera {
  Basis: Bases | null
}

interface DetalleRecaudo {
  FECHA: string;
  ESTADO: string;
  Total: number;
  Cantidad: number;
}

export const getResumenCartera = async (): Promise<CarteraIR[]> => {
  try {
    const condicionesDeFiltrado = {
      FECHA: fn('CURDATE'),
      SALDO_ANT: { [Op.gt]: 0 },
      EMPRESA: { [Op.in]: EMPRESAS_INCLUIDAS }
    }

    const queryOptions = {
      attributes: ['EMPRESA', 'SALDO_ANT', 'CREDITO', 'DEBITO'],
      where: condicionesDeFiltrado,
      include: [
        { attributes: ['BASE'], model: Bases, required: false },
        { attributes: ['NOMBRECARGO'], model: Sellers, required: false }
      ]
    }

    const results = await Cartera.findAll(queryOptions)

    return results as CarteraIR[]
  } catch (error) {
    console.error(error)
    throw error
  }
}

export const getDetalleRecaudoServired = async () => {
  try {
    const result = await Recaudo.findAll({
      attributes: ['ESTADO', [fn('SUM', col('VALOR')), 'Total'], [fn('COUNT', 1), 'Cantidad']],
      where: { FECHA: fn('CURDATE'), EMPRESA: 101 },
      group: ['ESTADO']
    })

    return result as unknown as DetalleRecaudo[];
  } catch (error) {
    console.error(error)
    throw error
  }
}

export const getDetalleRecaudoMultired = async () => {
  try {
    const result = await Recaudo.findAll({
      attributes: ['ESTADO', [fn('SUM', col('VALOR')), 'Total'], [fn('COUNT', 1), 'Cantidad']],
      where: { FECHA: fn('CURDATE'), EMPRESA: 102 },
      group: ['ESTADO']
    })

    return result as unknown as DetalleRecaudo[];
  } catch (error) {
    console.error(error)
    throw error
  }
}

export const getCarteraXhoras = async (fecha?: string) => {
  try {
    // Validar y preparar la fecha
    let fechaFiltro;

    if (fecha && fecha.trim() !== '') {
      // Validar formato de fecha (YYYY-MM-DD)
      const fechaLimpia = fecha.trim();
      const formatoFechaValido = /^\d{4}-\d{2}-\d{2}$/.test(fechaLimpia);

      if (formatoFechaValido) {
        // Validar que sea una fecha válida
        const fechaObj = new Date(fechaLimpia);
        const esValidaFecha = !isNaN(fechaObj.getTime()) && fechaLimpia === fechaObj.toISOString().split('T')[0];

        fechaFiltro = esValidaFecha ? fechaLimpia : fn('CURDATE');
      } else {
        // Si el formato no es válido, usar fecha actual
        console.warn(`Formato de fecha inválido: ${fechaLimpia}. Usando fecha actual.`);
        fechaFiltro = fn('CURDATE');
      }
    } else {
      // Si no viene fecha o está vacía, usar fecha actual
      fechaFiltro = fn('CURDATE');
    }

    const condicionesDeFiltrado = {
      FECHA: fechaFiltro,
      EMPRESA: { [Op.in]: EMPRESAS_INCLUIDAS }
    }

    const queryOptions = {
      attributes: ['EMPRESA', 'HORA', 'VLR_CA', 'VLR_CI', 'VLR_CT'],
      where: condicionesDeFiltrado,
    }

    const results = await Carteraxhoras.findAll(queryOptions)

    // Agrupar resultados por empresa
    const empresasData = results.reduce((acc, item) => {
      const nombreEmpresa = item.EMPRESA === '101' ? 'Servired' : 'Multired'

      if (!acc[nombreEmpresa]) {
        acc[nombreEmpresa] = []
      }

      acc[nombreEmpresa].push({
        HORA: item.HORA,
        VLR_CA: item.VLR_CA,
        VLR_CI: item.VLR_CI,
        VLR_CT: item.VLR_CT,
      })

      return acc
    }, {} as Record<string, any[]>)

    // Formatear el resultado final como array de empresas
    const formattedResults = Object.entries(empresasData).map(([empresa, datos]) => ({
      empresa,
      totalRegistros: datos.length,
      datos: datos.sort((a, b) => a.HORA.localeCompare(b.HORA)), // Ordenar por hora
    }))

    // Asegurar que siempre retornemos datos para ambas empresas (aunque estén vacías)
    const empresasCompletas = ['Servired', 'Multired'].map(empresa => {
      const empresaData = formattedResults.find(item => item.empresa === empresa)
      return empresaData || {
        empresa,
        totalRegistros: 0,
        datos: [],
        resumen: {
          totalVLR_CA: 0,
          totalVLR_CI: 0,
          totalVLR_CT: 0,
        }
      }
    })

    return empresasCompletas
  } catch (error) {
    console.error('Error en getCarteraXhoras:', error)
    throw error
  }
}