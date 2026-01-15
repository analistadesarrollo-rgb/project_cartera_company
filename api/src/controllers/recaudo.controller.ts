import { reportConsolidadoVenta } from '../services/report.services';
import { Request, Response } from 'express';
import { Recaudo, Sellers } from '../model';
import { fn, Op } from 'sequelize';
import { reportRecaudo } from '../services/report.recaudos';

export const getRecaudo = async (req: Request, res: Response) => {
  const { id, estado } = req.params;
  try {
    const result = await Recaudo.findOne({
      where: {
        VINCULADO: id as string,
        FECHA: fn('CURDATE'),
        ESTADO: estado as string
      }
    })

    if (!result) return res.status(404).json({ message: 'No se encontraron datos' });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error en getRecaudo', error);
    return res.status(500).json({ message: 'Error en getRecaudo' });
  }
}

export const getReportRecaudo = async (req: Request, res: Response) => {
  const { fecha1, fecha2, zona } = req.body;

  try {
    if (!fecha1 || !fecha2 || !zona) {
      res.status(400).json('Falta fecha inicial o final o zona, verificar estos datos')
      return
    }

    if (zona !== '101' && zona !== '102') {
      res.status(400).json('Zona no válida, verificar zona')
      return
    }

    const result = await Recaudo.findAll({
      attributes: ['FECHA', 'VINCULADO', 'VALOR', 'ESTADO', 'NOTA_CONTEO', 'USR_CONTEO', 'HORA_CONTEO', 'EMPRESA'],
      where: {
        ESTADO: { [Op.in]: ['u', 'r'] },
        FECHA: { [Op.between]: [fecha1, fecha2] },
        NOTA_CONTEO: { [Op.ne]: '' },
        EMPRESA: zona
      },
      include: [{
        attributes: ['NOMBRES', 'NOMBRECARGO'],
        model: Sellers
      }],
      order: [['FECHA', 'ASC'], ['HORA_CONTEO', 'ASC']]
    })

    res.status(200).json(result)
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error en getReportRecaudo' });
  }
}

export const getReportOracle = async (req: Request, res: Response) => {
  const { fecha, fecha2, documento } = req.body;

  if (!fecha || !fecha2 || !documento) {
    return res.status(400).json({ message: 'Falta fecha o documento, verificar estos datos' });
  }

  // calcular que entre la fecha 1 y la fecha 2 no pase mas de 61 dias
  const date1 = new Date(fecha);
  const date2 = new Date(fecha2);

  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 61) {
    return res.status(400).json({ message: 'El rango de fechas no puede ser mayor a 62 días' });
  }

  const formattedDate1 = fecha.split('-').reverse().join('/');
  const formattedDate2 = fecha2.split('-').reverse().join('/');

  try {
    const { rows, metaData } = await reportConsolidadoVenta(formattedDate1, formattedDate2, documento);

    const data = rows.map(row => {
      return metaData?.reduce((acc, meta, index) => {
        acc[meta.name.toLowerCase()] = row[index];
        return acc;
      }, {} as Record<string | number, any>);
    });
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error en getReportOracle' });
  }
}


export const getReportOracleRecaudo = async (req: Request, res: Response) => {
  const { fecha, fecha2, zona } = req.body;

  // Timeout de seguridad a nivel de controlador (80s < timeout HTTP de 90s)
  let controllerTimeoutFired = false;
  const controllerTimeout = setTimeout(() => {
    controllerTimeoutFired = true;
    if (!res.headersSent) {
      console.error('[Controller] Timeout en getReportOracleRecaudo después de 80s');
      return res.status(504).json({ message: 'Tiempo de espera agotado en consulta Oracle' });
    }
  }, 80000);

  if (!fecha || !fecha2 || !zona) {
    clearTimeout(controllerTimeout);
    return res.status(400).json({ message: 'Falta fecha o documento, verificar estos datos' });
  }

  // calcular que entre la fecha 1 y la fecha 2 no pase mas de 61 dias
  const date1 = new Date(fecha);
  const date2 = new Date(fecha2);

  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 61) {
    clearTimeout(controllerTimeout);
    return res.status(400).json({ message: 'El rango de fechas no puede ser mayor a 62 días' });
  }

  const formattedDate1 = fecha.split('-').reverse().join('/');
  const formattedDate2 = fecha2.split('-').reverse().join('/');

  try {
    const { rows, metaData } = await reportRecaudo(formattedDate1, formattedDate2, zona);

    // Limpiar timeout si la consulta tuvo éxito
    clearTimeout(controllerTimeout);

    // Verificar si el timeout ya respondió
    if (controllerTimeoutFired || res.headersSent) {
      return;
    }

    const data = rows.map(row => {
      return metaData?.reduce((acc, meta, index) => {
        acc[meta.name.toLowerCase()] = row[index];
        return acc;
      }, {} as Record<string | number, any>);
    });
    return res.status(200).json(data);
  } catch (error) {
    clearTimeout(controllerTimeout);

    // Si el timeout ya respondió, no intentar responder de nuevo
    if (controllerTimeoutFired || res.headersSent) {
      console.error('[Controller] Error después de timeout en getReportOracleRecaudo:', error);
      return;
    }

    console.error('[Controller] Error en getReportOracleRecaudo:', error);
    return res.status(500).json({ message: 'Error en getReportOracleRecaudo' });
  }
}

