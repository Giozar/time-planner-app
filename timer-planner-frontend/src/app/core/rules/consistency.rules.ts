import { ExecutionSession, SessionStatus } from '../models/session.model';

/** Proporción de sesiones `DONE`, de 0 a 1; 0 si no hay. */
export function doneRatio(sessions: readonly ExecutionSession[]): number {
  if (sessions.length === 0) return 0;
  return sessions.filter(s => s.status === SessionStatus.DONE).length / sessions.length;
}

/**
 * Constancia (RN-70): sesiones `DONE` sobre todas, redondeado; `null` si no hay sesiones.
 * Cuenta también las futuras, las de fechas en pausa y las posteriores a un cierre (RN-79).
 * En tarea simple y paso son las de su plan; en los padres, las de todos sus ítems ejecutables, sin promediar (RN-35).
 */
export function computeConsistency(sessions: readonly ExecutionSession[]): number | null {
  if (sessions.length === 0) return null;
  return Math.round(doneRatio(sessions) * 100);
}
