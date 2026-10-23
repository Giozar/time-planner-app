import { ActivityStatus, SubActivityStatus } from '../models/activity.model';
import { ExecutionSession, SessionStatus } from '../models/session.model';

/** Promedio simple redondeado; 0 si no hay valores (RN-32 a RN-35). */
export function averageProgress(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Progreso de un ítem ejecutable (tarea simple o paso): sesiones `DONE` sobre todas las de su plan (RN-30). */
export function computeProgress(sessions: readonly ExecutionSession[]): number {
  if (sessions.length === 0) return 0;
  const done = sessions.filter(s => s.status === SessionStatus.DONE).length;
  return Math.round((done / sessions.length) * 100);
}

/**
 * Estado de una tarea según su progreso (RN-31, RN-32).
 * `PAUSED` es una decisión del usuario, no del progreso: se conserva (RN-59).
 * `OVERDUE` nunca se devuelve: es derivado (ver `isOverdue`).
 */
export function deriveStatus(progress: number, current?: ActivityStatus): ActivityStatus {
  if (current === ActivityStatus.PAUSED) return ActivityStatus.PAUSED;
  if (progress >= 100) return ActivityStatus.COMPLETED;
  return progress <= 0 ? ActivityStatus.PENDING : ActivityStatus.IN_PROGRESS;
}

/** Estado de un paso según su progreso (RN-31). */
export function deriveSubActivityStatus(progress: number): SubActivityStatus {
  if (progress >= 100) return SubActivityStatus.COMPLETED;
  return progress <= 0 ? SubActivityStatus.PENDING : SubActivityStatus.IN_PROGRESS;
}
