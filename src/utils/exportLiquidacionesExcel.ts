import * as XLSX from 'xlsx-js-style';

type CuotaConMes = {
  id: number;
  socioId: number;
  monto: number;
  pagado: boolean;
  mes: string;
  numeroSocio?: number;
  apellido?: string;
  nombre?: string;
};

const FILL_VERDE = { patternType: 'solid' as const, fgColor: { rgb: 'FFC6F6D5' } };
const FILL_ROJO = { patternType: 'solid' as const, fgColor: { rgb: 'FFFED7D7' } };
const FILL_GRIS = { patternType: 'solid' as const, fgColor: { rgb: 'FFE5E5E5' } };

/**
 * Exporta liquidaciones a Excel en formato doble entrada:
 * - Filas: socios (N° Socio, Apellido, Nombre)
 * - Columnas: meses (cuotas)
 * - Intersección: monto (verde si pagado o monto 0, rojo si pendiente, gris si vacío)
 */
export function exportLiquidacionesDobleEntrada(
  cuotas: CuotaConMes[],
  filename = `Liquidaciones-doble-entrada-${new Date().toISOString().slice(0, 10)}`
): void {
  if (cuotas.length === 0) return;

  const mesesOrdenados = [...new Set(cuotas.map((c) => c.mes))].sort();
  const getNombreMes = (mesStr: string) => {
    if (!mesStr) return '-';
    const [año, mes] = mesStr.split('-');
    const fecha = new Date(parseInt(año), parseInt(mes) - 1, 1);
    return fecha.toLocaleString('es-AR', { month: 'short', year: '2-digit' });
  };

  const sociosMap = new Map<number, { numeroSocio: number; apellido: string; nombre: string }>();
  cuotas.forEach((c) => {
    if (!sociosMap.has(c.socioId)) {
      sociosMap.set(c.socioId, {
        numeroSocio: c.numeroSocio ?? 0,
        apellido: c.apellido ?? '',
        nombre: c.nombre ?? '',
      });
    }
  });

  const sociosOrdenados = Array.from(sociosMap.entries()).sort(
    (a, b) => (a[1].numeroSocio || 0) - (b[1].numeroSocio || 0)
  );

  const cuotasPorSocioMes = new Map<string, { monto: number; pagado: boolean }>();
  cuotas.forEach((c) => {
    const key = `${c.socioId}-${c.mes}`;
    cuotasPorSocioMes.set(key, { monto: c.monto, pagado: c.pagado });
  });

  const data: (string | number)[][] = [];
  const header = ['N° Socio', 'Apellido', 'Nombre', ...mesesOrdenados.map(getNombreMes)];
  data.push(header);

  sociosOrdenados.forEach(([socioId, info]) => {
    const row: (string | number)[] = [
      info.numeroSocio,
      info.apellido,
      info.nombre,
    ];
    mesesOrdenados.forEach((mes) => {
      const cell = cuotasPorSocioMes.get(`${socioId}-${mes}`);
      row.push(cell ? cell.monto : '');
    });
    data.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  sociosOrdenados.forEach(([socioId], rowIdx) => {
    mesesOrdenados.forEach((mes, colIdx) => {
      const cellAddr = XLSX.utils.encode_cell({ r: rowIdx + 1, c: colIdx + 3 });
      let cell = ws[cellAddr];
      if (!cell) {
        cell = { t: 's', v: '', s: {} };
        ws[cellAddr] = cell;
      }
      const info = cuotasPorSocioMes.get(`${socioId}-${mes}`);
      if (!info) {
        cell.s = { fill: FILL_GRIS };
      } else if (info.monto === 0) {
        cell.s = { fill: FILL_VERDE };
      } else {
        cell.s = { fill: info.pagado ? FILL_VERDE : FILL_ROJO };
      }
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Liquidaciones');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
