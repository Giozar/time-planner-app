/** Nivel de la jerarquía meta → objetivo → tarea → paso, para las acciones comunes a los cuatro (RN-57, RN-64, RN-77). */
export type HierarchyLevel = 'goal' | 'objective' | 'activity' | 'step';

/**
 * Resultado de reabrir (RN-64): `needs_deadline` si su deadline efectivo ya pasó y falta uno nuevo;
 * `parent_expired` si el de su padre también pasó; `invalid_deadline` si el nuevo es anterior a hoy o supera el del padre.
 */
export type ReopenResult = 'ok' | 'not_closed' | 'needs_deadline' | 'parent_expired' | 'invalid_deadline';
