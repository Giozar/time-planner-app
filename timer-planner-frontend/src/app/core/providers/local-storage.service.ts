import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of } from 'rxjs';
import { DataProvider } from './data.provider';
import { Goal } from '../models/goal.model';
import { Objective } from '../models/objective.model';
import { Activity, ClosureType, ItemClosure, SubActivity } from '../models/activity.model';
import { DailyRecord } from '../models/daily-record.model';
import { ExecutionSession, SessionStatus } from '../models/session.model';

/** Bloque de tiempo de la versión 3, que ya no existe: el tiempo realizado vive en la sesión (RN-71). */
interface LegacyWorkLog {
  sessionId?: string;
  minutes: number;
}

const LEGACY_WORK_LOGS_KEY = 'time_planner_work_logs';
const LEGACY_SESSIONS_DONE = 'SESSIONS_DONE';

/**
 * De la versión 3: los minutos de los bloques ligados a una sesión hecha pasan a su tiempo realizado y
 * los bloques sin sesión se descartan (RN-71). Una sesión hecha sin bloques toma su tiempo previsto.
 */
export function sessionsFromV3(sessions: readonly ExecutionSession[], logs: readonly LegacyWorkLog[]): ExecutionSession[] {
  const minutes = new Map<string, number>();
  for (const log of logs) {
    if (log.sessionId) minutes.set(log.sessionId, (minutes.get(log.sessionId) ?? 0) + log.minutes);
  }
  return sessions.map(s => s.status === SessionStatus.DONE ? { ...s, actualMinutes: minutes.get(s.id) ?? s.plannedMinutes } : s);
}

/** De la versión 3: el cierre por sesiones completas pasa a ser el cierre al completarse (RN-77). */
export function closureFromV3<T extends { closure?: ItemClosure }>(item: T): T {
  const closure = item.closure;
  return closure && (closure.type as string) === LEGACY_SESSIONS_DONE
    ? { ...item, closure: { ...closure, type: ClosureType.COMPLETED } }
    : item;
}

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService extends DataProvider {

  private readonly KEYS = {
    GOALS: 'time_planner_goals',
    OBJECTIVES: 'time_planner_objectives',
    ACTIVITIES: 'time_planner_activities',
    SUB_ACTIVITIES: 'time_planner_sub_activities',
    SESSIONS: 'time_planner_sessions',
    RECORDS: 'time_planner_records'
  };

  /** Cambia cuando el formato de los datos deja de ser compatible; los datos anteriores se descartan, salvo los de la versión 3, que se migran. */
  private readonly SCHEMA_KEY = 'time_planner_schema';
  private readonly SCHEMA_VERSION = '4'; // 4: tiempo realizado en la sesión y cierre al completarse (RN-71, RN-77)

  // Inyectamos el ID de la plataforma para saber si estamos en Server o Browser
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    super();
    if (isPlatformBrowser(this.platformId)) {
      for (const key of Object.keys(localStorage)) {
        if (/^planner(?:_v\d+)?_(?:goals|objectives|activities|sub_activities|records)$/.test(key)) {
          localStorage.removeItem(key);
        }
      }
      const schema = localStorage.getItem(this.SCHEMA_KEY);
      if (schema === '3') {
        this.migrateFromV3();
      } else if (schema !== this.SCHEMA_VERSION) {
        [...Object.values(this.KEYS), LEGACY_WORK_LOGS_KEY].forEach(key => localStorage.removeItem(key));
      }
      localStorage.setItem(this.SCHEMA_KEY, this.SCHEMA_VERSION);
    }
  }

  private migrateFromV3() {
    this.save(this.KEYS.SESSIONS, sessionsFromV3(
      this.load<ExecutionSession>(this.KEYS.SESSIONS),
      this.load<LegacyWorkLog>(LEGACY_WORK_LOGS_KEY),
    ));
    this.save(this.KEYS.ACTIVITIES, this.load<Activity>(this.KEYS.ACTIVITIES).map(a => closureFromV3(a)));
    this.save(this.KEYS.SUB_ACTIVITIES, this.load<SubActivity>(this.KEYS.SUB_ACTIVITIES).map(s => closureFromV3(s)));
    localStorage.removeItem(LEGACY_WORK_LOGS_KEY);
  }

  // --- Helpers privados protegidos con SSR ---

  private load<T>(key: string): T[] {
    // Verificamos si estamos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    }
    // Si estamos en el servidor (SSR), retornamos vacío para no romper la app
    return [];
  }

  private save<T>(key: string, data: T[]): void {
    // Solo guardamos si estamos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  // --- Implementación del Contrato ---

  // Metas
  getGoals(): Observable<Goal[]> {
    return of(this.load<Goal>(this.KEYS.GOALS));
  }

  saveGoals(goals: Goal[]): Observable<void> {
    this.save(this.KEYS.GOALS, goals);
    return of(void 0);
  }

  // Objetivos
  getObjectives(): Observable<Objective[]> {
    return of(this.load<Objective>(this.KEYS.OBJECTIVES));
  }

  saveObjectives(objectives: Objective[]): Observable<void> {
    this.save(this.KEYS.OBJECTIVES, objectives);
    return of(void 0);
  }

  // Actividades
  getActivities(): Observable<Activity[]> {
    return of(this.load<Activity>(this.KEYS.ACTIVITIES));
  }

  saveActivities(activities: Activity[]): Observable<void> {
    this.save(this.KEYS.ACTIVITIES, activities);
    return of(void 0);
  }

  // Subactividades
  getSubActivities(): Observable<SubActivity[]> {
    return of(this.load<SubActivity>(this.KEYS.SUB_ACTIVITIES));
  }

  saveSubActivities(subActivities: SubActivity[]): Observable<void> {
    this.save(this.KEYS.SUB_ACTIVITIES, subActivities);
    return of(void 0);
  }

  // Sesiones, con su tiempo realizado
  getSessions(): Observable<ExecutionSession[]> {
    return of(this.load<ExecutionSession>(this.KEYS.SESSIONS));
  }

  saveSessions(sessions: ExecutionSession[]): Observable<void> {
    this.save(this.KEYS.SESSIONS, sessions);
    return of(void 0);
  }

  // Registros Historicos
  getRecords(): Observable<DailyRecord[]> {
    return of(this.load<DailyRecord>(this.KEYS.RECORDS));
  }

  saveRecords(records: DailyRecord[]): Observable<void> {
    this.save(this.KEYS.RECORDS, records);
    return of(void 0);
  }
}
