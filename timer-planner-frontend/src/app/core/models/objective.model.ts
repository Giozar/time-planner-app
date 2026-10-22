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

export enum ObjectiveStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
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
  createdAt: Date;
}
