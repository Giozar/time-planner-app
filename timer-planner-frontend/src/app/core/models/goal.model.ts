export type GoalType = 'trabajo' | 'sistema_vital' | 'progreso' | 'creativa';
export type GoalHorizon = 'corto' | 'mediano' | 'largo';
export type GoalStatus = 'activa' | 'pausada' | 'archivada';

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  horizon: GoalHorizon;
  progress: number;
  status: GoalStatus;
  createdAt: Date;
}