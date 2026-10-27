import { ExecutionPlanType, WeekDay } from '../models/activity.model';
import { ExecutionSession, SessionStatus } from '../models/session.model';
import { generateDatesFromPattern } from './calendar.rules';

/** Plan que el usuario pide al editar; las fechas del patrón se generan, no se reciben. */
export interface PlanRequest {
  type: ExecutionPlanType;
  patternDays?: WeekDay[]; // WEEKLY_PATTERN
  dates?: string[]; // SPECIFIC_DATES
  durationPerExecutionMin: number;
}

/**
 * Sesiones de un plan tras crearlo o editarlo (RN-21, RN-22, RN-51).
 * - Se conservan las sesiones anteriores a `today`, las `DONE` y las movidas (RN-82), con sus minutos previstos originales.
 * - Se reemplazan las demás `PLANNED` de hoy y futuras: patrón desde hoy hasta `deadline` (inclusive),
 *   o las fechas elegidas que no sean pasadas.
 * - No se vuelve a generar una fecha ya conservada ni la fecha original de una sesión movida.
 */
export function regenerateFutureSessions(
  previous: readonly ExecutionSession[],
  request: PlanRequest,
  today: string,
  deadline: string,
  planId: string,
): ExecutionSession[] {
  const kept = previous.filter(s => s.planId === planId
    && (s.scheduledDate < today || s.status === SessionStatus.DONE || s.rescheduledFrom !== undefined));
  const keptDates = new Set(kept.map(s => s.rescheduledFrom ?? s.scheduledDate));

  const target = request.type === ExecutionPlanType.WEEKLY_PATTERN
    ? generateDatesFromPattern(today, deadline, request.patternDays ?? [])
    : (request.dates ?? []).filter(d => d >= today);

  const created: ExecutionSession[] = [...new Set(target)]
    .filter(date => !keptDates.has(date))
    .map(date => ({
      id: crypto.randomUUID(),
      planId,
      scheduledDate: date,
      plannedMinutes: request.durationPerExecutionMin,
      status: SessionStatus.PLANNED,
    }));

  return [...kept, ...created].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}

/**
 * Se puede mover (RN-82): `PLANNED` de hoy o futura.
 * Que su tarea simple o paso esté abierto lo comprueba quien llama.
 */
export function canMoveSession(session: ExecutionSession, today: string): boolean {
  return session.status === SessionStatus.PLANNED && session.scheduledDate >= today;
}

/**
 * La sesión en `date` (RN-82). Recuerda la fecha que generó el plan para no volver a crearla al editarlo (RN-51);
 * si vuelve a esa fecha, deja de contar como movida.
 */
export function moveSessionTo(session: ExecutionSession, date: string): ExecutionSession {
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
