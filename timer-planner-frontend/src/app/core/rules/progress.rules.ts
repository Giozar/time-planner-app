import { ExecutionSession } from '../models/session.model';
import { doneRatio } from './consistency.rules';
import { actualMinutesOf, plannedMinutesOf } from './session.rules';

/**
 * Productividad (RN-73): tiempo realizado sobre el previsto de todas las sesiones, redondeado.
 * `null` si no hay tiempo previsto. Puede pasar de 100 %.
 */
export function computeProductivity(actualMinutes: number, plannedMinutes: number): number | null {
  if (plannedMinutes <= 0) return null;
  return Math.round((actualMinutes / plannedMinutes) * 100);
}

/**
 * Avance (RN-30 a RN-35): promedio de la constancia y la productividad, con la productividad topada en 100 %,
 * sin redondear las partes; 0 si no hay sesiones. Los padres suman las sesiones y los minutos de sus ítems ejecutables.
 */
export function computeProgress(sessions: readonly ExecutionSession[]): number {
  if (sessions.length === 0) return 0;
  const planned = plannedMinutesOf(sessions);
  const productivity = planned > 0 ? Math.min(actualMinutesOf(sessions) / planned, 1) : 0;
  return Math.round(((doneRatio(sessions) + productivity) / 2) * 100);
}

/** Avance de una sesión (RN-69): 0 % si no se hizo; si se hizo, promedio de 100 % y su productividad topada. */
export function sessionProgress(session: ExecutionSession): number {
  return computeProgress([session]);
}

/** Resultado (RN-84): completo al llegar a 100 % de avance; si no, incompleto. */
export function isComplete(progress: number): boolean {
  return progress >= 100;
}

/** Vencido (RN-85): su deadline efectivo ya pasó y su avance es 0 %. Sin deadline no se vence. */
export function isOverdue(deadline: string | null | undefined, progress: number, today: string): boolean {
  return !!deadline && deadline < today && progress === 0;
}
