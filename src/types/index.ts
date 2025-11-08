export interface Categoria {
  id: number;
  nombre: string;
  costoCuota: number;
}

export interface Socio {
  id: number;
  numeroSocio: number;
  apellido: string;
  nombre: string;
  dni: string;
  fechaNacimiento: string;
  calle: string;
  numeroCasa: string;
  localidad: string;
  provincia: string;
  telefono: string;
  email: string;
  categoriaId: number;
  obraSocial: string;
  numeroAfiliado: string;
  fechaAlta: string;
  fechaBaja: string | null;
}

export interface FiltrosSocio {
  numeroSocio?: string;
  apellido?: string;
  nombre?: string;
  dni?: string;
  categoriaId?: number;
  activo?: boolean;
  provincia?: string;
  localidad?: string;
}

// Tabla de Liquidaciones Mensuales (solo fecha de liquidación)
export interface LiquidacionMensual {
  id: number;
  mes: string; // Formato: "YYYY-MM"
  fechaLiquidacion: string; // Fecha en que se generó la liquidación
}

export type MedioPago =
  | 'Efectivo'
  | 'Débito automático'
  | 'Mercado Pago'
  | 'Transferencia bancaria'
  | 'Cheque'
  | 'Tarjeta de crédito';

// Tabla de Relaciones Socio-Liquidación (con estado de pago)
export interface LiquidacionCuota {
  id: number;
  liquidacionMensualId: number; // Referencia a la liquidación mensual
  socioId: number;
  numeroSocio: number;
  apellido: string;
  nombre: string;
  categoriaId: number;
  categoriaNombre: string;
  monto: number;
  pagado: boolean;
  fechaPago: string | null;
  medioPago: string | null;
}


