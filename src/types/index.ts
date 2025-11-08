export interface Categoria {
  id: number;
  nombre: string;
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


