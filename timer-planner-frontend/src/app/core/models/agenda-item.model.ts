import { TaskSourceType } from './activity.model';

/** Ítem de la agenda de una fecha: una tarea simple o un paso con sesión programada ese día. */
export interface AgendaItem {
  sessionId: string; // un ítem puede tener dos sesiones el mismo día si una se movió (RN-82)
  canMove: boolean; // PLANNED de hoy o futura de un ítem abierto (RN-82)
  deadline: string; // deadline efectivo del ítem: tope para moverla (RN-48)
  id: string;
  title: string;
  estimatedDurationMin: number;
  isCompleted: boolean;
  executedMinutes: number; // minutos reales si está completado (RN-71); si no, 0
  sourceType: TaskSourceType;
  parentId: string | null; // tarea padre cuando es un paso
}
