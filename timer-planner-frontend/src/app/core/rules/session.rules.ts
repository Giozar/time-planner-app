import { ExecutionPlan, ExecutionPlanType, WeekDay } from '../models/activity.model';
import { generateDatesFromPattern } from './calendar.rules';

/** Plan que el usuario pide al editar; las fechas del patrón se generan, no se reciben. */
export interface PlanRequest {
  type: ExecutionPlanType;
  patternDays?: WeekDay[]; // WEEKLY_PATTERN
  dates?: string[]; // SPECIFIC_DATES
  durationPerExecutionMin: number;
}

/**
 * Crea o edita un plan conservando el pasado (RN-21, RN-22, RN-51).
 * - Las sesiones anteriores a `today` del plan previo se conservan, estén completadas o no.
 * - Las sesiones desde `today` se regeneran: patrón desde hoy hasta `deadline` (inclusive),
 *   o las fechas elegidas (ordenadas) que no sean pasadas.
 * - Se conservan las ejecuciones completadas que sigan siendo fechas del plan.
 */
export function regenerateFutureSessions(
  previous: ExecutionPlan | null,
  request: PlanRequest,
  today: string,
  deadline: string,
): ExecutionPlan {
  const keptPast = (previous?.dates ?? []).filter(d => d < today);

  const future = request.type === ExecutionPlanType.WEEKLY_PATTERN
    ? generateDatesFromPattern(today, deadline, request.patternDays ?? [])
    : (request.dates ?? []).filter(d => d >= today);

  const dates = [...new Set([...keptPast, ...future])].sort();
  const completedDates = (previous?.completedDates ?? []).filter(d => dates.includes(d));

  return {
    type: request.type,
    dates,
    patternDays: request.type === ExecutionPlanType.WEEKLY_PATTERN ? request.patternDays : undefined,
    durationPerExecutionMin: request.durationPerExecutionMin,
    completedDates,
  };
}
