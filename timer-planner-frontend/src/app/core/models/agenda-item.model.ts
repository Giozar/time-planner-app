import { TaskSourceType } from './activity.model';

/** Ítem de la agenda de una fecha: una tarea simple o un paso con sesión programada ese día. */
export interface AgendaItem {
  id: string;
  title: string;
  estimatedDurationMin: number;
  isCompleted: boolean;
  isCovered: boolean; // posterior a un cierre manual: se muestra completa y no se marca (RN-79)
  executedMinutes: number; // minutos reales si está completado (RN-71); si no, 0
  sourceType: TaskSourceType;
  parentId: string | null; // tarea padre cuando es un paso
}
