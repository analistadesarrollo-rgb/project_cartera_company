import { Badge, Button, Card, Input, Label, Table, TableBody, TableCell, TableFoot, TableHead, TableHeaderCell, TableRoot, TableRow } from '../components/ui'
import { BottonExporCarteraMngrV2 } from '../components/ExporMngrV2'
import { formatValue } from '../utils/funtions'
import { FormEvent, useState } from 'react'
import { Response } from '../types/cartera'
import { API_URL } from '../utils/contanst'
import axios from 'axios'
import { toast } from 'sonner'

export default function ReportMngrv2 () {
  const [data, setData] = useState<Response | null>(null)
  const [documento, setDocumento] = useState<string>('')
  const [fecha1, setFecha1] = useState<string>('')
  const [fecha2, setFecha2] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const handleSubmit = (ev: FormEvent) => {
    ev.preventDefault()

    // validar que el documento tenga solo números
    if (!documento.match(/^[0-9]+$/)) {
      toast.error('El documento debe tener solo números', { description: 'Verificar documento' })
      setLoading(false)
      return
    }

    setLoading(true)
    axios.post(`${API_URL}/carteraMngr`, { vinculado: documento, fecha1, fecha2 }, { timeout: 180000 })
      .then(response => {
        console.log('first', response.data)
        setData(response.data)
        setLoading(false)
      })
      .catch(error => {
        console.error(error)
        setLoading(false)
      })
  }

  const sumaIngresos = data?.cartera.reduce((acc, item) => acc + item.ingresos, 0) || 0
  const sumaEgresos = data?.cartera.reduce((acc, item) => acc + item.egresos, 0) || 0
  const sumaAbonos = data?.cartera.reduce((acc, item) => acc + item.abonos_cartera, 0) || 0
  const saldoInicial = data?.CarteraInicial.SALDO_ANT || 0
  const base = data?.base || 0
  const total = sumaIngresos + saldoInicial - sumaEgresos - sumaAbonos - base

  return (
    <>
      <Card className='flex justify-around'>
        <p className='flex gap-2 items-center'>
          Cantida Datos:
          <Badge variant='default'>{data?.cartera.length || 0}</Badge>
        </p>
        <form className='flex items-center gap-4' onSubmit={handleSubmit}>
          <div className='flex gap-2 items-center'>
            <Label htmlFor='fecha'>Fecha Inicial</Label>
            <Input
              type='date'
              id='fecha'
              required
              value={fecha1}
              onChange={e => setFecha1(e.target.value)}
            />
          </div>
          <div className='flex gap-2 items-center'>
            <Label htmlFor='fecha2'>Fecha Final</Label>
            <Input
              type='date'
              id='fecha2'
              required
              value={fecha2}
              onChange={e => setFecha2(e.target.value)}
            />
          </div>
          <div className='flex gap-2 items-center'>
            <Label htmlFor='documento'>Documento</Label>
            <Input
              type='text'
              id='documento'
              required
              onChange={e => setDocumento(e.target.value)}
            />
          </div>
          <Button
            disabled={loading}
            type='submit'
          >
            {
              loading ? <div className='flex items-center justify-center gap-2'>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 1 1 16 0A8 8 0 0 1 4 12z"></path>
                </svg>
                Buscando ...</div> : 'Buscar'
            }
          </Button>
        </form>
      </Card>
      <Card className='mt-1 flex justify-around items-center'>
        <h1 className='font-semibold'>INFORMACIÓN VENDEDOR CONSULTADO:</h1>
        <p>Nombre: {data?.Seller.NOMBRES}</p>
        <p>Cargo: {data?.Seller.NOMBRECARGO}</p>
        <p>Empresa:<span className='px-1'>{data?.Seller.CCOSTO === '39632' ? 'SERVIRED' : 'MULTIRED'}</span></p>
        <BottonExporCarteraMngrV2 datos={data?.cartera || []} initial={saldoInicial} base={base} info={data?.Seller}/>
      </Card>
      <Card className='mt-1'>
        <div className='flex justify-end'>
          <Badge className='text-base' variant='warning'>Saldo Inicial: {formatValue(data?.CarteraInicial.SALDO_ANT || 0)}</Badge>
        </div>
        <TableRoot className='h-[75vh] overflow-y-auto'>
          <Table>
            <TableHead className='sticky top-0 bg-gray-100 z-30'>
              <TableRow>
                <TableHeaderCell>Fecha</TableHeaderCell>
                <TableHeaderCell className="text-right">Ingresos</TableHeaderCell>
                <TableHeaderCell className="text-right">Egresos</TableHeaderCell>
                <TableHeaderCell className="text-right">Saldo Día</TableHeaderCell>
                <TableHeaderCell className="text-right">Abono Cartera</TableHeaderCell>
                <TableHeaderCell className="text-right">Diferencia día</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {
                data?.cartera.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.fecha.split('T')[0]}</TableCell>
                    <TableCell className="text-right">{formatValue(item.ingresos)}</TableCell>
                    <TableCell className="text-right">{formatValue(item.egresos)}</TableCell>
                    <TableCell className="text-right">{formatValue(item.ingresos - item.egresos)}</TableCell>
                    <TableCell className="text-right">{formatValue(item.abonos_cartera)}</TableCell>
                    <TableCell className="text-right">{formatValue((item.ingresos - item.egresos) - item.abonos_cartera)}</TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
            <TableFoot className='sticky bottom-0 bg-gray-100 z-30'>
              <TableRow>
                <TableHeaderCell colSpan={5} scope="row" className="text-right">Saldo final cartera:</TableHeaderCell>
                <TableHeaderCell colSpan={1} scope="row" className="text-right">
                  {formatValue(total)}
                </TableHeaderCell>
              </TableRow>
            </TableFoot>
            <TableFoot className=''>
              <TableRow>
                <TableHeaderCell colSpan={1} scope="row" className="text-right">Totales</TableHeaderCell>
                <TableHeaderCell colSpan={1} scope="row" className="text-right">
                  {formatValue(sumaIngresos)}
                </TableHeaderCell>

                <TableHeaderCell colSpan={1} scope="row" className="text-right">
                  {formatValue(sumaEgresos)}
                </TableHeaderCell>
                <TableHeaderCell colSpan={2} scope="row" className="text-right">
                  {formatValue(sumaAbonos)}
                </TableHeaderCell>
              </TableRow>
            </TableFoot>
            <TableFoot className=''>
              <TableRow>
                <TableHeaderCell colSpan={5} scope="row" className="text-right">Base asignada:</TableHeaderCell>
                <TableHeaderCell colSpan={1} scope="row" className="text-right">
                  <Badge variant='success'>{formatValue(data?.base || 0)}</Badge>
                </TableHeaderCell>
              </TableRow>
            </TableFoot>
          </Table>
        </TableRoot>

        {
          loading && (
            <div className="absolute top-36 right-48 left-48 z-30 flex flex-col items-center justify-center">
              <div className="w-96 rounded-md flex flex-col shadow-lg items-center justify-center gap-4 py-4 px-6 z-30 bg-yellow-300 animate-pulse">
                <span className="text-lg font-semibold text-gray-800">Solicitando información ...</span>
                <svg aria-hidden='true' className='inline w-10 h-10 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600' viewBox='0 0 100 101' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  <path d='M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z' fill='currentColor' />
                  <path d='M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z' fill='currentFill' />
                </svg>
              </div>
            </div>
          )
        }
      </Card>
    </>
  )
}
