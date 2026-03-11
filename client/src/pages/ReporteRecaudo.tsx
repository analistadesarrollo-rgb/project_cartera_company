import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableRoot, Card, Label, Input, SelectNative, Button, Badge } from '../components/ui'
import { BottonExporReporteRecaudo } from '../components/ExportReporteRecaudo'
import { DialogHero } from '../components/ReporteDetail'
import { FormEvent, useMemo, useState } from 'react'
import { DataReporte } from '../types/Recaudo'
import { API_URL } from '../utils/contanst'
import { toast } from 'sonner'
import axios from 'axios'

export default function ReportClienteGanadores() {
  const [date1, setDate1] = useState('')
  const [date2, setDate2] = useState('')
  const [zona, setZona] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(false)
  const [filter, setFilter] = useState<string>('')

  const [data, setData] = useState<DataReporte[] | null>(null)
  const [open, setOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<DataReporte | null>(null)

  const handleRowClick = (item: DataReporte) => {
    setSelectedItem(item)
    setOpen(true)
  }

  const handleSubmitInfo = (e: FormEvent) => {
    e.preventDefault()

    if (date1 === '' || date2 === '' || zona === '') {
      toast.error('Por favor llene todos los campos, fecha inicial fecha final y zona')
      return
    }

    setLoading(true)

    axios.post<DataReporte[]>(`${API_URL}/reportRecaudo`, { fecha1: date1.toString().slice(0, 10), fecha2: date2.toString().slice(0, 10), zona })
      .then(res => setData(res.data))
      .catch(err => console.log(err))
      .finally(() => setLoading(false))
  }

  const filteredData = useMemo(() => {
    if (!data) return null
    return data.filter(item => item.VINCULADO.includes(filter))
  }, [data, filter])

  return (
    <>
      <Card className='flex justify-around items-center'>

        <div className='flex gap-2 items-center' >
          <Label>Fecha Inicial</Label>
          <Input type='date' value={date1} onChange={(e) => setDate1(e.target.value)}
            className='rounded-md' />
          <Label>Fecha Final</Label>
          <Input type='date' value={date2} onChange={(e) => setDate2(e.target.value)}
            className='rounded-md' />
        </div>

        <form className='flex gap-2 items-center' onSubmit={handleSubmitInfo}>
          <Label >Empresa: </Label>
          <SelectNative name='zona' className='px-4 rounded-md w-40' value={zona} onChange={ev => setZona(ev.target.value)}>
            <option value=''>Seleccione</option>
            <option value='101'>Servired</option>
            <option value='102'>Multired</option>
          </SelectNative>

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

        <p className='flex gap-2 items-center'>
          N° Datos:
          <Badge variant='warning'>{filteredData?.length || '0'}</Badge>
        </p>

        <div className='flex gap-2 items-center'>
          <Label>Filtrar N° Doc</Label>
          <Input type="text" placeholder='1118*****' className='rounded-md' value={filter} onChange={ev => setFilter(ev.target.value)} />
        </div>

        <BottonExporReporteRecaudo datos={filteredData ?? []} />

      </Card>
      <DialogHero open={open} onClose={() => setOpen(false)} data={selectedItem} />
      <Card>
        <TableRoot className='h-[80vh] overflow-y-auto'>
          <Table>
            <TableHead className='sticky top-0 bg-gray-100'>
              <TableRow>
                <TableHeaderCell>N°</TableHeaderCell>
                <TableHeaderCell>Fecha</TableHeaderCell>
                <TableHeaderCell>Vinculado</TableHeaderCell>
                <TableHeaderCell>Nombres</TableHeaderCell>
                <TableHeaderCell>Cargo</TableHeaderCell>
                <TableHeaderCell>Valor</TableHeaderCell>
                <TableHeaderCell>Estado</TableHeaderCell>
                <TableHeaderCell>Hora conteo</TableHeaderCell>
                <TableHeaderCell>User conteo</TableHeaderCell>
                <TableHeaderCell>Nota conteo</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody className=''>
              {
                filteredData?.map((item, index) => (
                  <TableRow key={index} onClick={() => handleRowClick(item)} className="cursor-pointer hover:bg-gray-200">
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.FECHA}</TableCell>
                    <TableCell>{item.VINCULADO}</TableCell>
                    <TableCell>{item.Seller?.NOMBRES ?? 'No Registrado'}</TableCell>
                    <TableCell>{item.Seller?.NOMBRECARGO ?? 'No Registrado'}</TableCell>
                    <TableCell>{item.VALOR}</TableCell>
                    <TableCell className={item.ESTADO === 'r' ? 'text-red-400 font-semibold' : item.ESTADO === 'u' ? 'text-green-400 font-semibold' : 'text-gray-600'}>
                      {item.ESTADO === 'r' ? 'Rechazado' : 'Aceptado'}
                    </TableCell>
                    <TableCell>{item.HORA_CONTEO}</TableCell>
                    <TableCell>{item.USR_CONTEO}</TableCell>
                    <TableCell>{item.NOTA_CONTEO}</TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </TableRoot>
      </Card>
    </>
  )
}
