export type ActivityLevel = 'urgente_directo' | 'urgente_sistemico' | 'progreso' | 'sistema' | 'creativa';
export type ActivityType = 'simple' | 'compuesta';
export type ActivityStatus = 'pendiente' | 'en_progreso' | 'completada' | 'pausada';
export type SubActivityStatus = 'pendiente' | 'en_progreso' | 'completada';

export const ACTIVITY_LEVEL_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: 'urgente_directo', label: 'Urgente Directo' },
  { value: 'urgente_sistemico', label: 'Urgente Sistémico' },
  { value: 'progreso', label: 'Progreso' },
  { value: 'sistema', label: 'Sistema' },
  { value: 'creativa', label: 'Creativa' },
];

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

// --- NUEVOS TIPOS PARA EJECUCIÓN ---
export type ExecutionPlanType = 'fechas_especificas' | 'patron_repetitivo';
export type WeekDay = 'L' | 'M' | 'X' | 'J' | 'V' | 'S' | 'D';

export const EXECUTION_PLAN_TYPE_OPTIONS: { value: ExecutionPlanType; label: string }[] = [
  { value: 'patron_repetitivo', label: 'Patrón Repetitivo (Días fijos hasta deadline)' },
  { value: 'fechas_especificas', label: 'Fechas Específicas (Días sueltos)' },
];

// Contrato de Ejecución (Lo que define cuándo y cuánto se trabaja)
export interface ExecutionPlan {
  type: ExecutionPlanType;
  
  // Opción A: Lista manual de fechas (ISO 'YYYY-MM-DD')
  dates?: string[]; 

  // Opción B: Patrón (Días de la semana)
  patternDays?: WeekDay[]; 
  
  // Datos de tiempo
  durationPerExecutionMin: number;
  
  // ESTADO: Lista de fechas (ISO) que ya se marcaron como completadas
  completedDates: string[]; 
}

export interface Activity {
  id: string;
  goalId: string;
  title: string;
  level: ActivityLevel;
  type: ActivityType;
  deadline: string; // 'YYYY-MM-DD'

  // Si es SIMPLE: Tiene plan propio
  // Si es COMPUESTA: Es undefined (depende de sus hijos)
  executionPlan?: ExecutionPlan; 

  // Si es COMPUESTA: Suma de sus hijos
  totalTimeRequiredMin?: number;

  progress: number; // Calculado matemáticamente (0-100)
  status: ActivityStatus;
}

export interface SubActivity {
  id: string;
  activityId: string;
  title: string;
  deadline: string; // 'YYYY-MM-DD'

  // SIEMPRE tiene plan (es la unidad ejecutable de la compuesta)
  executionPlan: ExecutionPlan;

  progress: number;
  status: SubActivityStatus;
}