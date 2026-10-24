import { TaskSourceType } from './activity.model';

/** Sesión programada de un día, con su jerarquía completa para mostrarla en el calendario (RN-66). */
export interface CalendarEntry {
  sessionId: string; // un ítem puede tener dos sesiones el mismo día si una se movió (RN-82)
  date: string; // 'YYYY-MM-DD'
  id: string; // de la tarea simple o del paso
  sourceType: TaskSourceType;
  title: string; // de la tarea simple o del paso
  isCompleted: boolean;
  durationMin: number;
  goalTitle: string;
  objectiveTitle: string;
  objectiveDeadline: string;
  activityTitle: string; // igual a `title` cuando la sesión es de una tarea simple
  /** Deadline efectivo de la tarea simple o del paso (RN-48). */
  effectiveDeadline: string;
}
