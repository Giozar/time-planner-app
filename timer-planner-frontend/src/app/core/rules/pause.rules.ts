import { PausePeriod } from '../models/pause.model';
import { addDays } from './calendar.rules';

/** Abre una pausa desde `today` (RN-57). No hace nada si ya hay una abierta. */
export function startPause(pauses: readonly PausePeriod[] | undefined, today: string): PausePeriod[] {
  const current = pauses ?? [];
  return current.some(p => p.to === undefined) ? [...current] : [...current, { from: today }];
}

/**
 * Cierra la pausa abierta el día anterior a `today`: el día en que se reanuda ya cuenta (RN-57).
 * Si se pausó y reanudó el mismo día, el periodo queda vacío y se descarta.
 */
export function endPause(pauses: readonly PausePeriod[] | undefined, today: string): PausePeriod[] {
  const yesterday = addDays(today, -1);
  return (pauses ?? [])
    .map(p => p.to === undefined ? { ...p, to: yesterday } : p)
    .filter(p => p.to === undefined || p.to >= p.from);
}
