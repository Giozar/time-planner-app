import { WeekDay } from '../models/activity.model';

/**
 * Aritmética de fechas calendario ('YYYY-MM-DD') sin `new Date(string)`.
 * Trabaja con números de día (días desde 1970-01-01) para no depender de la zona horaria.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Índice 0 = domingo, igual que `Date.getDay()`, pero calculado sin `Date`.
const WEEK_DAY_BY_INDEX: readonly WeekDay[] = [
  WeekDay.SUNDAY,
  WeekDay.MONDAY,
  WeekDay.TUESDAY,
  WeekDay.WEDNESDAY,
  WeekDay.THURSDAY,
  WeekDay.FRIDAY,
  WeekDay.SATURDAY,
];

// Algoritmo "days from civil" (calendario gregoriano proléptico).
function toDayNumber(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (month + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function fromDayNumber(dayNumber: number): string {
  const z = dayNumber + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parse(date: string): number {
  const match = ISO_DATE.exec(date);
  if (!match) throw new Error(`Fecha inválida: "${date}" (se espera YYYY-MM-DD)`);
  return toDayNumber(Number(match[1]), Number(match[2]), Number(match[3]));
}

/** `true` si la cadena es una fecha calendario real en formato 'YYYY-MM-DD'. */
export function isValidISODate(date: string): boolean {
  const match = ISO_DATE.exec(date);
  if (!match) return false;
  return fromDayNumber(toDayNumber(Number(match[1]), Number(match[2]), Number(match[3]))) === date;
}

/** Suma (o resta, si es negativo) días a una fecha. */
export function addDays(date: string, days: number): string {
  return fromDayNumber(parse(date) + days);
}

/** Día de la semana de una fecha, sin pasar por la zona horaria. */
export function weekDayOf(date: string): WeekDay {
  // 1970-01-01 (día 0) fue jueves (índice 4).
  const index = (((parse(date) + 4) % 7) + 7) % 7;
  return WEEK_DAY_BY_INDEX[index];
}

/**
 * Fechas entre `start` y `end` (ambas incluidas) cuyo día de la semana está en `days`.
 * Reemplaza a `DateUtils.generateDatesFromPattern` (RN-21).
 */
export function generateDatesFromPattern(start: string, end: string, days: readonly WeekDay[]): string[] {
  const dates: string[] = [];
  const last = parse(end);
  for (let current = parse(start); current <= last; current++) {
    const date = fromDayNumber(current);
    if (days.includes(weekDayOf(date))) dates.push(date);
  }
  return dates;
}
