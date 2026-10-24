import { PausePeriod } from './pause.model';

export enum GoalHorizon {
  SHORT_TERM = 'SHORT_TERM',
  MEDIUM_TERM = 'MEDIUM_TERM',
  LONG_TERM = 'LONG_TERM',
}

export enum GoalStatus {
  IDEA = 'IDEA',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
}

/**
 * Representa una META (o una IDEA si no tiene horizonte, RN-55).
 * La meta no tiene fecha límite: solo se clasifica por horizonte (RN-56).
 */
export interface Goal {
  id: string;
  title: string;
  horizon: GoalHorizon | null; // null mientras sea IDEA
  progress: number;
  status: GoalStatus;
  pauses?: PausePeriod[]; // historial de pausas (RN-70)
  createdAt: Date;
}
