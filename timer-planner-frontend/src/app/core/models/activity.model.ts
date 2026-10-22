export enum ActivityType {
  SIMPLE = 'SIMPLE',
  COMPOSITE = 'COMPOSITE',
}

export enum ActivityStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  OVERDUE = 'OVERDUE', // Solo derivado, nunca se almacena (RN-58)
}

export enum SubActivityStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum ActivityPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum ActivityCriticality {
  VITAL = 'VITAL',
  ESSENTIAL_RECURRING = 'ESSENTIAL_RECURRING',
  FLEXIBLE = 'FLEXIBLE',
}

export enum ActivityComplexity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum ActivityRecurrence {
  SINGLE = 'SINGLE',
  WEEKLY_PATTERN = 'WEEKLY_PATTERN',
  SPECIFIC_DATES = 'SPECIFIC_DATES',
}

export enum ExecutionPlanType {
  WEEKLY_PATTERN = 'WEEKLY_PATTERN',
  SPECIFIC_DATES = 'SPECIFIC_DATES',
}

export enum WeekDay {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

/** Origen de un ítem de la agenda diaria. */
export enum TaskSourceType {
  ACTIVITY = 'ACTIVITY',
  SUBACTIVITY = 'SUBACTIVITY',
}

/** Días de la semana en el orden en que se muestran (lunes primero). */
export const WEEK_DAYS_ORDER: readonly WeekDay[] = [
  WeekDay.MONDAY,
  WeekDay.TUESDAY,
  WeekDay.WEDNESDAY,
  WeekDay.THURSDAY,
  WeekDay.FRIDAY,
  WeekDay.SATURDAY,
  WeekDay.SUNDAY,
];

// Contrato de Ejecución
export interface ExecutionPlan {
  type: ExecutionPlanType;
  dates?: string[]; // 'YYYY-MM-DD'
  patternDays?: WeekDay[];
  durationPerExecutionMin: number;
  completedDates: string[]; // 'YYYY-MM-DD'
}

/**
 * Representa una TAREA.
 */
export interface Activity {
  id: string;
  objectiveId: string;
  title: string;
  type: ActivityType;
  priority: ActivityPriority;
  criticality: ActivityCriticality;
  complexity: ActivityComplexity;
  recurrence: ActivityRecurrence | null; // null en compuestas (RN-47)
  deadline?: string; // 'YYYY-MM-DD'; si falta hereda el del objetivo (RN-14, RN-48)

  // Solo SIMPLE tiene plan propio; null en compuestas
  executionPlan: ExecutionPlan | null;

  totalTimeRequiredMin?: number;
  progress: number;
  status: ActivityStatus; // Nunca OVERDUE almacenado
}

/**
 * Representa un PASO de una tarea compuesta.
 */
export interface SubActivity {
  id: string;
  activityId: string;
  title: string;
  deadline?: string; // 'YYYY-MM-DD'; si falta hereda el efectivo de su tarea (RN-48)
  complexity: ActivityComplexity;
  status: SubActivityStatus;

  // SIEMPRE tiene plan (es la unidad ejecutable de la compuesta)
  executionPlan: ExecutionPlan;
  progress: number;
}
