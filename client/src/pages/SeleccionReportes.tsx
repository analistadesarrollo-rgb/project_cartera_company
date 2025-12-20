import { RiCaravanLine, RiBarChartGroupedLine, RiFileChartFill } from '@remixicon/react'
import { useNavigate } from 'react-router-dom'

export default function SeleccionReportes () {
  const navigate = useNavigate()

  return (
    <section className='grid xl:grid-cols-2 2xl:grid-cols-3 gap-4 p-4'>

      <article className='flex flex-col justify-around bg-gradient-to-r from-orange-900 to-yellow-800 p-4 rounded-md shadow-xl space-y-2'>
        <h1 className='font-semibold text-2xl text-white'>Estados Transportes Recaudos</h1>
        <p className='text-white text-balance'>
          Genera reporte de los recaudos,  Se debe seleccionar rango de fechas para la consulta. se puede filtrar por vinculado
          <span className='font-semibold'>
            ( Colocador Independiente y/o Cajero Comercial )
          </span>
        </p>
        <div className='flex items-center justify-between'>
          <RiCaravanLine size={48} color='white' />
          <button onClick={() => navigate('/trasnportes')}
            className='bg-yellow-300 hover:bg-yellow-400 p-2 rounded-md font-semibold'>Ingresar</button>
        </div>
      </article>

      <article className='flex flex-col justify-around bg-gradient-to-r from-blue-900 to-blue-800 p-4 rounded-md shadow-xl space-y-2'>
        <h1 className='font-semibold text-2xl text-white'>Reporte Consolidado Ventas</h1>
        <p className='text-white text-balance'>
          Permite mediante el N° documento del vinculado Colocador Independiente y/o Cajero Comercial. Generar un consolidado de venta. Se debe seleccionar una fecha para la consulta.
        </p>
        <div className='flex items-center justify-between'>
          <RiBarChartGroupedLine size={48} color='white' />
          <button onClick={() => navigate('/consolidadoVenta')}
            className='bg-yellow-300 hover:bg-yellow-400 p-2 rounded-md font-semibold'>Ingresar</button>
        </div>
      </article>

      <article className='flex flex-col justify-around bg-gradient-to-r from-green-900 to-green-800 p-4 rounded-md shadow-xl space-y-2'>
        <h1 className='font-semibold text-2xl text-white'>Reporte Cartera</h1>
        <p className='text-white text-balance'>
          Reporte manager de cartera, permite visualizar el estado de la cartera de los vinculados Colocador Independiente y/o Cajero Comercial. Se debe seleccionar un rancgo de fechas para la consulta.
        </p>
        <div className='flex items-center justify-between'>
          <RiFileChartFill size={48} color='white' />
          <button onClick={() => navigate('/reportMngr')}
            className='bg-yellow-300 hover:bg-yellow-400 p-2 rounded-md font-semibold'>Ingresar</button>
        </div>
      </article>

       <article className='flex flex-col justify-around bg-gradient-to-r from-green-900 to-green-800 p-4 rounded-md shadow-xl space-y-2'>
        <h1 className='font-semibold text-2xl text-white'>Reporte Cartera V2</h1>
        <p className='text-white text-balance'>
          Reporte manager de cartera, permite visualizar el estado de la cartera de los vinculados Colocador Independiente y/o Cajero Comercial. Se debe seleccionar un rancgo de fechas para la consulta.
        </p>
        <div className='flex items-center justify-between'>
          <RiFileChartFill size={48} color='white' />
          <button onClick={() => navigate('/ReportMngrV2')}
            className='bg-yellow-300 hover:bg-yellow-400 p-2 rounded-md font-semibold'>Ingresar</button>
        </div>
      </article>

      <article className='flex flex-col justify-around bg-gradient-to-r from-red-900 to-red-800 p-4 rounded-md shadow-xl space-y-2'>
        <h1 className='font-semibold text-2xl text-white'>Reporte Recaudos Realizados</h1>
        <p className='text-white text-balance'>
        Reporte de los Reporte Recaudos Realizados Excel el reporte de recaudos realizados en puntos de venta se debe selecionar el rango de fechas, la empresa y la cedula
        </p>
        <div className='flex items-center justify-between'>
          <RiCaravanLine size={48} color='white' />
          <button onClick={() => navigate('/ReportRecaudos')}
            className='bg-yellow-300 hover:bg-yellow-400 p-2 rounded-md font-semibold'>Ingresar</button>
        </div>
      </article>

    </section>
  )
}
