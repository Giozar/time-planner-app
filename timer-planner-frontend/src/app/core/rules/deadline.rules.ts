import { Activity, SubActivity } from '../models/activity.model';
import { Objective } from '../models/objective.model';

export enum DeadlineConflictKind {
  /** Deadline propio de una tarea posterior al de su objetivo. */
  ACTIVITY_DEADLINE = 'ACTIVITY_DEADLINE',
  /** Sesiones de una tarea simple posteriores a su deadline efectivo. */
  ACTIVITY_DATES = 'ACTIVITY_DATES',
  /** Deadline propio de un paso posterior al efectivo de su tarea. */
  STEP_DEADLINE = 'STEP_DEADLINE',
  /** Sesiones de un paso posteriores a su deadline efectivo. */
  STEP_DATES = 'STEP_DATES',
}

export interface DeadlineConflict {
  kind: DeadlineConflictKind;
  id: string;
  title: string;
  /** Fechas que incumplen (para `*_DEADLINE`, el deadline propio). */
  dates: string[];
}

/** Deadline efectivo: el propio o, si no tiene, el de su padre (RN-14, RN-48). */
export function effectiveDeadline(own: { deadline?: string }, parentDeadline: string): string {
  return own.deadline ?? parentDeadline;
}

/** Deadline efectivo de una tarea: el propio o el de su objetivo. */
export function effectiveActivityDeadline(
  activity: Pick<Activity, 'deadline'>,
  objective: Pick<Objective, 'deadline'>,
): string {
  return effectiveDeadline(activity, objective.deadline);
}

/**
 * Valida un objetivo, sus tareas y sus pasos contra la cadena de topes
 * objetivo → tarea → paso (RN-48, RN-49, RN-65).
 * Se llama con el estado **candidato** (ya con el cambio aplicado) antes de guardar.
 * Una lista vacía significa que se puede guardar; si no, el guardado se rechaza
 * y se muestran las fechas en conflicto, sin recortar nada en silencio.
 */
export function validateDeadlines(
  objective: Pick<Objective, 'deadline'>,
  activities: readonly Activity[],
  steps: readonly SubActivity[],
): DeadlineConflict[] {
  const conflicts: DeadlineConflict[] = [];

  for (const activity of activities) {
    if (activity.deadline && activity.deadline > objective.deadline) {
      conflicts.push({
        kind: DeadlineConflictKind.ACTIVITY_DEADLINE,
        id: activity.id,
        title: activity.title,
        dates: [activity.deadline],
      });
    }

    const activityLimit = effectiveActivityDeadline(activity, objective);
    const lateActivityDates = (activity.executionPlan?.dates ?? []).filter(d => d > activityLimit);
    if (lateActivityDates.length > 0) {
      conflicts.push({
        kind: DeadlineConflictKind.ACTIVITY_DATES,
        id: activity.id,
        title: activity.title,
        dates: lateActivityDates,
      });
    }

    for (const step of steps.filter(s => s.activityId === activity.id)) {
      if (step.deadline && step.deadline > activityLimit) {
        conflicts.push({
          kind: DeadlineConflictKind.STEP_DEADLINE,
          id: step.id,
          title: step.title,
          dates: [step.deadline],
        });
      }

      const stepLimit = effectiveDeadline(step, activityLimit);
      const lateStepDates = (step.executionPlan.dates ?? []).filter(d => d > stepLimit);
      if (lateStepDates.length > 0) {
        conflicts.push({
          kind: DeadlineConflictKind.STEP_DATES,
          id: step.id,
          title: step.title,
          dates: lateStepDates,
        });
      }
    }
  }

  return conflicts;
}
