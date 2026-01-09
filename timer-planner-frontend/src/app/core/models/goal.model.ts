export type GoalType = 'trabajo' | 'sistema_vital' | 'progreso' | 'creativa';
export type GoalHorizon = 'corto' | 'mediano' | 'largo';
export type GoalStatus = 'activa' | 'pausada' | 'archivada';

export const GOAL_TYPE_OPTIONS: { value: GoalType; label: string }[] = [
  { value: 'trabajo', label: 'Trabajo' },
  { value: 'sistema_vital', label: 'Sistema Vital' },
  { value: 'progreso', label: 'Progreso' },
  { value: 'creativa', label: 'Creativa' },
];

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

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  horizon: GoalHorizon;
  progress: number;
  status: GoalStatus;
  createdAt: Date;
}