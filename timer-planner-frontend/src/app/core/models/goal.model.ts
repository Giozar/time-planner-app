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
 * La meta no tiene fecha límite: solo se clasifica por horizonte (RN-56).
 */
export interface Goal {
  id: string;
  title: string;
  horizon: GoalHorizon | null; // null mientras sea IDEA
  progress: number;
  status: GoalStatus;
  closure?: ItemClosure; // RN-77
  pauses?: PausePeriod[]; // historial de pausas (RN-57)
  createdAt: Date;
}
