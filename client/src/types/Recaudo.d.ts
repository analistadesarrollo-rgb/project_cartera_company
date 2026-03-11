export interface Recaudo {
  FECHA: string;
  RECAUDADOR: string;
  ID_RECAUDO: string;
  CAJADNO: string;
  VINCULADO: string;
  VALOR: number;
  ESTADO: string;
  RESPALDO: string;
  HORASYNC: string;
  HORAMOVI: string;
  USR_CONTEO: string;
  HORA_CONTEO: string;
  NOTA_CONTEO: string;
  VERSION: string;
}

interface Seller {
  NOMBRES: string;
  NOMBRECARGO: string;
}

export interface DataReporte {
  FECHA: string;
  VINCULADO: string;
  VALOR: number;
  ESTADO: 'r' | 'u';
  NOTA_CONTEO: string;
  USR_CONTEO: string;
  HORA_CONTEO: string;
  EMPRESA: string;
  Seller?: Seller;
}

export interface DataOracle {
  fecha: Date;
  persona: number;
  nombres: string;
  razonsocial: string;
  servicio: number;
  nombreservicio: string;
  ventabruta: number;
  vtasiniva: number;
  iva: number;
  comision: number;
  ventaneta: number;
  formularios: number;
  sucursal: number;
  nombre_comercial: string;
}

export interface DataRecaudo {
  fecha: Date;
  municipio: string;
  vendedor: number;
  nombre_vendedor: string;
  hora_recaudo: string;
  valor: number;
  cajero: string;
  nombre_cajero: string;
  descripcion: string;
}
