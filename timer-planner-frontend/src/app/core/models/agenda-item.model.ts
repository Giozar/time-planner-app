import { TaskSourceType } from './activity.model';

/** Ítem de la agenda de hoy: una tarea simple o un paso con sesión programada hoy. */
export interface AgendaItem {
  id: string;
  title: string;
  estimatedDurationMin: number;
  isCompleted: boolean;
  sourceType: TaskSourceType;
  parentId: string | null; // tarea padre cuando es un paso
}
