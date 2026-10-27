import type { HierarchyLevel } from './hierarchy.model';

/** Nivel de las métricas: los cuatro de la jerarquía y la sesión (RN-86). */
export type MetricsLevel = HierarchyLevel | 'session';

/** Métricas de un nivel (RN-86). Constancia y productividad son promedios entre los elementos con dato; `null` si ninguno. */
export interface LevelMetrics {
  total: number;
  complete: number;
  incomplete: number;
  closed: number;
  overdue: number;
  consistency: number | null;
  productivity: number | null;
}
