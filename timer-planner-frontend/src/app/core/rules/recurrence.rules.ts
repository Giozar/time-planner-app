import {
  ActivityRecurrence,
  ActivityType,
  ExecutionPlan,
  ExecutionPlanType,
} from '../models/activity.model';

/**
 * Recurrencia calculada, no elegida (RN-47).
 * `null` en compuestas o si el plan no tiene sesiones.
 */
export function deriveRecurrence(
  type: ActivityType,
  plan: ExecutionPlan | null,
  sessionCount: number,
): ActivityRecurrence | null {
  if (type === ActivityType.COMPOSITE || !plan) return null;
  if (plan.type === ExecutionPlanType.WEEKLY_PATTERN) return ActivityRecurrence.WEEKLY_PATTERN;

  if (sessionCount === 0) return null;
  return sessionCount === 1 ? ActivityRecurrence.SINGLE : ActivityRecurrence.SPECIFIC_DATES;
}
