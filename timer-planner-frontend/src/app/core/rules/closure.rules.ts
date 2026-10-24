import { ClosureType, ItemClosure } from '../models/activity.model';
import { PausePeriod } from '../models/pause.model';
import { ExecutionSession, SessionStatus } from '../models/session.model';
import { addDays } from './calendar.rules';

/** Valores de estado comunes a meta, objetivo, tarea y paso (RN-31). */
interface StatusValues<S> {
  OPEN: S;
  PAUSED: S;
  CLOSED: S;
}

/** Cerrado: tiene estado `CLOSED` (RN-31). Vale para los cuatro niveles. */
export function isClosed(item: { status: string }): boolean {
  return item.status === 'CLOSED';
}

/** `true` si tiene una pausa abierta (sin `to`). */
export function hasOpenPause(pauses: readonly PausePeriod[] | undefined): boolean {
  return (pauses ?? []).some(p => p.to === undefined);
}

/** Pausa efectiva (RN-57): el elemento o alguno de sus padres tiene una pausa abierta. */
export function isEffectivelyPaused(chain: readonly (readonly PausePeriod[] | undefined)[]): boolean {
  return chain.some(hasOpenPause);
}

/**
 * Estado de cualquier nivel (RN-31): `CLOSED` si tiene cierre guardado, `PAUSED` si está en pausa efectiva,
 * y si no `OPEN`. `values` es el enum del nivel (`ActivityStatus`, `GoalStatus`…). La idea la resuelve quien llama.
 */
export function deriveStatus<S>(closure: ItemClosure | undefined, paused: boolean, values: StatusValues<S>): S {
  if (closure) return values.CLOSED;
  return paused ? values.PAUSED : values.OPEN;
}

/**
 * Cierre por fecha límite (RN-58, RN-77): un elemento abierto o pausado se cierra al día siguiente
 * de su deadline efectivo. Lo ya cerrado conserva su cierre.
 */
export function deadlineClosure(closure: ItemClosure | undefined, deadline: string, today: string): ItemClosure | undefined {
  if (closure || deadline >= today) return closure;
  return { type: ClosureType.DEADLINE, closedOn: addDays(deadline, 1) };
}

/**
 * Cierre por sesiones completas tras un cambio de avance (RN-77). Solo se evalúa en el evento que lo causa:
 * pasar de menos de 100 % a 100 % cierra lo abierto; bajar de 100 % deshace un cierre por sesiones completas.
 * Los cierres a mano, por fecha límite y por hijos cerrados no cambian.
 */
export function sessionsDoneClosure(
  closure: ItemClosure | undefined,
  previousProgress: number,
  progress: number,
  today: string,
): ItemClosure | undefined {
  if (!closure && previousProgress < 100 && progress >= 100) return { type: ClosureType.SESSIONS_DONE, closedOn: today };
  if (closure?.type === ClosureType.SESSIONS_DONE && progress < 100) return undefined;
  return closure;
}

/**
 * Un descendiente cerrado se reabre con su padre si su deadline efectivo no ha pasado
 * y le quedan sesiones pendientes (avance menor a 100 %) (RN-64).
 */
export function reopensWithParent(effectiveDeadline: string, progress: number, today: string): boolean {
  return effectiveDeadline >= today && progress < 100;
}

/**
 * Sesión oculta por el cierre de su ítem (RN-79): no realizada y desde el día del cierre, incluido.
 * No aparece en agenda ni calendario, no se marca y no cuenta para la constancia ni para el cierre del día.
 */
export function isHiddenByClosure(session: ExecutionSession, closure: ItemClosure | undefined): boolean {
  return !!closure && session.status !== SessionStatus.DONE && session.scheduledDate >= closure.closedOn;
}
