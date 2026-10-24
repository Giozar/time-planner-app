import { ItemClosure } from './activity.model';
import { PausePeriod } from './pause.model';

export enum ObjectiveNature {
  PERSONAL = 'PERSONAL',
  PROFESSIONAL = 'PROFESSIONAL',
  HEALTH = 'HEALTH',
  FINANCE = 'FINANCE',
  LEARNING = 'LEARNING',
  HABIT = 'HABIT',
  WELLBEING = 'WELLBEING',
  OTHER = 'OTHER',
}

/** Estado calculado (RN-31). */
export enum ObjectiveStatus {
  OPEN = 'OPEN',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
}

/**
 * Representa un OBJETIVO. Cuelga de una Goal (Meta).
 */
export interface Objective {
  id: string;
  goalId: string;
  title: string;
  nature: ObjectiveNature;
  progress: number;
  status: ObjectiveStatus;
  deadline: string; // 'YYYY-MM-DD'; obligatorio, tope de sus tareas y pasos (RN-65)
  closure?: ItemClosure; // RN-77
  pauses?: PausePeriod[]; // historial de pausas (RN-57, RN-70)
  createdAt: Date;
}
