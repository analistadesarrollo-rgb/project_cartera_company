import { createBrowserRouter } from 'react-router-dom'
import Loading from '../components/ui/LoadingComponent'
import { lazy, Suspense } from 'react'
import Root from './root'

// TODO: PAGES
const NotFound = lazy(() => import('../pages/NotFound'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const Detallado = lazy(() => import('../pages/Home'))
const BasesPage = lazy(() => import('../pages/BasesPage'))
const BasesDetalle = lazy(() => import('../pages/BasesDetalle'))
const AsignarNewBase = lazy(() => import('../pages/AsignarNewBase'))
const ReporteRecaudo = lazy(() => import('../pages/ReporteRecaudo'))
const ReportOracle = lazy(() => import('../pages/ReportOracle'))
const SeleccionReportes = lazy(() => import('../pages/SeleccionReportes'))
const ReportRecaudos = lazy(() => import('../pages/ReportRecaudos'))
const ReportMngr = lazy(() => import('../pages/ReportMngr'))
const ReportMngrV2 = lazy(() => import('../pages/ReportMngrV2'))

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<Loading />}>
            <Dashboard />
          </Suspense>
        )
      },
      {
        path: 'detallado',
        element: (
          <Suspense fallback={<Loading />}>
            <Detallado />
          </Suspense>
        )
      },
      {
        path: 'bases',
        element: (
          <Suspense fallback={<Loading />}>
            <BasesPage />
          </Suspense>
        )
      },
      {
        path: 'base/:id',
        element: (
          <Suspense fallback={<Loading />}>
            <BasesDetalle />
          </Suspense>
        )
      },
      {
        path: 'asignarNuevaBase',
        element: (
          <Suspense fallback={<Loading />}>
            <AsignarNewBase />
          </Suspense>
        )
      },
      {
        path: '/Reportes',
        element: (
          <Suspense fallback={<Loading />}>
            <SeleccionReportes />
          </Suspense>
        )
      },
      {
        path: '/trasnportes',
        element: (
          <Suspense fallback={<Loading />}>
            <ReporteRecaudo />
          </Suspense>
        )
      },
      {
        path: '/consolidadoVenta',
        element: (
          <Suspense fallback={<Loading />}>
            <ReportOracle />
          </Suspense>
        )
      },
      {
        path: '/ReportMngr',
        element: (
          <Suspense fallback={<Loading />}>
            <ReportMngr />
          </Suspense>
        )
      },
      {
        path: '/ReportMngrV2',
        element: (
          <Suspense fallback={<Loading />}>
            <ReportMngrV2 />
          </Suspense>
        )
      },
      {
        path: '/ReportRecaudos',
        element: (
          <Suspense fallback={<Loading />}>
            <ReportRecaudos />
          </Suspense>
        )
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<Loading />}>
            <NotFound />
          </Suspense>
        )
      }
    ]
  }
])

export { router }
