import { TaskSourceType } from './activity.model';

export enum SessionStatus {
  PLANNED = 'PLANNED',
  DONE = 'DONE',
}

/** Fecha programada de un plan de ejecución (§3.6). Una `PLANNED` pasada es no realizada (RN-69). */
export interface ExecutionSession {
  id: string;
  planId: string;
  scheduledDate: string; // 'YYYY-MM-DD'; el plan genera una por fecha, una movida puede compartir día (RN-82)
  rescheduledFrom?: string; // 'YYYY-MM-DD' generada por el plan, si la sesión se movió (RN-82)
  plannedMinutes: number;
  status: SessionStatus;
  completedAt?: string; // ISO; solo cuando está DONE
}

/** Bloque de tiempo realmente trabajado en una tarea simple o paso (§3.7, RN-71). */
export interface WorkLog {
  id: string;
  sourceType: TaskSourceType;
  sourceId: string;
  date: string; // 'YYYY-MM-DD'; hoy o pasada
  minutes: number; // entero positivo
  sessionId?: string; // solo si la sesión está DONE, del mismo ítem y fecha
}
