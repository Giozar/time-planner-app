export type ActivityLevel = 'urgente_directo' | 'urgente_sistemico' | 'progreso' | 'sistema' | 'creativa';
export type ActivityType = 'simple' | 'compuesta';
export type ActivityStatus = 'pendiente' | 'en_progreso' | 'completada' | 'pausada';
export type SubActivityStatus = 'pendiente' | 'en_progreso' | 'completada';

// --- NUEVOS TIPOS PARA EJECUCIÓN ---
export type ExecutionPlanType = 'fechas_especificas' | 'patron_repetitivo';
export type WeekDay = 'L' | 'M' | 'X' | 'J' | 'V' | 'S' | 'D';

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