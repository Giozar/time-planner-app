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
 */
export interface Goal {
  id: string;
  title: string;
  horizon: GoalHorizon | null; // null mientras sea IDEA
  targetDate?: string; // 'YYYY-MM-DD'
  progress: number;
  status: GoalStatus;
  createdAt: Date;
}
