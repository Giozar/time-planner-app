import { Activity, ActivityStatus } from '../models/activity.model';
import { Objective, ObjectiveStatus } from '../models/objective.model';

/**
 * Tarea vencida: no completada y con deadline anterior a hoy (RN-58).
 * Estado derivado: se calcula al mostrar, nunca se almacena.
 */
export function isOverdue(activity: Pick<Activity, 'status' | 'deadline'>, today: string): boolean {
  return activity.status !== ActivityStatus.COMPLETED && activity.deadline < today;
}

/** El usuario solo puede cerrar un objetivo activo con progreso 100% (RN-63). */
export function canCloseObjective(objective: Pick<Objective, 'status' | 'progress'>): boolean {
  return objective.status === ObjectiveStatus.ACTIVE && objective.progress >= 100;
}

/**
 * Estado del objetivo tras recalcular su progreso (RN-64).
 * Un objetivo `COMPLETED` que baja de 100% vuelve a `ACTIVE`; en cualquier otro caso no cambia.
 * Llegar a 100% nunca lo cierra (RN-63).
 */
export function reopenIfBelowComplete(objective: Pick<Objective, 'status' | 'progress'>): ObjectiveStatus {
  if (objective.status === ObjectiveStatus.COMPLETED && objective.progress < 100) {
    return ObjectiveStatus.ACTIVE;
  }
  return objective.status;
}
