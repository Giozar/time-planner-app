export interface DailyRecord {
  id: string;
  date: string;
  /** Sesiones visibles de la agenda de esa fecha al cerrarla (RN-72). */
  sessionIds: string[];
  plannedSessions: number;
  completedSessions: number;
  /** Constancia del día: realizadas / planeadas; `null` si el día no tuvo sesiones (RN-72). */
  adherencePercentage: number | null;
  plannedMinutes: number;
  actualMinutes: number;
  /** Nota del día. */
  notes?: string;
  /** Momento del cierre más reciente (ISO). */
  closedAt: string;
}
