import { ItemClosure } from './activity.model';
import { PausePeriod } from './pause.model';

export enum GoalHorizon {
  SHORT_TERM = 'SHORT_TERM',
  MEDIUM_TERM = 'MEDIUM_TERM',
  LONG_TERM = 'LONG_TERM',
}

/** `IDEA` hasta su promoción (RN-55); después, el estado calculado de RN-31. */
export enum GoalStatus {
  IDEA = 'IDEA',
  OPEN = 'OPEN',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
}

/**
 * Representa una META (o una IDEA si no tiene horizonte, RN-55).
 * Con horizonte tiene fecha límite, tope de sus objetivos (RN-56).
 */
export interface Goal {
  id: string;
  title: string;
  horizon: GoalHorizon | null; // null mientras sea IDEA
  deadline?: string; // 'YYYY-MM-DD'; obligatorio con horizonte; la idea no tiene (RN-56)
  progress: number;
  status: GoalStatus;
  closure?: ItemClosure; // RN-77
  pauses?: PausePeriod[]; // historial de pausas (RN-57)
  createdAt: Date;
}
