export type ActivityLevel = 'urgente_directo' | 'urgente_sistemico' | 'progreso' | 'sistema' | 'creativa';
export type ActivityType = 'simple' | 'compuesta';
export type ActivityStatus = 'pendiente' | 'en_progreso' | 'completada' | 'pausada';
export type SubActivityStatus = 'pendiente' | 'en_progreso' | 'completada';

export interface Activity {
  id: string;
  goalId: string;
  title: string;
  level: ActivityLevel;
  type: ActivityType;
  deadline: string; 
  totalTimeRequiredMin?: number; 
  allowedDays: string;
  status: ActivityStatus;
}

export interface SubActivity {
  id: string;
  activityId: string;
  title: string;
  estimatedDurationMin: number;
  scheduledDate?: string;
  status: SubActivityStatus;
}