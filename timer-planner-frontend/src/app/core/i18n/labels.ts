import { SessionStatus } from '../models/session.model';
import { GoalHorizon, GoalStatus } from '../models/goal.model';
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
  [GoalStatus.ACTIVE]: 'Activa',
  [GoalStatus.PAUSED]: 'Pausada',
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
  [ObjectiveStatus.ACTIVE]: 'Activo',
  [ObjectiveStatus.PAUSED]: 'Pausado',
  [ObjectiveStatus.COMPLETED]: 'Completado',
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  [ActivityType.SIMPLE]: 'Simple',
  [ActivityType.COMPOSITE]: 'Compuesta',
};

export const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  [ActivityStatus.PENDING]: 'Pendiente',
  [ActivityStatus.IN_PROGRESS]: 'En progreso',
  [ActivityStatus.COMPLETED]: 'Completada',
  [ActivityStatus.PAUSED]: 'Pausada',
  [ActivityStatus.OVERDUE]: 'Vencida',
};

export const SUBACTIVITY_STATUS_LABELS: Record<SubActivityStatus, string> = {
  [SubActivityStatus.PENDING]: 'Pendiente',
  [SubActivityStatus.IN_PROGRESS]: 'En progreso',
  [SubActivityStatus.COMPLETED]: 'Completada',
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
  [DeadlineConflictKind.ACTIVITY_DEADLINE]: 'Deadline de la tarea',
  [DeadlineConflictKind.ACTIVITY_DATES]: 'Sesiones de la tarea',
  [DeadlineConflictKind.STEP_DEADLINE]: 'Deadline del paso',
  [DeadlineConflictKind.STEP_DATES]: 'Sesiones del paso',
};

/** Meses en español; el índice es `mes - 1`. */
export const MONTH_LABELS: readonly string[] = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
