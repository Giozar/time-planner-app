export interface DailyRecord {
  id: string;
  date: string;
  plannedSessions: number;
  completedSessions: number;
  /** Realizadas / planeadas; `null` si el día no tuvo sesiones (RN-72). */
  adherencePercentage: number | null;
  plannedMinutes: number;
  actualMinutes: number;
  notes?: string;
  /** Momento del cierre más reciente (ISO). */
  closedAt: string;
}
