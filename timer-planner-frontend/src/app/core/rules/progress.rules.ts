import { ExecutionSession, SessionStatus } from '../models/session.model';

/**
 * Avance (RN-30 a RN-35): sesiones `DONE` sobre todas las sesiones dadas, redondeado; 0 si no hay.
 * En tarea simple y paso son las de su plan; en los padres, las de todos sus ítems ejecutables, sin promediar.
 */
export function computeProgress(sessions: readonly ExecutionSession[]): number {
  if (sessions.length === 0) return 0;
  const done = sessions.filter(s => s.status === SessionStatus.DONE).length;
  return Math.round((done / sessions.length) * 100);
}

/**
 * Productividad (RN-73): minutos reales sobre minutos previstos de todo el plan, redondeado.
 * `null` si no hay minutos previstos. Puede pasar de 100 %.
 */
export function computeProductivity(actualMinutes: number, plannedMinutes: number): number | null {
  if (plannedMinutes <= 0) return null;
  return Math.round((actualMinutes / plannedMinutes) * 100);
}
