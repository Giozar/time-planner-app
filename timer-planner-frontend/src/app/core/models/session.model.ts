export enum SessionStatus {
  PLANNED = 'PLANNED',
  DONE = 'DONE',
}

/** Estado calculado de una sesión (RN-69); no se guarda. */
export enum SessionState {
  OPEN = 'OPEN',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED',
}

/** Sesión de un plan de ejecución (sección 3.6). Una `PLANNED` pasada es no realizada (RN-69). */
export interface ExecutionSession {
  id: string;
  planId: string;
  scheduledDate: string; // 'YYYY-MM-DD'; el plan genera una por fecha, una movida puede compartir día (RN-82)
  rescheduledFrom?: string; // 'YYYY-MM-DD' generada por el plan, si la sesión se movió (RN-82)
  manual?: boolean; // agregada a mano, fuera del plan; se conserva al editarlo (RN-83, RN-51)
  plannedMinutes: number;
  status: SessionStatus;
  actualMinutes?: number; // tiempo realizado, entero positivo; solo cuando está DONE (RN-71)
  notes?: string; // nota de la sesión; se conserva al desmarcarla (RN-27)
  completedAt?: string; // ISO; solo cuando está DONE
}
