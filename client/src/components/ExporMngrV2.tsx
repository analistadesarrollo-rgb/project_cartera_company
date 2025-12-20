import { MngrReport, Seller } from '../types/cartera'
import { utils, ColInfo, writeFile } from 'xlsx'
import { Button } from './ui'
import { toast } from 'sonner'

const generateExcelData = (
  datos: MngrReport[],
  initial: number,
  base: number,
  info: Seller | undefined
): unknown[] => {
  const date = new Date().toLocaleDateString().split('/').reverse().join('-')
  const hour = new Date().toLocaleTimeString()

  const titulo = [{ A: `Reporte Manager - Generado: ${date} ${hour}` }]
  const names = info
    ? [{ A: 'Nombres:', B: info.NOMBRES, C: 'Documento:', D: info.DOCUMENTO }]
    : []

  const headers = [{
    A: 'FECHA',
    B: 'INGRESOS',
    C: 'EGRESOS',
    D: 'SALDO DIA',
    E: 'ABONO CARTERA',
    F: 'SALDO FINAL'
  }]

  const initialRow = [{ G: 'Saldo Inicial', H: initial }]
  const baseRow = [{ G: 'Base Asignada', H: base }]

  const startRow = 6 // primera fila de datos

  const rows = datos.map((it, index) => {
    const row = startRow + index

    return {
      A: it.fecha.split('T')[0],
      B: it.ingresos,
      C: it.egresos,

      // SALDO DIA = INGRESOS - EGRESOS
      D: { f: `B${row}-C${row}` },

      E: it.abonos_cartera,

      // SALDO FINAL
      F:
        index === 0
          // F6 = Saldo Inicial - Abono
          ? { f: `H4-E${row}` }
          // Fn = D(n-1) - En + F(n-1)
          : { f: `D${row - 1}-E${row}+F${row - 1}` }
    }
  })

  return [
    ...titulo,
    ...names,
    ...headers,
    ...initialRow,
    ...baseRow,
    ...rows
  ]
}
const createExcelFile = (data: unknown[]): void => {
  const libro = utils.book_new()
  const hoja = utils.json_to_sheet(data, { skipHeader: true })

  hoja['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }
  ]

  hoja['!cols'] = [
    { width: 15 }, { width: 15 }, { width: 15 },
    { width: 15 }, { width: 20 }, { width: 20 },
    { width: 15 }, { width: 20 }
  ]

  utils.book_append_sheet(libro, hoja, 'CarteraManager')
  writeFile(libro, 'ReporteCarteraManager.xlsx')
}

export const BottonExporCarteraMngrV2 = ({
  datos,
  initial,
  base,
  info
}: {
    datos: MngrReport[]
    initial: number
    base: number
    info: Seller | undefined
}): JSX.Element => {
  const handleDownload = (): void => {
    const dataFinal = generateExcelData(datos, initial, base, info)

    toast.promise(
      // eslint-disable-next-line promise/param-names
      new Promise((res) => setTimeout(res, 1200)),
      {
        loading: 'Generando archivo...',
        success: () => {
          createExcelFile(dataFinal)
          return 'Archivo generado correctamente'
        },
        error: 'Error al generar archivo'
      }
    )
  }

  return (
        <Button onClick={handleDownload}>
            Exportar a Excel
        </Button>
  )
}
