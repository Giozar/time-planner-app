import { TaskSourceType } from './activity.model';

/** Ítem de la agenda de una fecha: una tarea simple o un paso con sesión programada ese día. */
export interface AgendaItem {
  sessionId: string; // un ítem puede tener dos sesiones el mismo día si una se movió (RN-82)
  canEdit: boolean; // su tarea simple o paso no está cerrado: la sesión se edita o se borra (RN-82, RN-83)
  deadline: string; // deadline efectivo del ítem: tope de la fecha al editarla (RN-48)
  id: string;
  title: string;
  estimatedDurationMin: number;
  isCompleted: boolean;
  executedMinutes: number; // tiempo realizado si está hecha (RN-71); si no, 0
  sourceType: TaskSourceType;
  parentId: string | null; // tarea padre cuando es un paso
}
