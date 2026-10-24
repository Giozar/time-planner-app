import { ClosureType, ItemClosure } from '../models/activity.model';
import { GoalStatus } from '../models/goal.model';
import { ObjectiveStatus } from '../models/objective.model';
import { ExecutionSession, SessionStatus } from '../models/session.model';
import { addDays } from './calendar.rules';

/** Cerrado: completado (100 %) o vencido (RN-77, RN-78). Vale para paso, tarea y objetivo. */
export function isClosed(item: { status: string }): boolean {
  return item.status === 'COMPLETED' || item.status === 'OVERDUE';
}

/**
 * Cierre vigente de una tarea simple o un paso (RN-77).
 * Si no está cerrado ni al 100 % y su deadline efectivo ya pasó, se cierra solo al día siguiente.
 */
export function autoClosure(
  closure: ItemClosure | undefined,
  progress: number,
  deadline: string,
  today: string,
): ItemClosure | undefined {
  if (closure || progress >= 100 || deadline >= today) return closure;
  return { type: ClosureType.AUTOMATIC, closedOn: addDays(deadline, 1) };
}

/** El cierre manual deja el avance en 100 %; el automático conserva el calculado (RN-77, RN-79). */
export function closedProgress(progress: number, closure: ItemClosure | undefined): number {
  return closure?.type === ClosureType.MANUAL ? 100 : progress;
}

/**
 * Sesión cubierta por un cierre manual: no realizada y posterior al día del cierre (RN-79).
 * Se muestra completa, no se marca y no cuenta para la constancia ni para el cierre del día.
 */
export function isCoveredByClosure(session: ExecutionSession, closure: ItemClosure | undefined): boolean {
  return closure?.type === ClosureType.MANUAL
    && session.status !== SessionStatus.DONE
    && session.scheduledDate > closure.closedOn;
}

/**
 * Estado del objetivo (RN-78): cerrado cuando todas sus tareas lo están, completado al 100 % y vencido si no.
 * Si recibe una tarea abierta vuelve a `ACTIVE` (reapertura).
 */
export function deriveObjectiveStatus(
  current: ObjectiveStatus,
  progress: number,
  tasks: readonly { status: string }[],
): ObjectiveStatus {
  if (tasks.length > 0 && tasks.every(isClosed)) {
    return progress >= 100 ? ObjectiveStatus.COMPLETED : ObjectiveStatus.OVERDUE;
  }
  return current === ObjectiveStatus.PAUSED ? ObjectiveStatus.PAUSED : ObjectiveStatus.ACTIVE;
}

/**
 * Estado de la meta (RN-78): una meta activa queda `FINISHED` cuando todos sus objetivos están cerrados,
 * y vuelve a `ACTIVE` si recibe uno abierto. Las ideas y las metas pausadas no cambian.
 */
export function deriveGoalStatus(current: GoalStatus, objectives: readonly { status: string }[]): GoalStatus {
  if (current !== GoalStatus.ACTIVE && current !== GoalStatus.FINISHED) return current;
  return objectives.length > 0 && objectives.every(isClosed) ? GoalStatus.FINISHED : GoalStatus.ACTIVE;
}
