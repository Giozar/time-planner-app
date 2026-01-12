export type GoalHorizon = 'corto' | 'mediano' | 'largo';
export type GoalStatus = 'activa' | 'pausada' | 'archivada';

export const GOAL_HORIZON_OPTIONS: { value: GoalHorizon; label: string }[] = [
  { value: 'corto', label: 'Corto Plazo' },
  { value: 'mediano', label: 'Mediano Plazo' },
  { value: 'largo', label: 'Largo Plazo' },
];

export const GOAL_STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: 'activa', label: 'Activa' },
  { value: 'pausada', label: 'Pausada' },
  { value: 'archivada', label: 'Archivada' },
];

/**
 * Representa una META en el sistema V2.
 */
export interface Goal {
  id: string;
  title: string;
  horizon: GoalHorizon;
  progress: number;
  status: GoalStatus;
  createdAt: Date;
  
  // Legacy / Compatibility
  type?: string; 
}