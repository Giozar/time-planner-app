import { LevelMetrics } from '../models/metrics.model';
import { isComplete } from './progress.rules';

/** Lo que cuenta de un elemento para las métricas de su nivel (RN-86). */
export interface MetricInput {
  progress: number;
  closed: boolean;
  overdue: boolean;
  consistency: number | null;
  productivity: number | null;
}

/** Promedio redondeado de los valores con dato; `null` si ninguno tiene. */
function average(values: readonly (number | null)[]): number | null {
  const known = values.filter((v): v is number => v !== null);
  return known.length === 0 ? null : Math.round(known.reduce((sum, v) => sum + v, 0) / known.length);
}

/**
 * Métricas de un nivel (RN-86): cuántos están completos (avance 100 %, RN-84), incompletos, cerrados y vencidos (RN-85),
 * y el promedio de su constancia y de su productividad entre los que tienen dato.
 */
export function computeLevelMetrics(items: readonly MetricInput[]): LevelMetrics {
  const complete = items.filter(i => isComplete(i.progress)).length;
  return {
    total: items.length,
    complete,
    incomplete: items.length - complete,
    closed: items.filter(i => i.closed).length,
    overdue: items.filter(i => i.overdue).length,
    consistency: average(items.map(i => i.consistency)),
    productivity: average(items.map(i => i.productivity)),
  };
}
