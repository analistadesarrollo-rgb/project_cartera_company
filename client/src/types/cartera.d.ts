export interface CarteraI {
  Empresa: string;
  Vinculado: string;
  Nombres: string;
  Cargo: string;
  Base: number;
  Raspe: number;
  SaldoAnt: number;
  Debito: number;
  Credito: number;
  NuevoSaldo: number;
  Cartera: number;
  Rechazados: number;
  Aceptados: number;
  PendientesCont: number;
  Digitados: number;
  Vtabnet: number;
  CuadreWeb: number;
  Anulados: number;
  Zona: string;
}

export interface MngrReport {
  fecha: string;
  cuenta: string;
  empresa: string;
  vinculado: string;
  ingresos: number;
  egresos: number;
  abonos_cartera: number;
  version: number;
}

export interface Seller {
  NOMBRES: string
  CCOSTO: string
  NOMBRECARGO: string
  DOCUMENTO: string
}

export interface Response {
  cartera: MngrReport[]
  CarteraInicial: {
    SALDO_ANT: number
  },
  Seller: Seller,
  base: number
}
