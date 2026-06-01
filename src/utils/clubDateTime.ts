// Utilidades para parsear/mostrar fechas MySQL de forma estable.
// Objetivo: evitar corrimientos por zona horaria en campos MySQL tipo DATE (`YYYY-MM-DD`)
// y mantener horas consistentes en campos tipo DATETIME/TIMESTAMP (`YYYY-MM-DD HH:mm:ss`).

const DEFAULT_CLUB_OFFSET_HOURS = -3;
// Para Intl.DateTimeFormat, la zona "Etc/GMT+3" corresponde a UTC-3.
const DEFAULT_CLUB_TIMEZONE = 'America/Argentina/Buenos_Aires';
const DEFAULT_CLUB_TIMEZONE_OFFSET_HOURS = -3;

const TIMEZONE_OFFSETS: Record<string, number> = {
  'America/Argentina/Buenos_Aires': -3,
  'America/Argentina/Cordoba': -3,
  'America/Argentina/Salta': -3,
  'America/Santiago': -4,
  'America/Asuncion': -4,
  'America/Montevideo': -3,
  'America/Sao_Paulo': -3,
  'America/Lima': -5,
  UTC: 0,
};

let currentClubTimeZone = DEFAULT_CLUB_TIMEZONE;
let currentClubOffsetHours = DEFAULT_CLUB_TIMEZONE_OFFSET_HOURS;

const pad2 = (n: number) => String(n).padStart(2, '0');

export function configureClubDateTime(timeZone: string | null | undefined): void {
  if (!timeZone) {
    currentClubTimeZone = DEFAULT_CLUB_TIMEZONE;
    currentClubOffsetHours = DEFAULT_CLUB_TIMEZONE_OFFSET_HOURS;
    return;
  }
  currentClubTimeZone = timeZone;
  currentClubOffsetHours = TIMEZONE_OFFSETS[timeZone] ?? DEFAULT_CLUB_TIMEZONE_OFFSET_HOURS;
}

export function extractYMD(value: string | null | undefined): string | null {
  if (!value) return null;
  // DATE ISO: YYYY-MM-DD
  const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;

  // TIMESTAMP/Datetime: YYYY-MM-DD HH:mm:ss (o con "T")
  const m2 = /^(\d{4})-(\d{2})-(\d{2})[ T]/.exec(value.trim());
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;

  return null;
}

export function isYMD(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^(\d{4})-(\d{2})-(\d{2})$/.test(value.trim());
}

export function dateToYMDLocal(d: Date): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

export function formatDateOnlyESFromYMD(ymd: string | null | undefined): string {
  if (!ymd) return '-';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd;
  const [, y, mo, d] = m;
  return `${pad2(Number(d))}/${pad2(Number(mo))}/${y}`;
}

export function formatDateOnlyES(value: string | null | undefined): string {
  if (!value) return '-';
  const ymd = extractYMD(value);
  return ymd ? formatDateOnlyESFromYMD(ymd) : value;
}

// Parse estable de DATETIME/TIMESTAMP asumido como hora "del club" (offset configurable).
// - Si el string es YYYY-MM-DD HH:mm:ss, lo convierte a epochMs respetando offset.
// - Luego formatea usando Intl con timeZone del club.
export function formatDateTimeES(
  value: string | null | undefined,
  options?: {
    offsetHours?: number;
    timeZone?: string;
    withSeconds?: boolean;
  },
): string {
  if (!value) return '-';
  const trimmed = value.trim();

  const timeZone = options?.timeZone ?? currentClubTimeZone;
  const offsetHoursResolved = options?.offsetHours ?? currentClubOffsetHours ?? DEFAULT_CLUB_OFFSET_HOURS;
  const withSeconds = options?.withSeconds ?? true;

  // Si viene date-only, formatear como fecha.
  const ymd = extractYMD(trimmed);
  if (isYMD(trimmed)) return formatDateOnlyESFromYMD(ymd!);

  // DATETIME: YYYY-MM-DD HH:mm:ss
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(trimmed);
  if (!m) return trimmed;

  const [, yStr, moStr, dStr, hhStr, mmStr, ssStr] = m;
  const y = Number(yStr);
  const mo = Number(moStr);
  const d = Number(dStr);
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  const ss = Number(ssStr);

  // Convertir "hora del club" (UTC+offsetHours) a epochMs UTC.
  // Si offsetHours = -3, local = UTC-3 => UTC = local + 3 => hh - offsetHours.
  const epochMs = Date.UTC(y, mo - 1, d, hh - offsetHoursResolved, mm, ss);
  const dt = new Date(epochMs);

  return new Intl.DateTimeFormat('es-AR', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    hour12: false,
  }).format(dt);
}

export function compareYMD(a: string | null | undefined, b: string | null | undefined): number {
  const ya = extractYMD(a);
  const yb = extractYMD(b);
  if (!ya && !yb) return 0;
  if (!ya) return -1;
  if (!yb) return 1;
  // Como es YYYY-MM-DD, lexicográfico es cronológico.
  return ya.localeCompare(yb);
}

export function parseDateTimeToEpochMs(
  value: string | null | undefined,
  options?: {
    offsetHours?: number;
  },
): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  const offsetHours = options?.offsetHours ?? currentClubOffsetHours ?? DEFAULT_CLUB_OFFSET_HOURS;

  // Date-only => midnight local
  const ymd = extractYMD(trimmed);
  if (isYMD(trimmed)) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd!);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const epochMs = Date.UTC(y, mo - 1, d, 0 - offsetHours, 0, 0);
    return epochMs;
  }

  // Datetime: YYYY-MM-DD HH:mm:ss or with 'T'
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(trimmed);
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const hh = Number(m[4]);
  const mm = Number(m[5]);
  const ss = Number(m[6]);

  // Convertir "hora del club" (offset) a UTC epochMs.
  return Date.UTC(y, mo - 1, d, hh - offsetHours, mm, ss);
}

