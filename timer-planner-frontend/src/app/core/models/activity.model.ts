import { PausePeriod } from './pause.model';

export enum ActivityType {
  SIMPLE = 'SIMPLE',
  COMPOSITE = 'COMPOSITE',
}

/** Estado calculado (RN-31): solo dice si sigue en curso; el resultado lo dicen las medidas. */
export enum ActivityStatus {
  OPEN = 'OPEN',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
}

export enum SubActivityStatus {
  OPEN = 'OPEN',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
}

/** Motivo de un cierre, solo informativo (RN-77). */
export enum ClosureType {
  MANUAL = 'MANUAL', // a mano, también por la cascada de un padre cerrado a mano (RN-78)
  DEADLINE = 'DEADLINE', // al día siguiente de su deadline efectivo (RN-58)
  SESSIONS_DONE = 'SESSIONS_DONE', // al hacer todas sus sesiones; se deshace si el avance baja
  CHILDREN_CLOSED = 'CHILDREN_CLOSED', // al cerrarse o borrarse su último hijo abierto
}

/** Cierre guardado de cualquier nivel (RN-77). Cerrar no cambia avance, constancia ni productividad. */
export interface ItemClosure {
  type: ClosureType;
  closedOn: string; // 'YYYY-MM-DD'
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
/** Plan de ejecución (sección 3.5). Sus fechas viven en `ExecutionSession`, enlazadas por `id`. */
export interface ExecutionPlan {
  id: string;
  type: ExecutionPlanType;
  patternDays?: WeekDay[];
  durationPerExecutionMin: number;
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
  status: ActivityStatus;
  closure?: ItemClosure; // RN-77
  pauses?: PausePeriod[]; // historial de pausas (RN-57, RN-70)
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
  closure?: ItemClosure; // RN-77
  pauses?: PausePeriod[]; // historial de pausas (RN-57, RN-70)
}
