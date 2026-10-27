export enum SessionStatus {
  PLANNED = 'PLANNED',
  DONE = 'DONE',
}

/** Sesión de un plan de ejecución (sección 3.6). Una `PLANNED` pasada es no realizada (RN-69). */
export interface ExecutionSession {
  id: string;
  planId: string;
  scheduledDate: string; // 'YYYY-MM-DD'; el plan genera una por fecha, una movida puede compartir día (RN-82)
  rescheduledFrom?: string; // 'YYYY-MM-DD' generada por el plan, si la sesión se movió (RN-82)
  plannedMinutes: number;
  status: SessionStatus;
  actualMinutes?: number; // tiempo realizado, entero positivo; solo cuando está DONE (RN-71)
  completedAt?: string; // ISO; solo cuando está DONE
}
