import { ExecutionPlanType, WeekDay } from '../models/activity.model';
import { ExecutionSession, SessionStatus } from '../models/session.model';
import { generateDatesFromPattern } from './calendar.rules';

/** Tiempo previsto mínimo de una sesión, también al ajustarla una por una (RN-15). */
export const MIN_SESSION_MINUTES = 5;

/** Plan que el usuario pide al editar; las fechas del patrón se generan, no se reciben. */
export interface PlanRequest {
  type: ExecutionPlanType;
  patternDays?: WeekDay[]; // WEEKLY_PATTERN
  dates?: string[]; // SPECIFIC_DATES
  durationPerExecutionMin: number;
}

/** `true` si es un tiempo previsto válido para una sesión (RN-15). */
export function isValidPlannedMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= MIN_SESSION_MINUTES;
}

/**
 * Sesiones de un plan tras crearlo o editarlo (RN-21, RN-22, RN-51).
 * - Se conservan las sesiones anteriores a `today`, las `DONE`, las movidas (RN-82) y las agregadas a mano (RN-83).
 * - Las demás `PLANNED` de hoy y futuras siguen el plan: patrón desde hoy hasta `deadline` (inclusive),
 *   o las fechas elegidas que no sean pasadas. Una fecha que ya tenía sesión la conserva, con su tiempo previsto;
 *   las fechas nuevas usan el tiempo del plan.
 * - No se vuelve a generar una fecha ya conservada, la fecha original de una sesión movida ni las de `excluded`
 *   (sesiones que el usuario borró mientras edita).
 */
export function regenerateFutureSessions(
  previous: readonly ExecutionSession[],
  request: PlanRequest,
  today: string,
  deadline: string,
  planId: string,
  excluded: ReadonlySet<string> = new Set(),
): ExecutionSession[] {
  const own = previous.filter(s => s.planId === planId);
  const isKept = (s: ExecutionSession) =>
    s.scheduledDate < today || s.status === SessionStatus.DONE || s.rescheduledFrom !== undefined || !!s.manual;
  const kept = own.filter(isKept);
  const keptDates = new Set(kept.map(s => s.rescheduledFrom ?? s.scheduledDate));
  const reusable = new Map(own.filter(s => !isKept(s)).map(s => [s.scheduledDate, s]));

  const target = request.type === ExecutionPlanType.WEEKLY_PATTERN
    ? generateDatesFromPattern(today, deadline, request.patternDays ?? [])
    : (request.dates ?? []).filter(d => d >= today);

  const planned: ExecutionSession[] = [...new Set(target)]
    .filter(date => !keptDates.has(date) && !excluded.has(date))
    .map(date => reusable.get(date) ?? {
      id: crypto.randomUUID(),
      planId,
      scheduledDate: date,
      plannedMinutes: request.durationPerExecutionMin,
      status: SessionStatus.PLANNED,
    });

  return [...kept, ...planned].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}

/** Con «mismo tiempo» (CU-31): las sesiones `PLANNED` de hoy en adelante toman `minutes`; las pasadas y las hechas no cambian. */
export function applySameTime(sessions: readonly ExecutionSession[], minutes: number, today: string): ExecutionSession[] {
  return sessions.map(s => s.status === SessionStatus.PLANNED && s.scheduledDate >= today ? { ...s, plannedMinutes: minutes } : s);
}

/** Sesión agregada a mano, fuera del plan (RN-83): `PLANNED`, se conserva al editar el plan (RN-51). */
export function manualSession(planId: string, date: string, plannedMinutes: number): ExecutionSession {
  return { id: crypto.randomUUID(), planId, scheduledDate: date, plannedMinutes, status: SessionStatus.PLANNED, manual: true };
}

/**
 * Fechas a las que se puede llevar una sesión al editarla (RN-82), sin pasar el deadline efectivo de su ítem:
 * una no hecha, de hoy en adelante; una hecha, hasta hoy, porque es el día en que se hizo. `min` es `null` si no hay tope inferior.
 */
export function sessionDateRange(done: boolean, today: string, deadline: string): { min: string | null; max: string } {
  return done ? { min: null, max: deadline < today ? deadline : today } : { min: today, max: deadline };
}

/** `true` si la sesión puede quedar en `date` (RN-82). Que su ítem no esté cerrado lo comprueba quien llama. */
export function canPlaceSession(done: boolean, date: string, today: string, deadline: string): boolean {
  const { min, max } = sessionDateRange(done, today, deadline);
  return date <= max && (min === null || date >= min);
}

/**
 * La sesión en `date` (RN-82). Recuerda la fecha que generó el plan para no volver a crearla al editarlo (RN-51);
 * si vuelve a esa fecha, deja de contar como movida. Una agregada a mano no tiene fecha generada.
 */
export function moveSessionTo(session: ExecutionSession, date: string): ExecutionSession {
  if (session.manual) return { ...session, scheduledDate: date };
  const original = session.rescheduledFrom ?? session.scheduledDate;
  return { ...session, scheduledDate: date, rescheduledFrom: date === original ? undefined : original };
}

/** Minutos previstos de un conjunto de sesiones (RN-24). */
export function plannedMinutesOf(sessions: readonly ExecutionSession[]): number {
  return sessions.reduce((sum, s) => sum + s.plannedMinutes, 0);
}

/** Tiempo realizado de un conjunto de sesiones (RN-71). */
export function actualMinutesOf(sessions: readonly ExecutionSession[]): number {
  return sessions.reduce((sum, s) => sum + (s.actualMinutes ?? 0), 0);
}
