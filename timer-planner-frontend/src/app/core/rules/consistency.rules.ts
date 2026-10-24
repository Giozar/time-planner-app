import { PausePeriod } from '../models/pause.model';
import { ExecutionSession, SessionStatus } from '../models/session.model';
import { addDays } from './calendar.rules';

/** Sesión junto con las pausas de su meta y de su tarea. */
export interface ConsistencyEntry {
  session: ExecutionSession;
  pauses: readonly PausePeriod[];
}

/** `true` si `date` cae dentro de algún periodo de pausa; un periodo abierto sigue hasta hoy y después. */
export function isPausedOn(pauses: readonly PausePeriod[], date: string): boolean {
  return pauses.some(p => date >= p.from && (p.to === undefined || date <= p.to));
}

/** Abre una pausa desde `today`. No hace nada si ya hay una abierta. */
export function startPause(pauses: readonly PausePeriod[] | undefined, today: string): PausePeriod[] {
  const current = pauses ?? [];
  return current.some(p => p.to === undefined) ? [...current] : [...current, { from: today }];
}

/**
 * Cierra la pausa abierta el día anterior a `today`: el día en que se reanuda ya cuenta.
 * Si se pausó y reanudó el mismo día, el periodo queda vacío y se descarta.
 */
export function endPause(pauses: readonly PausePeriod[] | undefined, today: string): PausePeriod[] {
  const yesterday = addDays(today, -1);
  return (pauses ?? [])
    .map(p => p.to === undefined ? { ...p, to: yesterday } : p)
    .filter(p => p.to === undefined || p.to >= p.from);
}

/**
 * Constancia (RN-70): `round(DONE / (DONE + no realizadas) × 100)` sobre las sesiones exigibles; `null` si no hay ninguna.
 * - Cuenta las `DONE` hasta hoy y las `PLANNED` de fechas pasadas; la `PLANNED` de hoy solo si el día está cerrado.
 * - No cuenta las sesiones futuras ni las `PLANNED` de fechas con la meta o la tarea pausada.
 */
export function computeConsistency(
  entries: readonly ConsistencyEntry[],
  today: string,
  todayClosed: boolean,
): number | null {
  let done = 0;
  let due = 0;

  for (const { session, pauses } of entries) {
    const date = session.scheduledDate;
    if (date > today) continue;

    if (session.status === SessionStatus.DONE) {
      done++;
      due++;
    } else if (!isPausedOn(pauses, date) && (date < today || todayClosed)) {
      due++;
    }
  }

  return due === 0 ? null : Math.round((done / due) * 100);
}
