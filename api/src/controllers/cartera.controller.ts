import { CarteraDataServices } from '../services/cartera.services'
import { mapCarteraResults } from '../utils/funtions';
import { getMngrPool } from '../connections/mngr'
import { Request, Response } from 'express'
import { Bases, Cartera, Sellers } from '../model';
import { z } from 'zod';

const schema = z.object({
  fecha1: z.string(),
  fecha2: z.string(),
  vinculado: z.string().transform((val) => parseInt(val, 10)),
})

const CODIGOS_SERVIRED = '1113, 1002, 1072, 1071, 2072, 2026'
const CODIGO_MULTIRED = '1213, 1252, 1204, 2202, 2226'

type RowType = [
  string,  // fecha
  string,  // cuenta
  string,  // empresa
  string,  // vinculado
  number,  // ingresos
  number,  // egresos
  number,  // abonos_cartera
  number   // version
];

export const getCartera = async (req: Request, res: Response) => {
  const { empresa, abs } = req.query;

  if (!empresa || !abs) {
    res.status(400).json({ message: 'Missing parameters' });
    return
  }

  const absBool = abs === 'true' ? true : false;

  try {
    const results = await CarteraDataServices(empresa as string, absBool);
    const mapeado = mapCarteraResults(results);
    res.status(200).json(mapeado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error', error });
  }
}

export const getReportMngr = async (req: Request, res: Response) => {
  const { success, data, error } = schema.safeParse(req.body);

  if (!success) {
    res.status(400).json({ message: error.format() });
    return
  }

  if (!data) {
    res.status(400).json({ message: 'Missing parameters' });
    return
  }

  const fecha1 = data.fecha1.split(' ')[0];
  const fecha2 = data.fecha2.split(' ')[0];
  const vinculado = data.vinculado;

  const frmDate1 = fecha1.split('-').reverse().join('/');
  const frmDate2 = fecha2.split('-').reverse().join('/');

  let connetion;

  try {

    const CarteraInicial = await Cartera.findOne({
      attributes: ['SALDO_ANT'],
      where: {
        VINCULADO: vinculado,
        FECHA: fecha1
      },
      include: [{
        model: Sellers,
        attributes: ['DOCUMENTO', 'NOMBRES', 'CCOSTO', 'NOMBRECARGO'],
      }]
    });

    const SellerPowerBi = CarteraInicial?.Seller

    if (!SellerPowerBi) {
      res.status(404).json({ message: 'El documento ingresado no se encuentra en BD POWER BI' });
      return
    }

    const base = await Bases.findOne({ attributes: ['BASE'], where: { VINCULADO: vinculado } })

    const SQL_CODES = SellerPowerBi.CCOSTO === '39632' ? CODIGOS_SERVIRED : CODIGO_MULTIRED;

    const pool = await getMngrPool();

    connetion = await pool.getConnection();

    const { rows, metaData } = await connetion.execute<RowType[][]>(`
      SELECT
      mcnfecha fecha, mcncuenta cuenta, mcnEmpresa empresa, mcnVincula vinculado, 
      SUM (case when (mn.mcntipodoc not in (${SQL_CODES})) then mcnvaldebi else 0 end) INGRESOS, 
      SUM (case when (mn.mcntipodoc not in (${SQL_CODES})) then mcnvalcred else 0 end) EGRESOS,
      SUM (case when (mn.mcntipodoc in (${SQL_CODES})) then mcnvalcred else 0 end) ABONOS_CARTERA,
      0 VERSION
      FROM manager.mngmcn mn
      WHERE mcncuenta = '13459501'
      And mcnfecha between TO_DATE(:fecha1, 'DD-MM-YYYY') and TO_DATE(:fecha2, 'DD-MM-YYYY')
      AND (mcntpreg = 0 or mcntpreg = 1 or mcntpreg = 2 or mcntpreg > 6)
      AND mcnVincula = :documento
      GROUP BY mcnfecha, mcncuenta, mcnEmpresa, mcnVincula
      ORDER BY mcnfecha
    `, [frmDate1, frmDate2, vinculado]);

    const data = rows?.map(row => {
      return metaData?.reduce((acc, meta, index) => {
        acc[meta.name.toLowerCase()] = row[index];
        return acc;
      }, {} as Record<string | number, any>);
    });

    res.status(200).json({ cartera: data, CarteraInicial, Seller: SellerPowerBi, base: base?.BASE || 0 });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error', error });
  } finally {
    if (connetion) {
      connetion.close();
    }
  }
}
