import { WEEK_DAYS_ORDER } from '../models/activity.model';
import { addDays, weekDayOf } from './calendar.rules';

/** Celda de la cuadrícula mensual. */
export interface CalendarCell {
  date: string; // 'YYYY-MM-DD'
  inMonth: boolean; // `false` en los días de relleno de meses vecinos
}

export interface YearMonth {
  year: number;
  month: number; // 1 a 12
}

const WEEKS = 6;
const DAYS_PER_WEEK = 7;

const pad = (n: number, size: number) => String(n).padStart(size, '0');

function firstDayOf(year: number, month: number): string {
  return `${pad(year, 4)}-${pad(month, 2)}-01`;
}

/** Cantidad de días del mes (`month` de 1 a 12). */
export function daysInMonth(year: number, month: number): number {
  const next = month === 12 ? firstDayOf(year + 1, 1) : firstDayOf(year, month + 1);
  return Number(addDays(next, -1).slice(8, 10));
}

/**
 * Cuadrícula del mes: 6 semanas × 7 días, semana desde el lunes (RN-66).
 * Siempre tiene 42 celdas, para que la altura no cambie al navegar.
 */
export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const first = firstDayOf(year, month);
  const offset = WEEK_DAYS_ORDER.indexOf(weekDayOf(first));
  const start = addDays(first, -offset);
  const prefix = first.slice(0, 7);

  return Array.from({ length: WEEKS * DAYS_PER_WEEK }, (_, i) => {
    const date = addDays(start, i);
    return { date, inMonth: date.startsWith(prefix) };
  });
}

/** Mes anterior o siguiente (`delta` puede ser negativo), cruzando de año si hace falta. */
export function shiftMonth(year: number, month: number, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 };
}

/** Mismo mes en otro año. */
export function shiftYear(year: number, month: number, delta: number): YearMonth {
  return { year: year + delta, month };
}
