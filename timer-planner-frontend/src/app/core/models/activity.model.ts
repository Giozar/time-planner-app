export type ActivityType = 'simple' | 'compuesta';
export type ActivityStatus = 'pendiente' | 'en_progreso' | 'completada' | 'pausada';
export type ActivityPriority = 'alta' | 'media' | 'baja';
export type ActivityCriticality = 'vital' | 'esencial_recurrente' | 'flexible';
export type ActivityComplexity = 'baja' | 'media' | 'alta';
export type ActivityRecurrence = 'unica' | 'patron_semanal' | 'fechas_especificas';
export type SubActivityStatus = 'pendiente' | 'en_progreso' | 'completada';

export const ACTIVITY_TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'simple', label: 'Simple (Se ejecuta directo)' },
  { value: 'compuesta', label: 'Compuesta (Requiere pasos)' },
];

export const ACTIVITY_STATUS_OPTIONS: { value: ActivityStatus; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'completada', label: 'Completada' },
  { value: 'pausada', label: 'Pausada' },
];

export const ACTIVITY_PRIORITY_OPTIONS: { value: ActivityPriority; label: string }[] = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
];

export const ACTIVITY_CRITICALITY_OPTIONS: { value: ActivityCriticality; label: string }[] = [
  { value: 'vital', label: 'Vital' },
  { value: 'esencial_recurrente', label: 'Esencial Recurrente' },
  { value: 'flexible', label: 'Flexible' },
];

export const ACTIVITY_COMPLEXITY_OPTIONS: { value: ActivityComplexity; label: string }[] = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
];

export const ACTIVITY_RECURRENCE_OPTIONS: { value: ActivityRecurrence; label: string }[] = [
  { value: 'unica', label: 'Única' },
  { value: 'patron_semanal', label: 'Patrón Semanal' },
  { value: 'fechas_especificas', label: 'Fechas Específicas' },
];

export const SUBACTIVITY_STATUS_OPTIONS: { value: SubActivityStatus; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'completada', label: 'Completada' },
];

export const WEEK_DAYS: { label: string; value: WeekDay }[] = [
  { label: 'Lun', value: 'L' },
  { label: 'Mar', value: 'M' },
  { label: 'Mié', value: 'X' },
  { label: 'Jue', value: 'J' },
  { label: 'Vie', value: 'V' },
  { label: 'Sáb', value: 'S' },
  { label: 'Dom', value: 'D' },
];

// --- TIPOS PARA EJECUCIÓN ---
export type ExecutionPlanType = 'fechas_especificas' | 'patron_repetitivo';
export type WeekDay = 'L' | 'M' | 'X' | 'J' | 'V' | 'S' | 'D';

export const EXECUTION_PLAN_TYPE_OPTIONS: { value: ExecutionPlanType; label: string }[] = [
  { value: 'patron_repetitivo', label: 'Patrón Repetitivo (Días fijos hasta deadline)' },
  { value: 'fechas_especificas', label: 'Fechas Específicas (Días sueltos)' },
];

// Contrato de Ejecución
export interface ExecutionPlan {
  type: ExecutionPlanType;
  dates?: string[]; // ISO 'YYYY-MM-DD'
  patternDays?: WeekDay[]; 
  durationPerExecutionMin: number;
  completedDates: string[]; // ISO
}

/**
 * Representa una TAREA en el sistema V2.
 */
export interface Activity {
  id: string;
  objectiveId: string; // V2: Cuelga de Objetivo
  title: string;
  type: ActivityType;
  priority: ActivityPriority;
  criticality: ActivityCriticality;
  complexity: ActivityComplexity;
  recurrence: ActivityRecurrence;
  deadline: string; // 'YYYY-MM-DD'

  // Si es SIMPLE: Tiene plan propio
  executionPlan?: ExecutionPlan; 

  totalTimeRequiredMin?: number;
  progress: number; 
  status: ActivityStatus;
}

/**
 * Representa un PASO en el sistema V2.
 */
export interface SubActivity {
  id: string;
  activityId: string;
  title: string;
  deadline: string; // 'YYYY-MM-DD'
  complexity: ActivityComplexity;
  status: SubActivityStatus;

  // SIEMPRE tiene plan (es la unidad ejecutable de la compuesta)
  executionPlan: ExecutionPlan;
  progress: number;
}