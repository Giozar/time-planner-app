import { SessionState, SessionStatus } from '../models/session.model';
import { GoalHorizon, GoalStatus } from '../models/goal.model';
import type { HierarchyLevel } from '../models/hierarchy.model';
import { DeletableType } from '../models/deletion-impact.model';
import { DeadlineConflictKind } from '../rules/deadline.rules';
import { ObjectiveNature, ObjectiveStatus } from '../models/objective.model';
import {
  ActivityComplexity,
  ActivityCriticality,
  ActivityPriority,
  ActivityRecurrence,
  ActivityStatus,
  ActivityType,
  ClosureType,
  ExecutionPlanType,
  SubActivityStatus,
  TaskSourceType,
  WeekDay,
} from '../models/activity.model';

export const GOAL_HORIZON_LABELS: Record<GoalHorizon, string> = {
  [GoalHorizon.SHORT_TERM]: 'Corto plazo',
  [GoalHorizon.MEDIUM_TERM]: 'Mediano plazo',
  [GoalHorizon.LONG_TERM]: 'Largo plazo',
};

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  [GoalStatus.IDEA]: 'Idea',
  [GoalStatus.OPEN]: 'Abierta',
  [GoalStatus.PAUSED]: 'Pausada',
  [GoalStatus.CLOSED]: 'Cerrada',
};

export const OBJECTIVE_NATURE_LABELS: Record<ObjectiveNature, string> = {
  [ObjectiveNature.PERSONAL]: 'Personal',
  [ObjectiveNature.PROFESSIONAL]: 'Profesional',
  [ObjectiveNature.HEALTH]: 'Salud',
  [ObjectiveNature.FINANCE]: 'Finanzas',
  [ObjectiveNature.LEARNING]: 'Aprendizaje',
  [ObjectiveNature.HABIT]: 'Hábito',
  [ObjectiveNature.WELLBEING]: 'Bienestar',
  [ObjectiveNature.OTHER]: 'Otro',
};

export const OBJECTIVE_STATUS_LABELS: Record<ObjectiveStatus, string> = {
  [ObjectiveStatus.OPEN]: 'Abierto',
  [ObjectiveStatus.PAUSED]: 'Pausado',
  [ObjectiveStatus.CLOSED]: 'Cerrado',
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  [ActivityType.SIMPLE]: 'Simple',
  [ActivityType.COMPOSITE]: 'Compuesta',
};

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  [ActivityStatus.OPEN]: 'Abierta',
  [ActivityStatus.PAUSED]: 'Pausada',
  [ActivityStatus.CLOSED]: 'Cerrada',
};

export const SUBACTIVITY_STATUS_LABELS: Record<SubActivityStatus, string> = {
  [SubActivityStatus.OPEN]: 'Abierto',
  [SubActivityStatus.PAUSED]: 'Pausado',
  [SubActivityStatus.CLOSED]: 'Cerrado',
};

/** Motivo del cierre, solo informativo; se muestra junto al estado: «Cerrada · a mano» (RN-77). */
export const CLOSURE_TYPE_LABELS: Record<ClosureType, string> = {
  [ClosureType.MANUAL]: 'a mano',
  [ClosureType.DEADLINE]: 'por fecha límite',
  [ClosureType.COMPLETED]: 'al completarse',
  [ClosureType.CHILDREN_CLOSED]: 'por cierre de sus hijos',
};

export const ACTIVITY_PRIORITY_LABELS: Record<ActivityPriority, string> = {
  [ActivityPriority.HIGH]: 'Alta',
  [ActivityPriority.MEDIUM]: 'Media',
  [ActivityPriority.LOW]: 'Baja',
};

export const ACTIVITY_CRITICALITY_LABELS: Record<ActivityCriticality, string> = {
  [ActivityCriticality.VITAL]: 'Vital',
  [ActivityCriticality.ESSENTIAL_RECURRING]: 'Esencial recurrente',
  [ActivityCriticality.FLEXIBLE]: 'Flexible',
};

export const ACTIVITY_COMPLEXITY_LABELS: Record<ActivityComplexity, string> = {
  [ActivityComplexity.LOW]: 'Baja',
  [ActivityComplexity.MEDIUM]: 'Media',
  [ActivityComplexity.HIGH]: 'Alta',
};

export const ACTIVITY_RECURRENCE_LABELS: Record<ActivityRecurrence, string> = {
  [ActivityRecurrence.SINGLE]: 'Única',
  [ActivityRecurrence.WEEKLY_PATTERN]: 'Patrón semanal',
  [ActivityRecurrence.SPECIFIC_DATES]: 'Fechas específicas',
};

export const EXECUTION_PLAN_TYPE_LABELS: Record<ExecutionPlanType, string> = {
  [ExecutionPlanType.WEEKLY_PATTERN]: 'Patrón repetitivo',
  [ExecutionPlanType.SPECIFIC_DATES]: 'Fechas específicas',
};

export const WEEK_DAY_LABELS: Record<WeekDay, string> = {
  [WeekDay.MONDAY]: 'Lun',
  [WeekDay.TUESDAY]: 'Mar',
  [WeekDay.WEDNESDAY]: 'Mié',
  [WeekDay.THURSDAY]: 'Jue',
  [WeekDay.FRIDAY]: 'Vie',
  [WeekDay.SATURDAY]: 'Sáb',
  [WeekDay.SUNDAY]: 'Dom',
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  [SessionStatus.PLANNED]: 'Programada',
  [SessionStatus.DONE]: 'Realizada',
};

/** Estado calculado de la sesión (RN-69), en femenino. */
export const SESSION_STATE_LABELS: Record<SessionState, string> = {
  [SessionState.OPEN]: 'Abierta',
  [SessionState.PAUSED]: 'Pausada',
  [SessionState.CLOSED]: 'Cerrada',
};

export const TASK_SOURCE_TYPE_LABELS: Record<TaskSourceType, string> = {
  [TaskSourceType.ACTIVITY]: 'Tarea',
  [TaskSourceType.SUBACTIVITY]: 'Paso',
};

export const DELETABLE_TYPE_LABELS: Record<DeletableType, string> = {
  [DeletableType.GOAL]: 'meta',
  [DeletableType.OBJECTIVE]: 'objetivo',
  [DeletableType.ACTIVITY]: 'tarea',
  [DeletableType.STEP]: 'paso',
};

export const DEADLINE_CONFLICT_LABELS: Record<DeadlineConflictKind, string> = {
  [DeadlineConflictKind.OBJECTIVE_DEADLINE]: 'Deadline del objetivo',
  [DeadlineConflictKind.ACTIVITY_DEADLINE]: 'Deadline de la tarea',
  [DeadlineConflictKind.ACTIVITY_DATES]: 'Sesiones de la tarea',
  [DeadlineConflictKind.STEP_DEADLINE]: 'Deadline del paso',
  [DeadlineConflictKind.STEP_DATES]: 'Sesiones del paso',
};

/** Textos de resultado (RN-84) y vencido (RN-85); no son valores de un enum: se calculan con el avance y el deadline. */
export interface ResultLabels {
  complete: string;
  incomplete: string;
  overdue: string;
}

const FEMININE_RESULT: ResultLabels = { complete: 'Completa', incomplete: 'Incompleta', overdue: 'Vencida' };
const MASCULINE_RESULT: ResultLabels = { complete: 'Completo', incomplete: 'Incompleto', overdue: 'Vencido' };

/** En el género de cada nivel: meta y tarea en femenino; objetivo y paso en masculino. */
export const RESULT_LABELS: Record<HierarchyLevel, ResultLabels> = {
  goal: FEMININE_RESULT,
  objective: MASCULINE_RESULT,
  activity: FEMININE_RESULT,
  step: MASCULINE_RESULT,
};

/** La sesión, en femenino (RN-69). */
export const SESSION_RESULT_LABELS: ResultLabels = FEMININE_RESULT;

/** Meses en español; el índice es `mes - 1`. */
export const MONTH_LABELS: readonly string[] = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
