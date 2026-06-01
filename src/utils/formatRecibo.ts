/**
 * Formateo de datos para recibos (sin dependencia de jsPDF).
 */
export const getNombreMesRecibo = (mesString: string): string => {
  if (!mesString) return '-';
  const [año, mes] = mesString.split('-');
  const fecha = new Date(parseInt(año, 10), parseInt(mes, 10) - 1, 1);
  return fecha.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
};
