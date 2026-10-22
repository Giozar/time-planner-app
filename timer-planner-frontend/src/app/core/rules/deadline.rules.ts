import { Activity, SubActivity } from '../models/activity.model';

export enum DeadlineConflictKind {
  /** Sesiones de una tarea simple posteriores a su deadline. */
  ACTIVITY_DATES = 'ACTIVITY_DATES',
  /** Deadline propio de un paso posterior al de su tarea. */
  STEP_DEADLINE = 'STEP_DEADLINE',
  /** Sesiones de un paso posteriores a su deadline efectivo. */
  STEP_DATES = 'STEP_DATES',
}

export interface DeadlineConflict {
  kind: DeadlineConflictKind;
  id: string;
  title: string;
  /** Fechas que incumplen (para `STEP_DEADLINE`, el deadline del paso). */
  dates: string[];
}

/** Deadline de un paso: el propio o, si no tiene, el de su tarea (RN-48). */
export function effectiveDeadline(step: Pick<SubActivity, 'deadline'>, activity: Pick<Activity, 'deadline'>): string {
  return step.deadline ?? activity.deadline;
}

/**
 * Valida una tarea y sus pasos contra los límites de deadline (RN-48, RN-49).
 * Se llama con el estado **candidato** (ya con el cambio aplicado) antes de guardar.
 * Una lista vacía significa que se puede guardar; si no, el guardado se rechaza
 * y se muestran las fechas en conflicto, sin recortar nada en silencio.
 */
export function validateDeadlines(activity: Activity, steps: readonly SubActivity[]): DeadlineConflict[] {
  const conflicts: DeadlineConflict[] = [];

  const lateActivityDates = (activity.executionPlan?.dates ?? []).filter(d => d > activity.deadline);
  if (lateActivityDates.length > 0) {
    conflicts.push({
      kind: DeadlineConflictKind.ACTIVITY_DATES,
      id: activity.id,
      title: activity.title,
      dates: lateActivityDates,
    });
  }

  for (const step of steps) {
    if (step.deadline && step.deadline > activity.deadline) {
      conflicts.push({
        kind: DeadlineConflictKind.STEP_DEADLINE,
        id: step.id,
        title: step.title,
        dates: [step.deadline],
      });
    }

    const limit = effectiveDeadline(step, activity);
    const lateStepDates = (step.executionPlan.dates ?? []).filter(d => d > limit);
    if (lateStepDates.length > 0) {
      conflicts.push({
        kind: DeadlineConflictKind.STEP_DATES,
        id: step.id,
        title: step.title,
        dates: lateStepDates,
      });
    }
  }

  return conflicts;
}
