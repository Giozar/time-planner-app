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
 * `closed`: la simple tiene cierre guardado o la compuesta tiene todos sus pasos cerrados (RN-77, RN-78);
 * queda `COMPLETED` al 100 % y `OVERDUE` si no. Llegar a 100 % también la cierra como completada (RN-77).
 * El cierre prevalece sobre la pausa: `PAUSED` es una decisión del usuario y se conserva mientras no esté cerrada (RN-59).
 */
export function deriveStatus(progress: number, current?: ActivityStatus, closed = false): ActivityStatus {
  if (closed) return progress >= 100 ? ActivityStatus.COMPLETED : ActivityStatus.OVERDUE;
  if (progress >= 100) return ActivityStatus.COMPLETED;
  if (current === ActivityStatus.PAUSED) return ActivityStatus.PAUSED;
  return progress <= 0 ? ActivityStatus.PENDING : ActivityStatus.IN_PROGRESS;
}

/** Estado de un paso según su progreso (RN-31); `closed` si tiene cierre guardado (RN-77). */
export function deriveSubActivityStatus(progress: number, closed = false): SubActivityStatus {
  if (progress >= 100) return SubActivityStatus.COMPLETED;
  if (closed) return SubActivityStatus.OVERDUE;
  return progress <= 0 ? SubActivityStatus.PENDING : SubActivityStatus.IN_PROGRESS;
}
