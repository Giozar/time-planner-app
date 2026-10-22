export enum DeletableType {
  GOAL = 'GOAL',
  OBJECTIVE = 'OBJECTIVE',
  ACTIVITY = 'ACTIVITY',
  STEP = 'STEP',
}

/** Qué se llevaría por delante un borrado en cascada (RN-62). No incluye al propio elemento. */
export interface DeletionImpact {
  title: string;
  objectives: number;
  activities: number;
  steps: number;
  /** Elementos completados entre los que se borrarían (incluido el propio elemento). */
  completed: number;
}

/** Datos que se perderían al cambiar el tipo de una tarea (RN-39, RN-40). */
export interface TypeChangeImpact {
  stepsToDelete: number;
  sessionsToLose: number;
  completedSessionsToLose: number;
  /** `true` solo si hay datos que perder; si no, no hace falta confirmar. */
  needsConfirmation: boolean;
}
