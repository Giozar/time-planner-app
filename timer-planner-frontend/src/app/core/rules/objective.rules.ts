import { Activity, ActivityStatus } from '../models/activity.model';

/**
 * Tarea vencida (RN-58): cerrada con menos de 100 % (`OVERDUE` guardado) o, si sigue abierta,
 * no completada y con deadline efectivo anterior a hoy. Lo segundo solo pasa con una compuesta sin pasos,
 * porque las tareas simples y los pasos se cierran solos al día siguiente de su deadline (RN-77).
 */
export function isOverdue(activity: Pick<Activity, 'status'>, effectiveDeadline: string, today: string): boolean {
  return activity.status !== ActivityStatus.COMPLETED && effectiveDeadline < today;
}
