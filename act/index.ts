export interface Categoria {
  id: number;
  nombre: string;
  costoCuota: number;
}

export interface Adherente {
  id?: number;
  apellido: string;
  nombre: string;
  dni: string;
  fechaNacimiento: string;
  parentesco: string;
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
  foto?: string | null;
  adherentes?: Adherente[];
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

export interface Usuario {
  id: number;
  usuario: string;
  activo: boolean;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    usuario: string;
  };
}

export interface Permiso {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

export interface Caja {
  id: number;
  nombre: string;
  descripcion: string | null;
  saldoInicial: number;
  saldoActual: number;
  activa: boolean;
}

export interface MedioPagoDB {
  id: number;
  nombre: string;
  descripcion: string | null;
  cajaId: number | null; // Mantener por compatibilidad, pero usar cajasIds
  cajaNombre: string | null; // Mantener por compatibilidad, pero usar cajas
  cajasIds: number[]; // Array de IDs de cajas
  cajas: Array<{ id: number; nombre: string }>; // Array de objetos caja
  tipoMovimiento: 'ingreso' | 'egreso' | 'ambos';
  activo: boolean;
}

export interface MovimientoCaja {
  id: number;
  cajaId: number;
  cajaNombre: string;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  concepto: string;
  descripcion: string | null;
  medioPagoId: number | null;
  medioPagoNombre: string | null;
  liquidacionCuotaId: number | null;
  socioNombre: string | null;
  socioApellido: string | null;
  fecha: string;
  createdAt: string;
}


