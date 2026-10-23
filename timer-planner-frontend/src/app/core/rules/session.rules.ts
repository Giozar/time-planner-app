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
 * - Se conservan las sesiones anteriores a `today` y las `DONE`, con sus minutos previstos originales.
 * - Se reemplazan las `PLANNED` de hoy y futuras: patrón desde hoy hasta `deadline` (inclusive),
 *   o las fechas elegidas que no sean pasadas.
 * - Una fecha ya conservada no se duplica (una sesión por fecha y plan).
 */
export function regenerateFutureSessions(
  previous: readonly ExecutionSession[],
  request: PlanRequest,
  today: string,
  deadline: string,
  planId: string,
): ExecutionSession[] {
  const kept = previous.filter(s => s.planId === planId && (s.scheduledDate < today || s.status === SessionStatus.DONE));
  const keptDates = new Set(kept.map(s => s.scheduledDate));

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

/** Minutos previstos de un conjunto de sesiones (RN-24). */
export function plannedMinutesOf(sessions: readonly ExecutionSession[]): number {
  return sessions.reduce((sum, s) => sum + s.plannedMinutes, 0);
}
