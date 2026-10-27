import { TaskSourceType } from './activity.model';
import { SessionState } from './session.model';

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
  notes?: string; // nota de la sesión
  state: SessionState; // abierta, pausada o cerrada (RN-69)
  progress: number; // avance de la sesión: completa solo al 100 % (RN-69, RN-84)
  overdue: boolean; // su fecha pasó y no se hizo (RN-85)
  sourceType: TaskSourceType;
  parentId: string | null; // tarea padre cuando es un paso
}
